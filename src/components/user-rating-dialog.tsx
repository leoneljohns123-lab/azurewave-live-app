'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { UserAvatar } from './user-avatar';
import { User, UserRating, EarnedBadge } from '@/lib/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as faStarSolid, faPaperPlane, faTimes } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, getDocs, query, orderBy, deleteDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { getNewBadges } from '@/lib/badge-helpers';

const StarDisplay = ({ rating, className }: { rating: number, className?: string }) => {
  return (
    <div className={cn("flex text-yellow-400", className)} style={{ filter: 'drop-shadow(0 0 5px rgba(250, 204, 21, 0.7))' }}>
      {[...Array(5)].map((_, i) => (
        <FontAwesomeIcon key={i} icon={i < rating ? faStarSolid : faStarRegular} />
      ))}
    </div>
  );
};

const RatingItem = ({ rating, onDelete }: { rating: UserRating, onDelete: (ratingId: string) => void }) => {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const raterRef = useMemoFirebase(() => rating ? doc(firestore, 'users', rating.raterId) : null, [firestore, rating]);
  const { data: rater, isLoading } = useDoc<User>(raterRef);

  const canDelete = currentUser?.uid === rating.raterId;

  if (isLoading || !rater) {
    return (
      <div className="bg-black/20 rounded-lg p-4">
        <p>Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-black/20 rounded-lg p-4 relative group">
      {canDelete && (
        <Button 
            size="icon" 
            variant="ghost" 
            className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100"
            onClick={() => onDelete(rating.id)}
        >
            <FontAwesomeIcon icon={faTimes} />
        </Button>
      )}
      <div className="flex items-center gap-3">
        <UserAvatar user={rater} className="w-10 h-10" />
        <div>
          <p className="font-semibold text-white">{rater.displayName}</p>
          <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}</p>
        </div>
        <div className="ml-auto">
          <StarDisplay rating={rating.rating} />
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-300">{rating.comment}</p>
    </div>
  );
};


