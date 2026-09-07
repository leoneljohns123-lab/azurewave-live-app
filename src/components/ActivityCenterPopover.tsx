'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faUserPlus,
  faCheck,
  faTimes,
  faUserFriends,
  faUserShield,
  faGift,
  faCoins,
  faMedal,
  faStar,
  faArrowUp,
  faGem,
  faComment,
  faThumbsUp,
  faHeart,
  faLaugh,
  faThumbsDown,
  faPlusSquare,
  faPhone,
  faBookmark,
  faBullhorn,
  faFlag,
  faMusic,
} from '@fortawesome/free-solid-svg-icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { FriendRequest, Notification as NotificationType, User } from '@/lib/types';
import { UserAvatar } from './user-avatar';
import { Separator } from './ui/separator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, orderBy, limit, where, getDocs, writeBatch, doc, increment } from 'firebase/firestore';
import Image from 'next/image';

// --- Friend Request Item ---
function RequestItem({ request }: { request: FriendRequest }) {
    const firestore = useFirestore();

    const senderRef = useMemoFirebase(() => doc(firestore, 'users', request.senderId), [firestore, request.senderId]);
    const { data: sender, isLoading } = useDoc<User>(senderRef);

    const handleAccept = () => {
        const requestRef = doc(firestore, 'friendRequests', request.id);
        updateDocumentNonBlocking(requestRef, { status: 'accepted' });

        const senderUserRef = doc(firestore, 'users', request.senderId);
        updateDocumentNonBlocking(senderUserRef, { xp: increment(50) });

        const receiverUserRef = doc(firestore, 'users', request.receiverId);
        updateDocumentNonBlocking(receiverUserRef, { xp: increment(50) });
    };

    const handleDecline = () => {
        const requestRef = doc(firestore, 'friendRequests', request.id);
        deleteDocumentNonBlocking(requestRef);
    };

    if (isLoading || !sender) {
        return (
            <div className="flex items-center gap-4 p-2">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
            <UserAvatar user={sender} className="h-10 w-10" />
            <div className="flex-1">
                <p className="text-sm font-semibold">{sender.displayName}</p>
                <p className="text-xs text-muted-foreground">Sent you a friend request</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:hover:bg-green-900" onClick={handleAccept}>
                    <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-green-600 dark:text-green-400" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900" onClick={handleDecline}>
                    <FontAwesomeIcon icon={faTimes} className="h-4 w-4 text-red-600 dark:text-red-400" />
                </Button>
            </div>
        </div>
    );
}

// --- Notification Item ---
function NotificationIcon({ type }: { type: NotificationType['type'] }) {
    const iconMap: { [key: string]: { icon: React.ReactNode, bgColor: string } } = {
        friend_request_accepted: { icon: <FontAwesomeIcon icon={faUserFriends} className="h-3 w-3 text-white" />, bgColor: 'bg-blue-500' },
        moderation: { icon: <FontAwesomeIcon icon={faUserShield} className="h-3 w-3 text-white" />, bgColor: 'bg-red-500' },
        gift_received: { icon: <FontAwesomeIcon icon={faGift} className="h-3 w-3 text-white" />, bgColor: 'bg-pink-500' },
        gold_received: { icon: <FontAwesomeIcon icon={faCoins} className="h-3 w-3 text-white" />, bgColor: 'bg-yellow-500' },
        badge_earned: { icon: <FontAwesomeIcon icon={faMedal} className="h-3 w-3 text-white" />, bgColor: 'bg-yellow-500' },
        rank_to_vip: { icon: <FontAwesomeIcon icon={faStar} className="h-3 w-3 text-white" />, bgColor: 'bg-purple-500' },
        level_up: { icon: <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3 text-white" />, bgColor: 'bg-green-500' },
        ruby_received: { icon: <FontAwesomeIcon icon={faGem} className="h-3 w-3 text-white" />, bgColor: 'bg-red-500' },
        post_comment: { icon: <FontAwesomeIcon icon={faComment} className="h-3 w-3 text-white" />, bgColor: 'bg-blue-500' },
        post_liked: { icon: <FontAwesomeIcon icon={faThumbsUp} className="h-3 w-3 text-white" />, bgColor: 'bg-pink-500' },
        post_loved: { icon: <FontAwesomeIcon icon={faHeart} className="h-3 w-3 text-white" />, bgColor: 'bg-red-500' },
        post_funny: { icon: <FontAwesomeIcon icon={faLaugh} className="h-3 w-3 text-white" />, bgColor: 'bg-yellow-500' },
        post_disliked: { icon: <FontAwesomeIcon icon={faThumbsDown} className="h-3 w-3 text-white" />, bgColor: 'bg-gray-500' },
        profile_liked: { icon: <FontAwesomeIcon icon={faHeart} className="h-3 w-3 text-white" />, bgColor: 'bg-pink-500' },
        post_added: { icon: <FontAwesomeIcon icon={faPlusSquare} className="h-3 w-3 text-white" />, bgColor: 'bg-green-500' },
        call_started: { icon: <FontAwesomeIcon icon={faPhone} className="h-3 w-3 text-white" />, bgColor: 'bg-green-500' },
        dj_live: { icon: <FontAwesomeIcon icon={faMusic} className="h-3 w-3 text-white" />, bgColor: 'bg-purple-500' },
        bookmark: { icon: <FontAwesomeIcon icon={faBookmark} className="h-3 w-3 text-white" />, bgColor: 'bg-blue-500' },
        announcement_added: { icon: <FontAwesomeIcon icon={faBullhorn} className="h-3 w-3 text-white" />, bgColor: 'bg-indigo-500' },
        reported: { icon: <FontAwesomeIcon icon={faFlag} className="h-3 w-3 text-white" />, bgColor: 'bg-orange-500' },
        profile_rated: { icon: <FontAwesomeIcon icon={faStar} className="h-3 w-3 text-white" />, bgColor: 'bg-yellow-500' },
        default: { icon: <FontAwesomeIcon icon={faBell} className="h-3 w-3 text-white" />, bgColor: 'bg-gray-500' },
    };

    const details = iconMap[type] || iconMap.default!;

    return (
        <div className={cn("absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center border-2 border-popover", details.bgColor)}>
            {details.icon}
        </div>
    );
}

function NotificationItem({ notification }: { notification: NotificationType }) {
    const firestore = useFirestore();

    const senderIsSystem = !notification.senderId || notification.senderId === 'system';

    const senderRef = useMemoFirebase(
        () => (senderIsSystem ? null : doc(firestore, 'users', notification.senderId)),
        [firestore, notification.senderId, senderIsSystem]
    );
    const { data: senderData, isLoading } = useDoc<User>(senderRef);

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 p-3">
                <p>Loading...</p>
            </div>
        );
    }
    
    const sender = senderIsSystem ? {
        id: 'system',
        displayName: 'System',
        avatarUrl: '',
        email: null,
        username: 'system',
        role: 'Bot',
        gender: 'private'
    } as User : senderData;
    
    if (!sender) {
        return null; 
    }

    return (
        <div className={cn("flex items-center gap-3 p-3 rounded-lg hover:bg-accent", !notification.read && "bg-blue-50 dark:bg-blue-900/25")}>
             <div className="relative">
                <UserAvatar user={sender} className="h-10 w-10" />
                {notification.type !== 'system' && <NotificationIcon type={notification.type} />}
            </div>
            <div className="flex-1">
                <p className="text-sm">
                    <span className="font-semibold text-foreground">{sender.displayName}</span>
                    <span className="text-muted-foreground"> {notification.text}</span>
                </p>
                <p className="text-xs text-muted-foreground/80 mt-0.5">
                    {format(new Date(notification.timestamp), "dd/MM HH:mm")}
                </p>
            </div>
        </div>
    );
}

