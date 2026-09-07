'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from './user-avatar';
import { User, FriendRequest, ModerationAction, Message, Square, Notification } from '@/lib/types';
import { Button } from './ui/button';
import { useUser, useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking, useFirebaseApp } from '@/firebase';
import { collection, query, where, doc, deleteField, getDoc, arrayUnion, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useEffect, useState, useMemo } from 'react';
import { Separator } from './ui/separator';
import Image from 'next/image';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faCommentDots, faUserCheck, faUserClock, faBan, faGavel, faVolumeMute, faRightFromBracket, faUndo, faAddressCard, faStar, faWallet, faGift, faPalette, faSignInAlt, faBullhorn, faUserSecret, faCommentSlash, faUserEdit, faHandSparkles, faChevronDown, faRobot, faCoins, faUserShield, faFlag, faTrash } from '@fortawesome/free-solid-svg-icons';
import { roleIcons } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ViewProfileDialog } from './view-profile-dialog';
import { UserRatingDialog } from './user-rating-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ModerationActionDialog } from './moderation-action-dialog';
import { useImpersonation } from './impersonation-provider';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { ForceSpeakDialog } from './force-speak-dialog';
import { isUserAnonymous, isUserGagged, getEffectiveDisplayName, getEffectiveUserRole } from '@/lib/user-helpers';
import { useDM } from '@/contexts/DMProvider';
import { GiftDialog } from './gift-dialog';
import { ShareCurrencyDialog } from './share-currency-dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProfileDialog } from './profile-dialog';
import { useChat } from '@/context/chat-context';
import { ReportUserDialog } from './ReportUserDialog';
import { WhoisDialog } from './whois-dialog';

