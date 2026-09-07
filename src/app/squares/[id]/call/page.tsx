
'use client';

import { Button } from '@/components/ui/button';
import { useDoc, useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { Square, User } from '@/lib/types';
import { doc, collection, query, where, arrayUnion, writeBatch } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/user-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '@/hooks/use-toast';
import { getEffectiveDisplayName } from '@/lib/user-helpers';

function CallLobbyPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const squareId = params.id as string;
    const firestore = useFirestore();
    const { profile: currentUserProfile, isLoading: isUserLoading, realAuthUser } = useEffectiveUserProfile();

    // Redirect if not logged in
    useEffect(() => {
        if (!isUserLoading && !realAuthUser) {
            router.replace('/login');
        }
    }, [isUserLoading, realAuthUser, router]);

    const squareRef = useMemoFirebase(() => doc(firestore, 'squares', squareId), [firestore, squareId]);
    const { data: square, isLoading: isSquareLoading } = useDoc<Square>(squareRef);

    const participantIds = square?.call?.participants || [];
    const usersInCallQuery = useMemoFirebase(() => {
        if (participantIds.length === 0) return null;
        // Firestore 'in' queries are limited to 30 values.
        return query(collection(firestore, 'users'), where('id', 'in', participantIds.slice(0, 30)));
    }, [firestore, participantIds]);

    const { data: participants, isLoading: areParticipantsLoading } = useCollection<User>(usersInCallQuery);

    const handleStartCall = async () => {
        if (!currentUserProfile || !squareRef || !square) return;
        
        const isParticipant = square?.call?.participants?.includes(currentUserProfile.id);
        
        const updates: any = { 'call.isActive': true };
        if (!isParticipant) {
            updates['call.participants'] = arrayUnion(currentUserProfile.id);
        }
        
        await updateDocumentNonBlocking(squareRef, updates);

        // Send notifications to all members of the square
        if (square.memberIds && square.memberIds.length > 0) {
            const batch = writeBatch(firestore);
            square.memberIds.forEach(memberId => {
                if (memberId !== currentUserProfile.id) { // Don't notify self
                    const notificationRef = doc(collection(firestore, 'users', memberId, 'notifications'));
                    batch.set(notificationRef, {
                        userId: memberId,
                        senderId: 'system',
                        text: `${getEffectiveDisplayName(currentUserProfile)} started a call in ${square.name}.`,
                        timestamp: new Date().toISOString(),
                        read: false,
                        type: 'call_started',
                        context: { squareId: square.id }
                    });
                }
            });
            await batch.commit();
        }
        
        router.push(`/squares/${squareId}/call/view`);
    };
    
    // Add user to userSquares when they visit the lobby
    useEffect(() => {
        if (!realAuthUser || !squareId || !firestore) return;
        
        const userSquareDocId = `${realAuthUser.uid}_${squareId}`;
        const userSquareRef = doc(firestore, 'userSquares', userSquareDocId);

        setDocumentNonBlocking(userSquareRef, {
          id: userSquareDocId,
          userId: realAuthUser.uid,
          squareId: squareId,
          joinTime: new Date().toISOString(),
        }, { merge: true });

    }, [realAuthUser, squareId, firestore]);

    const isLoading = isSquareLoading || isUserLoading;

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-[#181a21] to-[#2b2f3c] min-h-screen">
                <p className="text-white">Loading Call Lobby...</p>
            </div>
        );
    }
    
    if (!square) {
        return (
            <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-[#181a21] to-[#2b2f3c] min-h-screen">
                <p className="text-white">Square not found.</p>
            </div>
        )
    }

    const inCallCount = participants?.length || 0;

    return (
        <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-[#181a21] to-[#2b2f3c] text-white p-8 min-h-screen">
            <Link href={`/squares/${squareId}`} className="absolute top-4 left-4 text-gray-400 hover:text-white">
                &larr; Back to Square
            </Link>
            <div className="text-center max-w-lg">
                <FontAwesomeIcon icon={faVideo} className="h-16 w-16 mx-auto mb-6 text-blue-400" />
                <h1 className="text-4xl font-bold">{square.name}</h1>
                <p className="mt-2 text-lg text-gray-400">{square.description}</p>
                <Button 
                    className="mt-8 bg-green-500 hover:bg-green-600 text-white font-bold text-lg px-8 py-6"
                    onClick={handleStartCall}
                >
                    Start Call
                </Button>

                <div className="mt-12">
                    <h2 className="text-xl font-semibold">In Call ({inCallCount})</h2>
                    {areParticipantsLoading && inCallCount > 0 ? (
                        <div className="flex justify-center gap-4 mt-4">
                            {[...Array(inCallCount)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-12 rounded-full" />
                            ))}
                        </div>
                    ) : inCallCount > 0 && participants ? (
                        <div className="flex justify-center gap-4 mt-4 flex-wrap">
                            {participants.map(p => (
                                <UserAvatar key={p.id} user={p} className="h-12 w-12" />
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-gray-500">No one is in the call yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CallLobbyPage;