const playSound = (src: string) => {
    try {
      const audio = new Audio(src);
      audio.currentTime = 0;
      audio.play().catch(error => {
          console.warn(`Could not play sound ${src}. User interaction may be required.`, error);
      });
    } catch (error) {
      // Handle cases where Audio object is not available (e.g. server-side)
      console.warn("Audio could not be played.", error);
    }
};

export function ActivityCenterPopover({ soundState }: { soundState?: any }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const prevNotificationsRef = useRef<NotificationType[] | null>(null);

    // --- Notifications ---
    const notificationsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'users', user.uid, 'notifications'),
            orderBy('timestamp', 'desc'),
            limit(15)
        );
    }, [user, firestore]);
    const { data: notifications, isLoading: areNotificationsLoading } = useCollection<NotificationType>(notificationsQuery);
    const unreadNotificationsCount = notifications?.filter(n => !n.read).length || 0;

    // --- Sound effect for new notifications ---
    useEffect(() => {
        if (areNotificationsLoading || !notifications) {
            return;
        }

        if (prevNotificationsRef.current === null) {
            prevNotificationsRef.current = notifications;
            return;
        }

        const prevIds = new Set(prevNotificationsRef.current.map(n => n.id));
        const newNotifications = notifications.filter(n => !prevIds.has(n.id) && n.type !== 'moderation');

        if (newNotifications.length > 0 && soundState?.notificationSounds) {
            playSound('/sounds/notify.mp3');
        }

        prevNotificationsRef.current = notifications;
    }, [notifications, areNotificationsLoading, soundState]);

    // --- Friend Requests ---
    const requestsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'friendRequests'),
            where('receiverId', '==', user.uid),
            where('status', '==', 'pending')
        );
    }, [firestore, user]);
    const { data: friendRequests, isLoading: areRequestsLoading } = useCollection<FriendRequest>(requestsQuery);
    const newRequestsCount = friendRequests?.length || 0;

    // --- Total Badge Count ---
    const totalNewActivityCount = unreadNotificationsCount + newRequestsCount;

    const handleClearNotifications = async () => {
        if (!user) return;
        
        const notificationsCollectionRef = collection(firestore, 'users', user.uid, 'notifications');
        
        try {
            const querySnapshot = await getDocs(notificationsCollectionRef);
            if (querySnapshot.empty) {
                toast({
                    title: "No notifications to clear",
                });
                return;
            }
    
            const batch = writeBatch(firestore);
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            toast({
                title: "Notifications Cleared",
            });
        } catch (error) {
            console.error("Error clearing notifications:", error);
            toast({
                variant: "destructive",
                title: "Error",
            });
        }
    };

    const handlePopoverOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen && notifications && user) {
            notifications.forEach(notif => {
                if (!notif.read) {
                    const notifRef = doc(firestore, 'users', user.uid, 'notifications', notif.id);
                    updateDocumentNonBlocking(notifRef, { read: true });
                }
            });
        }
    };

    return (
        <Popover open={open} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Activity Center" className="relative">
                    <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
                    {totalNewActivityCount > 0 && (
                    <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center border-2 border-card">
                        {totalNewActivityCount > 9 ? '9+' : totalNewActivityCount}
                    </div>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <Tabs defaultValue="notifications" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
                        <TabsTrigger value="notifications" className="rounded-none relative">
                            Notifications
                            {unreadNotificationsCount > 0 && <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary"></div>}
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="rounded-none relative">
                            Requests
                            {newRequestsCount > 0 && <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary"></div>}
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="notifications" className="p-2 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h4 className="font-semibold text-sm">Recent Notifications</h4>
                            <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={handleClearNotifications} disabled={!notifications || notifications.length === 0}>
                                Clear All
                            </Button>
                        </div>
                         {areNotificationsLoading ? (
                            <div className="p-4"><p>Loading...</p></div>
                         ) : notifications && notifications.length > 0 ? (
                            notifications.map((notif, index) => (
                                <div key={notif.id}>
                                  <NotificationItem notification={notif} />
                                  {index < notifications.length - 1 && <Separator className="my-0" />}
                                </div>
                            ))
                         ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Image src="/interface_icons/nodata2.svg" alt="No notifications" width={64} height={64} className="opacity-70" />
                                <p className="text-sm text-muted-foreground mt-4">No new notifications.</p>
                            </div>
                         )}
                    </TabsContent>

                    <TabsContent value="requests" className="p-2 max-h-96 overflow-y-auto">
                         <h4 className="font-semibold text-sm text-center mb-2 p-2">Friend Requests</h4>
                        {areRequestsLoading ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">Loading requests...</div>
                        ) : friendRequests && friendRequests.length > 0 ? (
                            friendRequests.map(req => <RequestItem key={req.id} request={req} />)
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Image src="/interface_icons/nodata.svg" alt="No requests" width={64} height={64} className="opacity-70" />
                                <p className="text-sm text-muted-foreground mt-4">No new requests.</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </PopoverContent>
        </Popover>
    );
}
