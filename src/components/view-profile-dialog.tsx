

'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { UserAvatar } from './user-avatar';
import { User, EarnedBadge, FriendRequest } from '@/lib/types';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { roleIcons } from '@/lib/data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Separator } from './ui/separator';
import {
  faFlag,
  faBars,
  faStar,
  faThumbsUp,
  faLanguage,
  faUser,
  faHome,
  faEye,
  faPaperPlane,
  faHeart,
} from '@fortawesome/free-solid-svg-icons';
import { badgeDefinitions, BadgeDefinition } from '@/lib/badge-definitions';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Skeleton } from './ui/skeleton';
import { getEffectiveDisplayName } from '@/lib/user-helpers';
import { giftDefinitions } from '@/lib/gift-definitions';
import { ProfileNotesDialog } from './profile-notes-dialog';

const GenderIcon = ({ gender }: { gender?: 'male' | 'female' }) => {
  if (gender === 'male')
    return <span className="text-xl font-semibold">♂</span>;
  if (gender === 'female')
    return <span className="text-xl font-semibold">♀</span>;
  return <span className="text-lg font-semibold">⚥</span>;
};

interface ViewProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function ViewProfileDialog({
  open,
  onOpenChange,
  user,
}: ViewProfileDialogProps) {
  if (!user) return null;
  
  const [notesOpen, setNotesOpen] = useState(false);
  const firestore = useFirestore();

  // --- Friend fetching logic ---
  const friendsAsSenderQuery = useMemoFirebase(() => {
      if (!user) return null;
      return query(
          collection(firestore, 'friendRequests'),
          where('senderId', '==', user.id),
          where('status', '==', 'accepted')
      );
  }, [firestore, user]);
  const { data: friendsAsSender, isLoading: isLoadingFriendsAsSender } = useCollection<FriendRequest>(friendsAsSenderQuery);

  const friendsAsReceiverQuery = useMemoFirebase(() => {
      if (!user) return null;
      return query(
          collection(firestore, 'friendRequests'),
          where('receiverId', '==', user.id),
          where('status', '==', 'accepted')
      );
  }, [firestore, user]);
  const { data: friendsAsReceiver, isLoading: isLoadingFriendsAsReceiver } = useCollection<FriendRequest>(friendsAsReceiverQuery);

  const friendIds = useMemo(() => {
      const ids = new Set<string>();
      friendsAsSender?.forEach(req => ids.add(req.receiverId));
      friendsAsReceiver?.forEach(req => ids.add(req.senderId));
      return Array.from(ids);
  }, [friendsAsSender, friendsAsReceiver]);

  const allUsersCollectionRef = useMemoFirebase(
      () => collection(firestore, 'users'),
      [firestore]
  );
  const { data: allUsers, isLoading: isLoadingAllUsers } = useCollection<User>(allUsersCollectionRef);

  const friendsList = useMemo(() => {
      if (!allUsers || friendIds.length === 0) return [];
      const friendMap = new Map(allUsers.map(u => [u.id, u]));
      return friendIds.map(id => friendMap.get(id)).filter(Boolean) as User[];
  }, [allUsers, friendIds]);

  const isLoadingFriends = isLoadingFriendsAsSender || isLoadingFriendsAsReceiver || isLoadingAllUsers;


  const roleInfo = roleIcons[user.role || 'User'];
  const joinDate = user.createdAt || new Date().toISOString();

  const earnedBadges = user.badges?.map(earned => {
    const definition = badgeDefinitions.find(def => def.id === earned.id);
    return definition ? { ...earned, ...definition } : null;
  }).filter(Boolean) as (EarnedBadge & BadgeDefinition)[];

  const groupedBadges = useMemo(() => {
    if (!earnedBadges) return [];
    const badgeMap = new Map<string, { definition: BadgeDefinition, count: number }>();
    earnedBadges.forEach(badge => {
        if (!badgeMap.has(badge.id)) {
            badgeMap.set(badge.id, { definition: badge, count: 0 });
        }
        badgeMap.get(badge.id)!.count++;
    });
    return Array.from(badgeMap.values()).sort((a, b) => b.count - a.count);
  }, [earnedBadges]);


  const effectiveDisplayName = getEffectiveDisplayName(user);


  return (
    <>
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md w-full p-0 bg-[#2f194d] border-none rounded-2xl overflow-hidden text-white shadow-2xl">
            <DialogTitle className="sr-only">{effectiveDisplayName}'s Profile</DialogTitle>
            
            <div className="relative">
                {user.banner && (user.banner.startsWith('data:video') || user.banner.endsWith('.mp4') || user.banner.endsWith('.webm')) ? (
                    <video src={user.banner} autoPlay loop muted playsInline className="w-full h-48 object-cover z-0" />
                ) : (
                    <Image
                        src={user.banner || `https://picsum.photos/seed/${user.id}banner/400/200`}
                        alt="Profile banner"
                        width={400}
                        height={200}
                        className="w-full h-48 object-cover z-0"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#45114b] via-[#45114b]/70 to-transparent z-10" />

            <div className="absolute top-4 right-4 flex gap-2 z-20">
                <Button size="icon" className="bg-black/20 hover:bg-black/40 rounded-full h-8 w-8">
                <FontAwesomeIcon icon={faFlag} className="h-4 w-4" />
                </Button>
                <Button size="icon" className="bg-black/20 hover:bg-black/40 rounded-full h-8 w-8">
                <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
                </Button>
            </div>

            <div className="absolute top-20 left-6 z-20">
                <div className="relative">
                    <div className="p-1 rounded-2xl profile-avatar-border">
                        <div className="h-28 w-28 border-4 border-[#2f194d] rounded-xl overflow-hidden">
                            <UserAvatar
                                user={user}
                                className="h-full w-full"
                                isSquare
                            />
                        </div>
                    </div>
                    <button 
                        onClick={() => setNotesOpen(true)}
                        className="absolute top-0 right-0 -mt-2 -mr-2 z-30 bg-white/10 backdrop-blur-sm p-2 rounded-full border-2 border-white/20 hover:bg-white/20 transition-all">
                        <Image src="/interface_icons/note.svg" alt="Profile Notes" width={20} height={20} />
                    </button>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-red-500 border-2 border-[#2f194d]" />
                </div>
            </div>
            
            <div className="absolute bottom-4 right-4 text-right z-20">
                <div className="flex items-center justify-end gap-2">
                {roleInfo && roleInfo.imageUrl ? (
                    <Image
                    src={roleInfo.imageUrl}
                    alt={roleInfo.label}
                    width={20}
                    height={20}
                    className="object-contain"
                    />
                ) : null}
                <h2 className="text-lg font-bold">{roleInfo?.label || user.role}</h2>
                </div>
                <h1 className="text-4xl font-bold">{effectiveDisplayName}</h1>
                <p className="text-sm text-gray-300">{'<Ring of fire>'}</p>
                <div className="flex items-center justify-end gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-yellow-400">
                    <FontAwesomeIcon icon={faStar} className="h-4 w-4" />
                    <span className="font-semibold">{user.ratingCount || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-400">
                    <FontAwesomeIcon icon={faThumbsUp} className="h-4 w-4" />
                    <span className="font-semibold">{user.profileLikes || 0}</span>
                </div>
                </div>
            </div>
            </div>


            <div className="pt-0">
                <Tabs defaultValue="info" className="w-full px-4 pb-4">
                <TabsList className="grid w-full grid-cols-4 bg-black/20 h-12 rounded-lg p-1">
                    <TabsTrigger
                    value="info"
                    className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md"
                    >
                    Info
                    </TabsTrigger>
                    <TabsTrigger
                    value="about"
                    className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md"
                    >
                    About me
                    </TabsTrigger>
                    <TabsTrigger
                    value="friends"
                    className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md"
                    >
                    Friends
                    </TabsTrigger>
                    <TabsTrigger
                    value="gifts"
                    className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md"
                    >
                    Gifts
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-4 pb-4">
                    <div className="bg-black/20 p-4 rounded-lg space-y-3">
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-300">
                            <GenderIcon gender={user.gender} />{' '}
                            <span className="font-medium ml-1">Gender</span>
                        </div>
                        <p className="text-gray-200 font-semibold capitalize">
                            {user.gender || 'Other'}
                        </p>
                        </div>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-300">
                            <FontAwesomeIcon icon={faLanguage} className="h-5 w-5" />{' '}
                            <span className="font-medium">Language</span>
                        </div>
                        <p className="text-gray-200 font-semibold">English</p>
                        </div>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-300">
                            <FontAwesomeIcon icon={faUser} className="h-5 w-5" />{' '}
                            <span className="font-medium">Member since</span>
                        </div>
                        <p className="text-gray-200 font-semibold">
                            {format(new Date(joinDate), 'yyyy-MM-dd')}
                        </p>
                        </div>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-300">
                            <FontAwesomeIcon icon={faHome} className="h-5 w-5" />{' '}
                            <span className="font-medium">Current room</span>
                        </div>
                        <p className="text-gray-200 font-semibold">Main room</p>
                        </div>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-300">
                            <FontAwesomeIcon icon={faEye} className="h-5 w-5" />{' '}
                            <span className="font-medium">Last seen</span>
                        </div>
                        <p className="text-gray-200 font-semibold">
                            {format(new Date(), 'yyyy-MM-dd HH:mm')}
                        </p>
                        </div>
                    </div>
                    </div>
                </TabsContent>
                <TabsContent value="about" className="mt-4 pb-4">
                    <div className="bg-black/20 p-4 rounded-lg space-y-3 min-h-[200px]">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {user.about || 'This user has not written anything about themselves yet.'}
                    </p>
                    </div>
                </TabsContent>
                <TabsContent value="friends" className="mt-4 pb-4">
                    {isLoadingFriends ? (
                        <div className="grid grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="relative aspect-square">
                                    <Skeleton className="w-full h-full rounded-lg bg-black/20" />
                                </div>
                            ))}
                        </div>
                    ) : friendsList && friendsList.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4">
                            {friendsList.map(friend => (
                                <div key={friend.id} className="relative aspect-square rounded-lg overflow-hidden group">
                                    <Image
                                        src={friend.avatarUrl || `https://picsum.photos/seed/${friend.id}/100/100`}
                                        alt={getEffectiveDisplayName(friend)}
                                        layout="fill"
                                        objectFit="cover"
                                        className="transition-transform duration-300 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1.5 text-center">
                                        <p className="text-white text-xs font-semibold truncate">{getEffectiveDisplayName(friend)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center text-gray-400 py-8">This user has no friends yet.</p>
                    )}
                </TabsContent>
                <TabsContent value="gifts" className="mt-4 pb-4">
                        <div className="bg-black/20 p-4 rounded-lg space-y-4">
                            <div className="flex justify-around text-center">
                                <div>
                                    <p className="text-2xl font-bold">{user.gifts?.sent?.total || 0}</p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1.5"><FontAwesomeIcon icon={faPaperPlane} /> Sent</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{user.gifts?.received?.total || 0}</p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1.5"><FontAwesomeIcon icon={faHeart} /> Received</p>
                                </div>
                            </div>
                            <Separator className="bg-white/10" />
                            <h3 className="font-medium text-gray-300 text-center">Gift Inventory</h3>
                            {user.gifts?.received?.inventory && Object.keys(user.gifts.received.inventory).length > 0 ? (
                                <div className="grid grid-cols-4 gap-4">
                                    {Object.entries(user.gifts.received.inventory).map(([giftId, count]) => {
                                        const giftDef = giftDefinitions.find(g => g.id === giftId);
                                        if (!giftDef) return null;
                                        return (
                                            <TooltipProvider key={giftId}>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                <div className="relative flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-black/20">
                                                    <Image src={giftDef.icon} alt={giftDef.name} width={24} height={24} className="h-6 w-6" />
                                                    <span className="text-xs font-semibold">{giftDef.name}</span>
                                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-black/20">
                                                    {count}
                                                    </div>
                                                </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-black/80 text-white border-purple-500">
                                                <p>{giftDef.name} x{count}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            </TooltipProvider>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-center text-gray-400 py-4">No gifts received yet.</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <h3 className="font-bold text-center text-gray-300 mb-4">Badges Earned</h3>
                    {groupedBadges && groupedBadges.length > 0 ? (
                        <div className="grid grid-cols-5 gap-3">
                            {groupedBadges.map(({ definition: badge, count }) => (
                                <TooltipProvider key={badge.id}>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div
                                                className="relative w-12 h-14 flex-shrink-0 flex items-center justify-center bg-black/30"
                                                style={{
                                                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                                }}
                                            >
                                                <div
                                                    className="relative w-11 h-11 flex items-center justify-center bg-[#2f194d]"
                                                    style={{
                                                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                                    }}
                                                >
                                                    {badge.imageUrl ? (
                                                        <Image src={badge.imageUrl} alt={badge.name} width={24} height={24} className="h-6 w-6 object-contain" />
                                                    ) : (
                                                        badge.icon && <FontAwesomeIcon icon={badge.icon} className="h-5 w-5 text-yellow-400" />
                                                    )}
                                                </div>
                                                {count > 1 && (
                                                    <div className="absolute -top-1 -right-1 w-6 h-6">
                                                        <Image src={`/badge/numbers/${count}.svg`} alt={`Count ${count}`} layout="fill" />
                                                    </div>
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-black/80 text-white border-purple-500">
                                            <p className="font-bold">{badge.name} {count > 1 ? `(x${count})` : ''}</p>
                                            <p>{badge.description}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center text-gray-400">No badges earned yet.</p>
                    )}
                </div>
            </div>
        </DialogContent>
        </Dialog>
        {user && <ProfileNotesDialog open={notesOpen} onOpenChange={setNotesOpen} user={user} />}
    </>
  );
}
