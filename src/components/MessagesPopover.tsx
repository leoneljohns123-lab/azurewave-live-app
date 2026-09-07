
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments } from '@fortawesome/free-solid-svg-icons';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { PrivateMessage, User } from '@/lib/types';
import { UserAvatar } from './user-avatar';
import { Separator } from './ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useDM } from '@/contexts/DMProvider';
import { collection, query, where, doc } from 'firebase/firestore';
import Image from 'next/image';

// --- Message Item ---
function MessageItem({ message, onSelect, isConversationUnread }: { message: PrivateMessage, onSelect: (user: User) => void, isConversationUnread: boolean }) {
    const { user: currentUser } = useUser();
    const firestore = useFirestore();

    const otherUserId = useMemo(() => message.participants.find(p => p !== currentUser?.uid), [message.participants, currentUser?.uid]);
    const otherUserRef = useMemoFirebase(() => otherUserId ? doc(firestore, 'users', otherUserId) : null, [firestore, otherUserId]);
    const { data: otherUser, isLoading } = useDoc<User>(otherUserRef);
    const isUnread = isConversationUnread;

    const isBot = otherUserId === 'superbot' || otherUserId === 'gemma' || otherUserId === 'quizbot' || otherUserId === 'qbot';
    
    const botFallbacks: { [key: string]: User } = {
        'superbot': { id: 'superbot', displayName: 'Superbot', username: 'superbot', avatarUrl: '/interface_icons/superbot.svg', role: 'Bot', status: 'online' } as User,
        'gemma': { id: 'gemma', displayName: 'Gemma', username: 'gemma', avatarUrl: '/interface_icons/gemma.svg', role: 'Bot', status: 'online' } as User,
        'quizbot': { id: 'quizbot', displayName: 'Quizbot', username: 'quizbot', avatarUrl: '/interface_icons/quizbot.svg', role: 'Bot', status: 'online' } as User,
        'qbot': { id: 'qbot', displayName: 'Quizbot', username: 'qbot', avatarUrl: '/interface_icons/quizbot.svg', role: 'Bot', status: 'online' } as User
    };

    if (isLoading && !isBot) {
        return (
            <div className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>
        );
    }

    const effectiveUser = otherUser || (isBot ? botFallbacks[otherUserId!] : null);

    if (!effectiveUser) return null;

    return (
        <div 
            className={cn("flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer", isUnread && "bg-blue-50 dark:bg-blue-900/25")}
            onClick={() => onSelect(effectiveUser as User)}
        >
            <UserAvatar user={effectiveUser as User} className="h-10 w-10" />
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <p className="font-semibold truncate">{effectiveUser.displayName}</p>
                    <p className="text-xs text-muted-foreground/80 flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </p>
                </div>
                <p className={cn("text-sm text-muted-foreground truncate", isUnread && "text-foreground font-medium")}>
                    {message.senderId === currentUser?.uid && "You: "}{message.content}
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

export function MessagesPopover({ soundState }: { soundState?: any }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { openDM } = useDM();
    const [open, setOpen] = useState(false);
    const prevRecentMessagesRef = useRef<PrivateMessage[] | null>(null);

    // --- Private Messages ---
    const privateMessagesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'privateMessages'),
            where('participants', 'array-contains', user.uid)
        );
    }, [user, firestore]);
    const { data: recentMessages, isLoading: areMessagesLoading } = useCollection<PrivateMessage>(privateMessagesQuery);

    // --- Sound effect for new private messages ---
    useEffect(() => {
        if (areMessagesLoading || !recentMessages || !user) {
            return;
        }

        if (prevRecentMessagesRef.current === null) {
            prevRecentMessagesRef.current = recentMessages;
            return;
        }

        const prevIds = new Set(prevRecentMessagesRef.current.map(m => m.id));
        const hasNewReceivedMessages = recentMessages.some(
            m => !prevIds.has(m.id) && m.receiverId === user.uid
        );

        if (hasNewReceivedMessages && soundState?.privateSounds) {
            playSound('/sounds/private.mp3');
        }

        prevRecentMessagesRef.current = recentMessages;
    }, [recentMessages, areMessagesLoading, user, soundState]);

    const conversations = useMemo(() => {
        if (!recentMessages || !user) return [];
        
        const sortedMessages = [...recentMessages].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const conversationsMap = new Map<string, PrivateMessage>();
        
        sortedMessages.forEach(message => {
            const otherParticipantId = message.participants.find(p => p !== user.uid);
            if (otherParticipantId) {
                if (!conversationsMap.has(otherParticipantId)) {
                    conversationsMap.set(otherParticipantId, message);
                }
            }
        });
        
        return Array.from(conversationsMap.values());
    }, [recentMessages, user]);

    const unreadConversationPartners = useMemo(() => {
        if (!recentMessages || !user) return new Set<string>();

        const partners = new Set<string>();
        for (const message of recentMessages) {
            if (!message.read && message.receiverId === user.uid) {
                const otherUser = message.participants.find(p => p !== user.uid);
                if (otherUser) {
                    partners.add(otherUser);
                }
            }
        }
        return partners;
    }, [recentMessages, user]);
    
    const unreadMessagesCount = unreadConversationPartners.size;

    const handleSelectConversation = (otherUser: User) => {
        openDM(otherUser);
        setOpen(false); // close popover
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Messages" className="relative">
                    <FontAwesomeIcon icon={faComments} className="w-5 h-5" />
                    {unreadMessagesCount > 0 && (
                    <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center border-2 border-card">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </div>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <div className="p-2 max-h-96 overflow-y-auto">
                    <h4 className="font-semibold text-sm text-center mb-2 p-2">Recent Messages</h4>
                    {areMessagesLoading ? (
                        <div className="p-4 space-y-4">
                            {[...Array(3)].map((_, i) => <MessageItem key={i} message={null as any} onSelect={() => {}} isConversationUnread={false}/>)}
                        </div>
                    ) : conversations && conversations.length > 0 ? (
                        conversations.map((convo, index) => {
                            const otherParticipantId = convo.participants.find(p => p !== user?.uid);
                            return (
                                <div key={convo.id}>
                                <MessageItem
                                    message={convo}
                                    onSelect={handleSelectConversation}
                                    isConversationUnread={!!otherParticipantId && unreadConversationPartners.has(otherParticipantId)}
                                />
                                {index < conversations.length - 1 && <Separator className="my-0" />}
                                </div>
                            )
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Image src="/interface_icons/nodata.svg" alt="No messages" width={64} height={64} className="opacity-70" />
                            <p className="text-sm text-muted-foreground mt-4">No recent messages.</p>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