export function UserProfilePopover({ user, children, squareId: roomId }: { user: User, children: React.ReactNode, squareId?: string, roomId?: string }) {
    const { user: currentUser } = useUser();
    const firestore = useFirestore();
    const firebaseApp = useFirebaseApp();
    const { toast } = useToast();
    const { openDM } = useDM();
    const { hasPermission } = useChat();
    const [requestStatus, setRequestStatus] = useState<'loading' | 'none' | 'sent' | 'received' | 'friends'>('loading');
    const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
    const [isRatingOpen, setIsRatingOpen] = useState(false);
    const [isGiftOpen, setIsGiftOpen] = useState(false);
    const [isShareCurrencyOpen, setIsShareCurrencyOpen] = useState(false);
    const [isForceSpeakOpen, setIsForceSpeakOpen] = useState(false);
    const [botProfileDialogOpen, setBotProfileDialogOpen] = useState(false);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [isWhoisOpen, setIsWhoisOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [moderationDialogState, setModerationDialogState] = useState<{
        actionType: 'warn' | 'kick' | 'mute' | 'ban' | 'gag' | 'set_temp_nick' | 'go_anonymous' | 'summon' | 'room_ban';
        user: User;
    } | null>(null);

    const { startImpersonation } = useImpersonation();
    const { realProfile } = useEffectiveUserProfile();

    const squareRef = useMemoFirebase(() => roomId ? doc(firestore, 'squares', roomId) : null, [firestore, roomId]);
    const { data: square, isLoading: isRoomLoading } = useDoc<Square>(squareRef);

    const q1 = useMemoFirebase(() => {
        if (!currentUser || !user) return null;
        return query(
            collection(firestore, 'friendRequests'),
            where('senderId', '==', currentUser.uid),
            where('receiverId', '==', user.id)
        );
    }, [currentUser, user, firestore]);
    const { data: sentRequests, isLoading: isSentLoading } = useCollection<FriendRequest>(q1);

    const q2 = useMemoFirebase(() => {
        if (!currentUser || !user) return null;
        return query(
            collection(firestore, 'friendRequests'),
            where('senderId', '==', user.id),
            where('receiverId', '==', currentUser.uid)
        );
    }, [currentUser, user, firestore]);
    const { data: receivedRequests, isLoading: isReceivedLoading } = useCollection<FriendRequest>(q2);

    useEffect(() => {
        if (isSentLoading || isReceivedLoading) {
            setRequestStatus('loading');
            return;
        }

        const allRequests = [...(sentRequests || []), ...(receivedRequests || [])];
        const acceptedRequest = allRequests.find(r => r.status === 'accepted');
        if (acceptedRequest) {
            setRequestStatus('friends');
            return;
        }

        const pendingRequest = allRequests.find(r => r.status === 'pending');
        if (pendingRequest) {
            setRequestStatus(pendingRequest.senderId === currentUser?.uid ? 'sent' : 'received');
            return;
        }

        setRequestStatus('none');
    }, [sentRequests, receivedRequests, currentUser, isSentLoading, isReceivedLoading]);

    const handleAddFriend = () => {
        if (!currentUser) return;
        const friendRequestsCollection = collection(firestore, 'friendRequests');
        addDocumentNonBlocking(friendRequestsCollection, {
            senderId: currentUser.uid,
            receiverId: user.id,
            status: 'pending',
            createdAt: new Date().toISOString(),
        });
        toast({
            title: "Friend Request Sent",
            description: `Your friend request to ${user.displayName} has been sent.`,
        })
    };

    const handleAcceptFriend = () => {
        if (!receivedRequests) return;
        const request = receivedRequests.find(r => r.status === 'pending');
        if (request) {
            const requestRef = doc(firestore, 'friendRequests', request.id);
            updateDocumentNonBlocking(requestRef, { status: 'accepted' });
            toast({
                title: "Friend Added",
                description: `You are now friends with ${user.displayName}.`,
            });
        }
    }

    const renderFriendButton = () => {
        if (!currentUser || currentUser.uid === user.id) {
            return null;
        }

        switch (requestStatus) {
            case 'friends':
                return <Button variant="secondary" size="sm" disabled className="w-full"><FontAwesomeIcon icon={faUserCheck} className="mr-2" /> Friends</Button>;
            case 'sent':
                return <Button variant="secondary" size="sm" disabled className="w-full"><FontAwesomeIcon icon={faUserClock} className="mr-2" /> Request Sent</Button>;
            case 'received':
                return <Button onClick={handleAcceptFriend} size="sm" className="w-full">Accept Request</Button>;
            case 'none':
                return <Button onClick={handleAddFriend} size="sm" className="w-full"><FontAwesomeIcon icon={faUserPlus} className="mr-2" /> Add Friend</Button>;
            default:
                return <Button disabled size="sm" className="w-full">Loading...</Button>;
        }
    };

    const isSelf = currentUser && currentUser.uid === user.id;

    const handleLoginAs = () => {
        if (realProfile) {
            startImpersonation(user, realProfile);
        }
    };

    const handleDeleteUser = async () => {
        if (!firebaseApp || !user) return;

        const functions = getFunctions(firebaseApp);
        const deleteUserFunction = httpsCallable(functions, 'deleteUser');

        try {
            await deleteUserFunction({ userId: user.id });
            toast({
                title: 'User Deleted',
                description: `${getEffectiveDisplayName(user)} has been permanently deleted.`,
            });
        } catch (error: any) {
            console.error("Error deleting user:", error);
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: error.message,
            });
        } finally {
            setIsDeleteConfirmOpen(false);
        }
    };

    const handleForceSpeak = (message: string) => {
        if (!currentUser || !realProfile || !roomId) return;

        const messagesCollection = collection(firestore, 'squares', roomId, 'messages');

        const messageData: Omit<Message, 'id'> = {
            squareId: roomId,
            senderId: user.id,
            content: message,
            timestamp: new Date().toISOString(),
            messageType: 'user',
            forcedBy: {
                id: realProfile.id,
                displayName: realProfile.displayName,
            }
        };

        addDocumentNonBlocking(messagesCollection, messageData);

        toast({
            title: "Message Sent!",
            description: `${user.displayName} has been forced to speak.`,
        });
    };

    const isBanned = !!user.mutedUntil && user.mutedUntil.startsWith('9999');
    const isMuted = !!user.mutedUntil && !isBanned && new Date(user.mutedUntil).getTime() > Date.now();
    const isKicked = user.kickedUntil && new Date(user.kickedUntil).getTime() > Date.now();
    const isGagged = isUserGagged(user);
    const isAnonymous = isUserAnonymous(user);
    const hasTempNick = !!user.temporaryNickname && !!user.tempNickUntil && new Date(user.tempNickUntil).getTime() > Date.now();


    const xpForNextLevel = (user.level || 1) * 100;
    const xpProgress = user.xp ? (user.xp / xpForNextLevel) * 100 : 0;
    const effectiveRole = getEffectiveUserRole(user, roomId);
    const roleInfo = roleIcons[effectiveRole];


    const handleConfirmModeration = async ({ reason, duration, text }: { reason: string; duration?: number; text?: string }) => {
        if (!currentUser || !realProfile || !moderationDialogState) return;
        const { actionType, user } = moderationDialogState;

        const userToUpdateRef = doc(firestore, 'users', user.id);
        let actionText: string = actionType;

        if (actionType === 'warn') {
            const newWarning = {
                moderatorId: realProfile.id,
                reason: reason || 'No reason provided.',
                createdAt: new Date().toISOString(),
            };
            await updateDoc(userToUpdateRef, { warnings: arrayUnion(newWarning) });

            const updatedUserDoc = await getDoc(userToUpdateRef);
            if (updatedUserDoc.exists()) {
                const updatedUserData = updatedUserDoc.data() as User;
                const warningCount = updatedUserData.warnings?.length || 0;

                if (warningCount >= 3) {
                    const muteDurationMinutes = 60;
                    const muteExpiresAt = new Date(Date.now() + muteDurationMinutes * 60 * 1000).toISOString();
                    await updateDoc(userToUpdateRef, { mutedUntil: muteExpiresAt });

                    const autoMuteAction: Omit<ModerationAction, 'id'> = {
                        moderatorId: 'system',
                        userId: user.id,
                        actionType: 'mute',
                        reason: `Automatic mute after ${warningCount} warnings.`,
                        duration: muteDurationMinutes,
                        createdAt: new Date().toISOString(),
                    };

                    const moderationActionsCollection = collection(firestore, 'moderationActions');
                    addDocumentNonBlocking(moderationActionsCollection, autoMuteAction).then(autoMuteActionRef => {
                        if (!autoMuteActionRef) return;
                        const notificationsCollection = collection(firestore, 'users', user.id, 'notifications');
                        addDocumentNonBlocking(notificationsCollection, {
                            userId: user.id,
                            senderId: 'system',
                            text: `You have been automatically muted for ${muteDurationMinutes} minutes for receiving ${warningCount} warnings.`,
                            timestamp: new Date().toISOString(),
                            read: false,
                            type: 'moderation',
                            action: { ...autoMuteAction, id: autoMuteActionRef.id }
                        });
                    });

                    toast({
                        variant: 'destructive',
                        title: 'User Auto-Muted',
                        description: `${getEffectiveDisplayName(user)} has been muted for ${muteDurationMinutes} minutes after receiving ${warningCount} warnings.`
                    });
                }
            }
        } else {
            let updateData: any = {};
            let expiresAt: string | undefined;
            if (duration) {
                expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
            }

            switch (actionType) {
                case 'kick':
                    const kickDuration = duration || 1; // 1 minute cooldown
                    updateData = { kickedUntil: new Date(Date.now() + kickDuration * 60 * 1000).toISOString() };
                    break;
                case 'mute':
                case 'ban':
                    updateData = { mutedUntil: (actionType === 'ban' || !duration) ? '9999-12-31T23:59:59Z' : expiresAt };
                    break;
                case 'gag':
                    updateData = { gaggedUntil: expiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString() };
                    break;
                case 'set_temp_nick':
                    if (!text) { toast({ variant: 'destructive', title: "Nickname required." }); return; }
                    updateData = { temporaryNickname: text, tempNickUntil: expiresAt || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() };
                    actionText = `set temporary nickname for`;
                    break;
                case 'go_anonymous':
                    updateData = { anonymousUntil: expiresAt || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() };
                    actionText = `made anonymous`;
                    break;
                case 'summon':
                    break;
            }

            if (Object.keys(updateData).length > 0) {
                updateDocumentNonBlocking(userToUpdateRef, updateData);
            }
        }

        const moderationActionData: Omit<ModerationAction, 'id'> = {
            moderatorId: currentUser.uid,
            userId: user.id,
            actionType: actionType,
            reason: reason || 'No reason provided.',
            createdAt: new Date().toISOString(),
            ...(duration && { duration }),
        };

        const moderationActionsCollection = collection(firestore, 'moderationActions');
        addDocumentNonBlocking(moderationActionsCollection, moderationActionData)
            .then(moderationActionRef => {
                if (!moderationActionRef) return;

                const isSilentAction = actionType === 'set_temp_nick' || actionType === 'go_anonymous';

                if (roomId && !isSilentAction) {
                    const messagesCollection = collection(firestore, 'squares', roomId, 'messages');
                    let logContent = `${getEffectiveDisplayName(realProfile)} ${actionText} ${getEffectiveDisplayName(user)}. Reason: ${reason}`;
                    addDocumentNonBlocking(messagesCollection, {
                        squareId: roomId,
                        senderId: currentUser.uid,
                        content: logContent,
                        timestamp: new Date().toISOString(),
                        messageType: 'moderation_log',
                    });
                }

                const notificationText = `You have been ${actionType}ed by ${getEffectiveDisplayName(realProfile)}. Reason: ${reason}`;
                const notificationsCollection = collection(firestore, 'users', user.id, 'notifications');
                addDocumentNonBlocking(notificationsCollection, {
                    userId: user.id,
                    senderId: 'system',
                    text: notificationText,
                    timestamp: new Date().toISOString(),
                    read: false,
                    type: 'moderation',
                    action: { ...moderationActionData, id: moderationActionRef.id }
                });
            });

        toast({ title: "Action Successful", description: `${getEffectiveDisplayName(user)} has been ${actionType}ed.` });
    };

    const handleUndoAction = (actionType: 'mute' | 'ban' | 'kick' | 'gag' | 'set_temp_nick' | 'go_anonymous') => {
        if (!currentUser || !realProfile) return;

        const userToUpdateRef = doc(firestore, 'users', user.id);

        let fieldToClear: { [key: string]: any } = {};
        let actionText = '';

        switch (actionType) {
            case 'kick':
                fieldToClear = { kickedUntil: deleteField() };
                actionText = 'unkicked';
                break;
            case 'mute':
            case 'ban':
                fieldToClear = { mutedUntil: deleteField() };
                actionText = actionType === 'mute' ? 'unmuted' : 'unbanned';
                break;
            case 'gag':
                fieldToClear = { gaggedUntil: deleteField() };
                actionText = 'ungagged';
                break;
            case 'set_temp_nick':
                fieldToClear = { temporaryNickname: deleteField(), tempNickUntil: deleteField() };
                actionText = 'removed temporary nickname for';
                break;
            case 'go_anonymous':
                fieldToClear = { anonymousUntil: deleteField() };
                actionText = 'removed anonymous mode for';
                break;
        }

        updateDocumentNonBlocking(userToUpdateRef, fieldToClear);

        const isSilentAction = actionType === 'set_temp_nick' || actionType === 'go_anonymous';

        if (roomId && !isSilentAction) {
            const messagesCollection = collection(firestore, 'squares', roomId, 'messages');
            const logContent = `${getEffectiveDisplayName(realProfile)} ${actionText} ${getEffectiveDisplayName(user)}.`;
            addDocumentNonBlocking(messagesCollection, {
                squareId: currentUser.uid,
                senderId: currentUser.uid,
                content: logContent,
                timestamp: new Date().toISOString(),
                messageType: 'moderation_log',
            });
        }

        const notificationText = `The restriction on your account has been removed by ${getEffectiveDisplayName(realProfile)}.`;
        const notificationsCollection = collection(firestore, 'users', user.id, 'notifications');
        addDocumentNonBlocking(notificationsCollection, {
            userId: user.id,
            senderId: 'system',
            text: notificationText,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'moderation',
        });
        toast({ title: "Action Undone", description: `${getEffectiveDisplayName(user)} has been ${actionText}.` });
    };

    const handleSummon = () => {
        if (!currentUser || !realProfile || !user || !roomId) return;

        const roomRef = doc(firestore, 'squares', roomId);
        getDoc(roomRef).then(roomSnap => {
            if (!roomSnap.exists()) return;
            const roomData = roomSnap.data();

            // 1. Create the moderation action document
            const moderationActionData = {
                moderatorId: currentUser.uid,
                userId: user.id,
                actionType: 'summon' as const,
                reason: `Summoned to ${roomData.name}`,
                createdAt: new Date().toISOString(),
            };

            const moderationActionsCollection = collection(firestore, 'moderationActions');
            const moderationActionPromise = addDocumentNonBlocking(moderationActionsCollection, moderationActionData);

            moderationActionPromise.then(moderationActionRef => {
                if (!moderationActionRef) return;

                // 2. Create the notification with a reference to the action
                const notificationsCollection = collection(firestore, 'users', user.id, 'notifications');
                const notificationText = `${getEffectiveDisplayName(realProfile)} has summoned you to the room: ${roomData.name}.`;

                addDocumentNonBlocking(notificationsCollection, {
                    userId: user.id,
                    senderId: currentUser.uid,
                    text: notificationText,
                    timestamp: new Date().toISOString(),
                    read: false,
                    type: 'moderation', // Use 'moderation' type for consistency
                    action: { ...moderationActionData, id: moderationActionRef.id },
                    summonDetails: {
                        roomId: roomId,
                        roomName: roomData.name,
                        summonerName: getEffectiveDisplayName(realProfile),
                    }
                });
            });

            toast({ title: "User Summoned!", description: `${getEffectiveDisplayName(user)} has been summoned to this room.` });
        });
    };

    const handleSetRoomRole = (newRole: string) => {
        if (!realProfile || !user || !roomId) return;

        const targetUserRef = doc(firestore, 'users', user.id);

        const roomRolePath = `squareRoles.${roomId}`;
        const updates: { [key: string]: any } = {};

        if (['Room Owner', 'Room Admin', 'Room Moderator'].includes(newRole)) {
            updates[roomRolePath] = newRole;
        } else {
            // Assume any other role (like 'User') means demotion/removal of room-specific role
            updates[roomRolePath] = deleteField();
        }

        updateDocumentNonBlocking(targetUserRef, updates);

        const logContent = newRole === 'User'
            ? `${getEffectiveDisplayName(realProfile)} removed ${getEffectiveDisplayName(user)}'s room-specific role.`
            : `${getEffectiveDisplayName(realProfile)} set ${getEffectiveDisplayName(user)}'s role to ${newRole}.`;

        if (roomId) {
            const messagesCollection = collection(firestore, 'squares', roomId, 'messages');
            addDocumentNonBlocking(messagesCollection, {
                squareId: roomId,
                senderId: realProfile.id,
                content: logContent,
                timestamp: new Date().toISOString(),
                messageType: 'moderation_log',
            });
        }

        toast({
            title: "Role Updated",
            description: `${getEffectiveDisplayName(user)}'s role in this room is now ${newRole}.`
        });
    };

    const handleSetGlobalRole = (newRole: string) => {
        if (!hasPermission(realProfile, 'setGlobalRole')) {
            toast({
                variant: 'destructive',
                title: 'Permission Denied',
                description: 'You do not have permission to change global roles.',
            });
            return;
        }
        if (user.id === realProfile?.id) {
            toast({
                variant: 'destructive',
                title: 'Action Not Allowed',
                description: 'You cannot change your own role.',
            });
            return;
        }

        const targetUserRef = doc(firestore, 'users', user.id);
        updateDocumentNonBlocking(targetUserRef, { role: newRole });

        const logContent = `${getEffectiveDisplayName(realProfile)} set ${getEffectiveDisplayName(user)}'s global role to ${newRole}.`;
        if (roomId) {
            const messagesCollection = collection(firestore, 'squares', roomId, 'messages');
            addDocumentNonBlocking(messagesCollection, {
                squareId: realProfile?.id,
                senderId: realProfile?.id,
                content: logContent,
                timestamp: new Date().toISOString(),
                messageType: 'moderation_log',
            });
        }

        const notificationsCollection = collection(firestore, 'users', user.id, 'notifications');
        let notificationType: Notification['type'] = 'moderation';
        if (newRole === 'VIP' || newRole === 'Super VIP') {
            notificationType = 'rank_to_vip';
        }
        addDocumentNonBlocking(notificationsCollection, {
            userId: user.id,
            senderId: 'system',
            text: `Your global role has been changed to ${newRole} by an administrator.`,
            timestamp: new Date().toISOString(),
            read: false,
            type: notificationType,
        });

        toast({
            title: "Global Role Updated",
            description: `${getEffectiveDisplayName(user)}'s role is now ${newRole}.`
        });
    };

    const handleMessageUser = () => {
        if (!isSelf) {
            openDM(user);
        }
    };

    const isBotProfile = user.id === 'superbot' || user.id === 'quizbot';
    const canToggleBot = realProfile?.role === 'Owner';
    const canEditBot = realProfile?.role === 'Owner';

    const handleBotToggle = (checked: boolean) => {
        if (!user || !isBotProfile) return;
        const botRef = doc(firestore, 'users', user.id);
        updateDocumentNonBlocking(botRef, { isEnabled: checked });
        toast({
            title: `${user.displayName} ${checked ? 'Enabled' : 'Disabled'}`,
        });
    };

    const nameStyle: React.CSSProperties = {};
    if (user.nameFont) {
        nameStyle.fontFamily = `'${user.nameFont}', sans-serif`;
    }
    if (user.nameStyle === 'color' && user.nameColor) {
        nameStyle.color = user.nameColor;
    } else if (user.nameStyle === 'neon' && user.nameColor) {
        nameStyle.color = '#fff';
        nameStyle.textShadow = `0 0 4px #fff, 0 0 8px ${user.nameColor}, 0 0 12px ${user.nameColor}`;
    } else if (user.nameStyle === 'gradient' && user.nameColor) {
        nameStyle.background = `linear-gradient(to right, ${user.nameColor}, #FFC107)`;
        nameStyle.WebkitBackgroundClip = 'text';
        nameStyle.backgroundClip = 'text';
        nameStyle.color = 'transparent';
    }

    return (
        <>
            <Popover>
                <PopoverTrigger asChild>{children}</PopoverTrigger>
                <PopoverContent className="w-80 p-0 rounded-xl overflow-hidden shadow-2xl" align="start">
                    <div className="relative">
                        <div className="relative h-24 bg-secondary">
                            <Image src={user.banner || `https://picsum.photos/seed/${user.id}banner/400/100`} alt="Profile banner" layout="fill" objectFit="cover" />
                        </div>
                        <div className="absolute top-16 left-4">
                            <UserAvatar user={user} className="h-16 w-16 border-4 border-card" />
                        </div>
                    </div>
                    <div className="pt-10 px-4 pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-lg font-bold" style={nameStyle}>{user.displayName}</h4>
                                {roleInfo && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        {roleInfo.imageUrl ? (
                                            <Image src={roleInfo.imageUrl} alt={roleInfo.label} width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                                        ) : (
                                            <FontAwesomeIcon icon={roleInfo.icon} className={cn('w-3.5 h-3.5', roleInfo.color)} />
                                        )}
                                        <span>{roleInfo.label}</span>
                                    </div>
                                )}
                            </div>
                            {isBanned && <Badge variant="destructive">BANNED</Badge>}
                            {isMuted && !isBanned && <Badge variant="destructive">MUTED</Badge>}
                            {isKicked && <Badge variant="destructive">KICKED</Badge>}
                        </div>

                        {user.about && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{user.about}</p>}
                    </div>
                    <div className="px-4 pb-4">
                        <div className="flex justify-between items-baseline text-xs font-medium mb-1">
                            <span className="text-foreground">Level {user.level || 1}</span>
                            <span className="text-muted-foreground">{user.xp || 0} / {xpForNextLevel} XP</span>
                        </div>
                        <Progress value={xpProgress} className="h-2" />
                    </div>

                    <Separator />

                    <div className="p-2 space-y-1">
                        {isSelf ? (
                            <Button variant="outline" className="w-full" onClick={() => setIsViewProfileOpen(true)}>
                                <FontAwesomeIcon icon={faAddressCard} className="mr-2" /> View My Profile
                            </Button>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" variant="outline" onClick={() => setIsViewProfileOpen(true)}><FontAwesomeIcon icon={faAddressCard} className="mr-2" /> View Profile</Button>
                                {renderFriendButton()}
                                <Button size="sm" variant="outline" onClick={handleMessageUser}><FontAwesomeIcon icon={faCommentDots} className="mr-2" /> Message</Button>
                                <Button size="sm" variant="outline" onClick={() => setIsRatingOpen(true)}><FontAwesomeIcon icon={faStar} className="mr-2" /> Rate User</Button>
                            </div>
                        )}
                    </div>

                    {!isSelf && (
                        <>
                            <Separator />
                            <div className="p-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="secondary" className="w-full">
                                            Actions
                                            <FontAwesomeIcon icon={faChevronDown} className="ml-2 h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" align="end">
                                        <DropdownMenuItem onSelect={() => setIsGiftOpen(true)}>
                                            <FontAwesomeIcon icon={faGift} className="mr-2 h-4 w-4" /> Send Gift
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setIsShareCurrencyOpen(true)}>
                                            <FontAwesomeIcon icon={faCoins} className="mr-2 h-4 w-4" /> Share Currency
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => setIsReportDialogOpen(true)} className="text-red-400 focus:text-red-300">
                                            <FontAwesomeIcon icon={faFlag} className="mr-2 h-4 w-4" /> Report User
                                        </DropdownMenuItem>


                                        {(hasPermission(realProfile, 'warnUser') || hasPermission(realProfile, 'kickUser') || hasPermission(realProfile, 'muteUser') || hasPermission(realProfile, 'banUser')) && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel>Moderation</DropdownMenuLabel>
                                                <DropdownMenuGroup>
                                                    {hasPermission(realProfile, 'warnUser') && <DropdownMenuItem onSelect={() => setModerationDialogState({ actionType: 'warn', user })}><FontAwesomeIcon icon={faGavel} className="mr-2 h-4 w-4" /> Warn</DropdownMenuItem>}
                                                    {hasPermission(realProfile, 'kickUser') && (isKicked ? (
                                                        <DropdownMenuItem onSelect={() => handleUndoAction('kick')}><FontAwesomeIcon icon={faUndo} className="mr-2 h-4 w-4" /> Unkick</DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onSelect={() => setModerationDialogState({ actionType: 'kick', user })}><FontAwesomeIcon icon={faRightFromBracket} className="mr-2 h-4 w-4" /> Kick</DropdownMenuItem>
                                                    ))}
                                                    {hasPermission(realProfile, 'muteUser') && (isMuted && !isBanned ? (
                                                        <DropdownMenuItem onSelect={() => handleUndoAction('mute')}><FontAwesomeIcon icon={faUndo} className="mr-2 h-4 w-4" /> Unmute</DropdownMenuItem>
                                                    ) : !isBanned ? (
                                                        <DropdownMenuItem onSelect={() => setModerationDialogState({ actionType: 'mute', user })}><FontAwesomeIcon icon={faVolumeMute} className="mr-2 h-4 w-4" /> Mute</DropdownMenuItem>
                                                    ) : null)}
                                                    {hasPermission(realProfile, 'banUser') && (isBanned ? (
                                                        <DropdownMenuItem onSelect={() => handleUndoAction('ban')} className="text-red-500 focus:text-red-500"><FontAwesomeIcon icon={faUndo} className="mr-2 h-4 w-4" /> Unban</DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onSelect={() => setModerationDialogState({ actionType: 'ban', user })} className="text-red-500 focus:text-red-500"><FontAwesomeIcon icon={faBan} className="mr-2 h-4 w-4" /> Ban</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuGroup>
                                            </>
                                        )}

                                        {(hasPermission(realProfile, 'setTempNick') || hasPermission(realProfile, 'gagUser') || hasPermission(realProfile, 'makeAnonymous') || hasPermission(realProfile, 'forceSpeak') || hasPermission(realProfile, 'viewWhois')) && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel>Power Actions</DropdownMenuLabel>
                                                <DropdownMenuGroup>
                                                    {hasPermission(realProfile, 'viewWhois') && <DropdownMenuItem onSelect={() => setIsWhoisOpen(true)}><FontAwesomeIcon icon={faAddressCard} className="mr-2 h-4 w-4" /> Whois</DropdownMenuItem>}
                                                    {hasPermission(realProfile, 'forceSpeak') && <DropdownMenuItem onSelect={() => setIsForceSpeakOpen(true)}><FontAwesomeIcon icon={faBullhorn} className="mr-2 h-4 w-4" /> Force Speak</DropdownMenuItem>}
                                                    {hasPermission(realProfile, 'gagUser') && (isGagged ? (
                                                        <DropdownMenuItem onSelect={() => handleUndoAction('gag')}><FontAwesomeIcon icon={faUndo} className="mr-2 h-4 w-4" /> Un-Gag</DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onSelect={() => setModerationDialogState({ actionType: 'gag', user })}><FontAwesomeIcon icon={faCommentSlash} className="mr-2 h-4 w-4" /> Gag</DropdownMenuItem>
                                                    ))}
                                                    {hasPermission(realProfile, 'setTempNick') && (hasTempNick ? (
                                                        <DropdownMenuItem onSelect={() => handleUndoAction('set_temp_nick')}><FontAwesomeIcon icon={faUndo} className="mr-2 h-4 w-4" /> Remove Nick</DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onSelect={() => setModerationDialogState({ actionType: 'set_temp_nick', user })}><FontAwesomeIcon icon={faUserEdit} className="mr-2 h-4 w-4" /> Set Nick</DropdownMenuItem>
                                                    ))}
                                                    {hasPermission(realProfile, 'makeAnonymous') && (isAnonymous ? (
                                                        <DropdownMenuItem onSelect={() => handleUndoAction('go_anonymous')}><FontAwesomeIcon icon={faUndo} className="mr-2 h-4 w-4" /> Remove Anon</DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onSelect={() => setModerationDialogState({ actionType: 'go_anonymous', user })}><FontAwesomeIcon icon={faUserSecret} className="mr-2 h-4 w-4" /> Make Anon</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuGroup>
                                            </>
                                        )}

                                        {hasPermission(realProfile, 'setGlobalRole') && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <FontAwesomeIcon icon={faUserShield} className="mr-2 h-4 w-4" />
                                                        <span>Set Global Role</span>
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuPortal>
                                                        <DropdownMenuSubContent>
                                                            {['Owner', 'Co-Owner', 'Super Admin', 'Admin', 'Moderator', 'Super VIP', 'VIP', 'User', 'Guest'].map(role => (
                                                                <DropdownMenuItem
                                                                    key={role}
                                                                    disabled={user.role === role}
                                                                    onSelect={() => handleSetGlobalRole(role)}
                                                                >
                                                                    {role}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuPortal>
                                                </DropdownMenuSub>
                                            </>
                                        )}

                                        {hasPermission(realProfile, 'summonUser') && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={handleSummon}>
                                                    <FontAwesomeIcon icon={faHandSparkles} className="mr-2 h-4 w-4" /> Summon to Room
                                                </DropdownMenuItem>
                                            </>
                                        )}

                                        {hasPermission(realProfile, 'loginAsUser') && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={handleLoginAs} className="text-amber-600 focus:text-amber-600">
                                                    <FontAwesomeIcon icon={faSignInAlt} className="mr-2 h-4 w-4" /> Login as User
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {realProfile?.role === 'Owner' && !isSelf && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => setIsDeleteConfirmOpen(true)} className="text-red-400 focus:text-red-300">
                                                    <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" />
                                                    Delete User
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </>
                    )}

                    {isBotProfile && (
                        <>
                            <Separator />
                            <div className="p-2 space-y-2">
                                {canToggleBot && (
                                    <div className="flex items-center justify-between px-2 py-1 rounded-md">
                                        <Label htmlFor="bot-enabled-switch" className="flex items-center gap-3 font-normal cursor-pointer">
                                            <FontAwesomeIcon icon={faRobot} className="h-4 w-4 text-muted-foreground" />
                                            {`${user.displayName} Enabled`}
                                        </Label>
                                        <Switch
                                            id="bot-enabled-switch"
                                            checked={user.isEnabled ?? true}
                                            onCheckedChange={handleBotToggle}
                                        />
                                    </div>
                                )}
                                {canEditBot && (
                                    <Button variant="outline" className="w-full" onClick={() => setBotProfileDialogOpen(true)}>
                                        <FontAwesomeIcon icon={faUserEdit} className="mr-2" /> Edit Profile
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </PopoverContent>
            </Popover>
            <ViewProfileDialog open={isViewProfileOpen} onOpenChange={setIsViewProfileOpen} user={user} />
            <UserRatingDialog open={isRatingOpen} onOpenChange={setIsRatingOpen} user={user} />
            {roomId && <GiftDialog open={isGiftOpen} onOpenChange={setIsGiftOpen} recipient={user} roomId={roomId} />}
            {roomId && <ShareCurrencyDialog open={isShareCurrencyOpen} onOpenChange={setIsShareCurrencyOpen} recipient={user} roomId={roomId} />}
            {isForceSpeakOpen && (
                <ForceSpeakDialog
                    isOpen={isForceSpeakOpen}
                    onOpenChange={setIsForceSpeakOpen}
                    targetUser={user}
                    onConfirm={handleForceSpeak}
                />
            )}
            {moderationDialogState && (
                <ModerationActionDialog
                    isOpen={!!moderationDialogState}
                    onOpenChange={(isOpen) => !isOpen && setModerationDialogState(null)}
                    actionType={moderationDialogState.actionType as any}
                    user={moderationDialogState.user}
                    onConfirm={handleConfirmModeration}
                />
            )}
            <ReportUserDialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} recipient={user} />
            {botProfileDialogOpen && (
                <ProfileDialog open={botProfileDialogOpen} onOpenChange={setBotProfileDialogOpen} userToEdit={user} />
            )}
            <WhoisDialog open={isWhoisOpen} onOpenChange={setIsWhoisOpen} user={user} roomId={roomId} />
            {isDeleteConfirmOpen && (
                <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the user {getEffectiveDisplayName(user)} and all of their data from Authentication and Firestore. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteUser}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete User
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