interface UserRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function UserRatingDialog({ open, onOpenChange, user }: UserRatingDialogProps) {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const currentUserProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, 'users', currentUser.uid) : null, [currentUser, firestore]);
  const { data: currentUserProfile } = useDoc<User>(currentUserProfileRef);

  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ratingsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'users', user.id, 'ratings'), orderBy('createdAt', 'desc'));
  }, [firestore, user.id]);

  const { data: ratings, isLoading } = useCollection<UserRating>(ratingsQuery);

  const averageRating = user.averageRating ? user.averageRating.toFixed(1) : 'N/A';
  
  const isSelf = currentUser?.uid === user.id;

  const recalculateAverageAndCount = async (ratedUserId: string) => {
    const ratingsCollectionRef = collection(firestore, 'users', ratedUserId, 'ratings');
    const allRatingsSnapshot = await getDocs(ratingsCollectionRef);
    const userRef = doc(firestore, 'users', ratedUserId);
    const userDoc = await getDoc(userRef);
    const oldRatingCount = userDoc.exists() ? (userDoc.data() as User).ratingCount || 0 : 0;

    if (allRatingsSnapshot.empty) {
        await updateDoc(userRef, {
            averageRating: 0,
            ratingCount: 0,
        });
        return;
    }

    const allRatings = allRatingsSnapshot.docs.map(doc => doc.data() as UserRating);
    const totalRating = allRatings.reduce((sum, r) => sum + r.rating, 0);
    const newAverage = totalRating / allRatings.length;
    const newCount = allRatings.length;

    const updatePayload: any = {
      averageRating: newAverage,
      ratingCount: newCount,
    };
    if (newCount > oldRatingCount) {
        updatePayload.xp = increment(10); // Award 10 XP for being rated
    }

    await updateDoc(userRef, updatePayload);

    // Re-fetch user to check for badges
    const updatedUserSnap = await getDoc(userRef);
    if (!updatedUserSnap.exists()) return;
    
    const updatedUser = updatedUserSnap.data() as User;
    const newBadgesResult = getNewBadges(updatedUser);

    if (newBadgesResult.length > 0) {
      const newEarnedBadges: EarnedBadge[] = [];
      newBadgesResult.forEach(result => {
        for (let i = 0; i < result.times; i++) {
          newEarnedBadges.push({
            id: result.definition.id,
            timestamp: new Date().toISOString(),
          });
        }
      });
  
      if (newEarnedBadges.length > 0) {
        updateDocumentNonBlocking(userRef, { 
            badges: [...(updatedUser.badges || []), ...newEarnedBadges] 
        });
      }
  
      // Create notifications
      const notificationsCollection = collection(firestore, 'users', ratedUserId, 'notifications');
      newBadgesResult.forEach(result => {
        const badgeDef = result.definition;
        const message = result.times > 1 
            ? `You've earned the "${badgeDef.name}" badge ${result.times} times!`
            : `You've earned the "${badgeDef.name}" badge!`;

        addDocumentNonBlocking(notificationsCollection, {
            userId: ratedUserId,
            senderId: 'system',
            text: message,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'badge_earned',
        });
      });
    }
  }

  const handleSubmit = async () => {
    if (!currentUser || !currentUserProfile || newRating === 0 || !comment.trim()) {
        toast({
            variant: "destructive",
            title: "Incomplete Rating",
            description: "Please select a star rating and leave a comment.",
        });
        return;
    }
    
    setIsSubmitting(true);
    
    const ratingData = {
        raterId: currentUser.uid,
        ratedUserId: user.id,
        rating: newRating,
        comment: comment,
        createdAt: new Date().toISOString(),
    };

    const ratingsCollectionRef = collection(firestore, 'users', user.id, 'ratings');
    await addDocumentNonBlocking(ratingsCollectionRef, ratingData);

    const raterRef = doc(firestore, 'users', currentUser.uid);
    updateDocumentNonBlocking(raterRef, { xp: increment(15) });

    const notificationsCollection = collection(firestore, 'users', user.id, 'notifications');
    addDocumentNonBlocking(notificationsCollection, {
        userId: user.id,
        senderId: currentUser.uid,
        text: `rated your profile.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'profile_rated',
    });
    
    await recalculateAverageAndCount(user.id);
    
    toast({
        title: "Rating Submitted!",
        description: "Your rating has been successfully submitted.",
    });

    setNewRating(0);
    setComment('');
    setIsSubmitting(false);
  };
  
  const handleDelete = async (ratingId: string) => {
    if (!currentUser) return;
    const ratingRef = doc(firestore, 'users', user.id, 'ratings', ratingId);
    await deleteDoc(ratingRef);
    await recalculateAverageAndCount(user.id);
    toast({
        title: "Rating Deleted",
        description: "Your rating has been removed.",
    });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 bg-[#2f194d] border-none rounded-2xl overflow-hidden text-white shadow-2xl">
        <DialogTitle className="sr-only">User Ratings for {user.displayName}</DialogTitle>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <UserAvatar user={user} className="w-12 h-12" />
                <div>
                    <h2 className="text-xl font-bold">{user.displayName}</h2>
                    <div className="flex items-center gap-2">
                        <StarDisplay rating={user.averageRating || 0} />
                        <span className="text-sm font-bold">({averageRating})</span>
                    </div>
                </div>
            </div>
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4"><p>Loading...</p></div>
          ) : ratings && ratings.length > 0 ? (
            <div className="p-4 space-y-2">
                {ratings.map(r => <RatingItem key={r.id} rating={r} onDelete={handleDelete} />)}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No ratings yet.</p>
            </div>
          )}
        </ScrollArea>
        {!isSelf && (
          <div className="p-4 bg-black/20 space-y-2">
              <div className="flex justify-center text-gray-500 text-3xl" onMouseLeave={() => setHoverRating(0)}>
                  {[...Array(5)].map((_, i) => {
                      const ratingValue = i + 1;
                      return (
                          <button
                              key={i}
                              onMouseEnter={() => setHoverRating(ratingValue)}
                              onClick={() => setNewRating(ratingValue)}
                              className="focus:outline-none"
                          >
                              <FontAwesomeIcon 
                                  icon={faStarSolid} 
                                  className={cn(
                                      "transition-colors duration-200", 
                                      ratingValue <= (hoverRating || newRating) ? 'text-yellow-400' : 'text-gray-600',
                                      'filter-drop-shadow'
                                  )}
                                  style={{'--tw-drop-shadow': 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.7))'} as React.CSSProperties}
                              />
                          </button>
                      );
                  })}
              </div>
              <div className="relative">
                  <Input 
                      placeholder="Type here..." 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="bg-[#2f194d] border-none rounded-lg pr-12 text-white placeholder:text-gray-400"
                      disabled={isSubmitting}
                  />
                  <Button 
                      size="sm" 
                      className="absolute right-1 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#e91e63] to-[#9c27b0] rounded-md"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                  >
                      <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
                  </Button>
              </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
