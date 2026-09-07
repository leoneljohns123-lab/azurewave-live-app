
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Notification, ModerationAction, User } from '@/lib/types';
import { signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGavel, faRightFromBracket, faVolumeMute, faBan, faHandSparkles } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/context/chat-context';
import { UserAvatar } from './user-avatar';
import { getEffectiveDisplayName } from '@/lib/user-helpers';


type DialogButton = {
  text: string;
  action: 'close' | 'closeAndSignOut' | 'contactSupport' | 'rejoin' | 'joinRoom' | 'leaveRoom';
  variant: 'primary' | 'secondary';
  roomId?: string;
};

const PROCESSED_ACTIONS_KEY = 'processedModActions';

const getInitialProcessedIds = (): Set<string> => {
    if (typeof window === 'undefined') {
        return new Set();
    }
    const stored = localStorage.getItem(PROCESSED_ACTIONS_KEY);
    try {
        const parsed = stored ? JSON.parse(stored) : [];
        return new Set(parsed);
    } catch {
        return new Set();
    }
};

function WarningView({ notification, onAcknowledge }: { notification: Notification, onAcknowledge: () => void }) {
    const [ticketId, setTicketId] = useState('');

    useEffect(() => {
        // This avoids hydration errors.
        setTicketId(`#${Math.floor(1000 + Math.random() * 9000)}`);
    }, []);

    if (!notification.action) return null;
    
    return (
        <div className="warning-card">
          <div className="warning-top">
            <h1>YOU HAVE BEEN WARNED</h1>
            <h2>WARNING NOTICE</h2>
          </div>

          <p>
            You have received a warning for violating the rules.
            Please follow the guidelines to avoid further action.
          </p>

          <div className="warning-details">
            <div><span>Reason:</span> {notification.action.reason || 'Breaking rules'}</div>
            <div><span>Room:</span> General Chat</div> {/* Hardcoded for now */}
            <div><span>Contact:</span> admin@example.com</div>
            <div><span>Ticket ID:</span> {ticketId}</div>
          </div>

          <div className="warning-timer-row">
            <div className="warning-timer-box">WARNING</div>
            <div className="warning-label">Status</div>
          </div>

          <button className="warning-btn" onClick={onAcknowledge}>ACKNOWLEDGE</button>

          <div className="warning-final-warning">
            Continued violations may lead to a temporary ban.
          </div>
        </div>
    );
}


const getDialogContent = (notification: Notification, closeDialog: () => void, users: User[] | null) => {
    const buttons: DialogButton[] = [];
    let icon: string | React.ReactNode = 'ℹ️';
    let title = 'Notification';
    let description: React.ReactNode = 'You have a new notification.';
    let iconClasses = 'text-blue-600 dark:text-blue-400';
    let bgClasses = 'bg-blue-100 dark:bg-blue-900/50';

    if (notification.type === 'moderation' && notification.action) {
        const action = notification.action;
        switch (action.actionType) {
          case 'summon':
             if (notification.summonDetails) {
                const summoner = users?.find(u => u.id === notification.senderId);
                if (summoner) {
                    icon = <UserAvatar user={summoner} className="h-16 w-16" />;
                } else {
                    icon = <FontAwesomeIcon icon={faHandSparkles} />;
                }
                title = 'You have been summoned!';
                description = <>{getEffectiveDisplayName(summoner)} has summoned you to the room: <strong>{notification.summonDetails.roomName}</strong>. You must join to continue.</>;
                buttons.push({ text: 'Join Room', action: 'joinRoom', variant: 'primary', roomId: notification.summonDetails.roomId });
                iconClasses = '';
                bgClasses = 'bg-transparent';
            }
            break;
          case 'kick':
            icon = <FontAwesomeIcon icon={faRightFromBracket} />;
            title = 'You have been kicked';
            description = (
                <>
                    A moderator has removed you from the room. Reason: {action.reason || 'No reason provided.'}
                    <br />
                    You can rejoin after a short cooldown.
                </>
            );
            buttons.push({ text: 'Leave Room', action: 'leaveRoom', variant: 'primary' });
            iconClasses = 'text-red-600 dark:text-red-400';
            bgClasses = 'bg-red-100 dark:bg-red-900/50';
            break;
          case 'ban':
            icon = <FontAwesomeIcon icon={faBan} />;
            title = 'You are banned';
            description = 'Your access has been permanently revoked due to repeated violations.';
            buttons.push({ text: 'Contact Support', action: 'contactSupport', variant: 'secondary' });
            buttons.push({ text: 'Exit', action: 'closeAndSignOut', variant: 'primary' });
            iconClasses = 'text-red-600 dark:text-red-400';
            bgClasses = 'bg-red-100 dark:bg-red-900/50';
            break;
          case 'mute':
          case 'gag':
            const durationText = action.duration 
                ? `for ${action.duration} minutes` 
                : 'permanently';
            icon = <FontAwesomeIcon icon={faVolumeMute} />;
            title = `You are ${action.actionType}ged`;
            description = `You cannot send messages ${durationText}. Reason: ${action.reason || 'No reason provided.'}`;
            buttons.push({ text: 'Contact Support', action: 'contactSupport', variant: 'secondary' });
            buttons.push({ text: 'Got it', action: 'close', variant: 'primary' });
            iconClasses = 'text-gray-600 dark:text-gray-400';
            bgClasses = 'bg-gray-100 dark:bg-gray-700';
            break;
          // 'warn' is now handled by a custom component
          default:
            buttons.push({ text: 'Okay', action: 'close', variant: 'primary' });
            break;
        }
    } else {
        buttons.push({ text: 'Okay', action: 'close', variant: 'primary' });
    }
    return { icon, title, description, buttons, iconClasses, bgClasses };
}

const playSound = (src: string) => {
    const audio = new Audio(src);
    audio.currentTime = 0;
    audio.play().catch(error => {
        console.warn(`Could not play sound ${src}. User interaction may be required.`, error);
    });
};

export function ModerationListener({ soundState }: { soundState?: any }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { users } = useChat();
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<string>>(getInitialProcessedIds);

  useEffect(() => {
      localStorage.setItem(PROCESSED_ACTIONS_KEY, JSON.stringify(Array.from(processedIds)));
  }, [processedIds]);

  const recentNotificationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('timestamp', 'desc')
    );
  }, [user, firestore]);

  const { data: notifications } = useCollection<Notification>(recentNotificationsQuery);

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const latestNotification = notifications.find(n => !processedIds.has(n.id) && n.type === 'moderation');

      if (latestNotification) {
        setProcessedIds((prev) => new Set(prev).add(latestNotification.id));

        if (soundState?.notificationSounds) {
            const actionType = latestNotification.action?.actionType;
            if (actionType === 'kick' || actionType === 'mute' || actionType === 'ban' || actionType === 'warn') {
                playSound('/sounds/action.mp3');
            } else if (actionType === 'gag') {
                playSound('/sounds/mute.mp3');
            }
        }
        
        setActiveNotification(latestNotification);
      }
    }
  }, [notifications, processedIds, soundState, auth]);

  const closeDialog = useCallback(() => {
    setActiveNotification(null);
  }, []);

  const handleAction = (button: DialogButton) => {
    switch (button.action) {
        case 'close':
            closeDialog();
            break;
        case 'closeAndSignOut':
            signOut(auth).finally(() => {
                closeDialog();
                localStorage.removeItem(PROCESSED_ACTIONS_KEY);
                setProcessedIds(new Set());
            });
            break;
        case 'contactSupport':
            window.open('mailto:support@example.com?subject=Support Request', '_blank');
            break;
        case 'joinRoom':
            if (button.roomId) {
                router.push(`/squares/${button.roomId}`);
            }
            closeDialog();
            break;
        case 'leaveRoom':
            router.push('/squares');
            closeDialog();
            break;
        default:
            closeDialog();
            break;
    }
  };
  
  if (!activeNotification) {
    return null; // Don't render anything if there's no action
  }
  
  const isWarnAction = activeNotification.action?.actionType === 'warn';
  const isSummon = activeNotification.action?.actionType === 'summon';
  
  if (isWarnAction) {
      return (
        <Dialog open={!!activeNotification}>
            <DialogContent 
                className="p-0 bg-transparent border-none shadow-none w-auto" 
                onInteractOutside={(e) => { e.preventDefault() }}
            >
                <WarningView notification={activeNotification} onAcknowledge={() => handleAction({ action: 'close', text: 'ACKNOWLEDGE', variant: 'primary' })} />
            </DialogContent>
        </Dialog>
      )
  }

  const { icon, title, description, buttons, iconClasses, bgClasses } = getDialogContent(activeNotification, closeDialog, users);
  const isIconUrl = typeof icon === 'string' && icon.startsWith('http');

  return (
    <Dialog open={!!activeNotification} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if(isSummon) {e.preventDefault()} }}>
        <DialogHeader className="text-center items-center">
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-full mb-4", bgClasses)}>
                {isIconUrl ? (
                    <Image src={icon as string} alt={title} width={40} height={40} className="rounded-full object-cover" />
                ) : (
                    <span className={cn("text-4xl", iconClasses)}>{icon}</span>
                )}
            </div>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center flex-row gap-2 pt-4">
          {buttons.map((button) => {
            const isDestructive = (activeNotification.action?.actionType === 'ban' || activeNotification.action?.actionType === 'kick') && button.variant === 'primary';
            return (
                <Button
                    key={button.text}
                    onClick={() => handleAction(button)}
                    variant={isDestructive ? 'destructive' : button.variant === 'primary' ? 'default' : 'secondary'}
                    className="w-full"
                >
                    {button.text}
                </Button>
            );
        })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

