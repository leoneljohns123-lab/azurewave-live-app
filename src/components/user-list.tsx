'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faUserShield, faUserFriends, faMars, faVenus, faMusic } from '@fortawesome/free-solid-svg-icons';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { roleIcons } from '@/lib/data';
import { UserAvatar } from './user-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, FriendRequest, UserSquare, Square as SquareType } from '@/lib/types';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { UserProfilePopover } from './user-profile-popover';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { getEffectiveDisplayName, getEffectiveUserRole } from '@/lib/user-helpers';
import { cn } from '@/lib/utils';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { DjPanelDialog } from './dj-panel-dialog';

function UserSection({ title, users, onUserSelect, squareId, isOffline }: { title: string; users: User[]; onUserSelect: (username: string) => void; squareId?: string; isOffline?: boolean; }) {
    if (users.length === 0) return null;

    const renderUserItem = (user: User) => {
        const effectiveRole = getEffectiveUserRole(user, squareId);
        const roleInfo = roleIcons[effectiveRole];
        const effectiveDisplayName = getEffectiveDisplayName(user);

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
            <UserProfilePopover key={user.id} user={user} squareId={squareId}>
                <div className={cn(
                    "flex items-center gap-3 group -mx-2 px-2 py-1 rounded-md transition-all duration-200 cursor-pointer",
                    isOffline ? "opacity-70 hover:opacity-100 hover:bg-accent/50" : "hover:bg-accent"
                )}>
                    <UserAvatar user={user} className="w-10 h-10" />
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                        <p className="font-medium truncate" style={nameStyle}>{effectiveDisplayName}</p>
                        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                            {roleInfo && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            {roleInfo.imageUrl ? (
                                                <Image src={roleInfo.imageUrl} alt={roleInfo.label} width={16} height={16} className="w-4 h-4 object-contain" />
                                            ) : (
                                                <FontAwesomeIcon icon={roleInfo.icon} className={`w-4 h-4 ${roleInfo.color || ''}`} />
                                            )}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{roleInfo.label}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {user.gender && (
                                <FontAwesomeIcon
                                    icon={user.gender === 'male' ? faMars : faVenus}
                                    className={`w-3.5 h-3.5 ${user.gender === 'male' ? 'text-blue-500' : 'text-pink-500'
                                        }`}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </UserProfilePopover>
        );
    };

    return (
        <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h3>
            <div className={cn("space-y-1", isOffline && "bg-muted/30 rounded-lg p-2")}>
                {users.map(renderUserItem)}
            </div>
        </div>
    );
}

function UserList({ onlineUsers, offlineUsers, onUserSelect, squareId, emptyMessage }: { onlineUsers: User[], offlineUsers: User[], onUserSelect: (username: string) => void, squareId?: string, emptyMessage?: string }) {
    return (
        <div className="space-y-4">
            <UserSection title={`Online (${onlineUsers.length})`} users={onlineUsers} onUserSelect={onUserSelect} squareId={squareId} />
            {offlineUsers.length > 0 && <div className="mt-4" />}
            {offlineUsers.length > 0 && <UserSection title={`Offline (${offlineUsers.length})`} users={offlineUsers} onUserSelect={onUserSelect} squareId={squareId} isOffline={true} />}
            {onlineUsers.length === 0 && offlineUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Image src="/interface_icons/nodata.svg" alt="No users" width={64} height={64} className="opacity-70" />
                    <p className="text-sm text-muted-foreground mt-4">{emptyMessage || "No members in this category."}</p>
                </div>
            )}
        </div>
    )
}

export function UserListContent({ onUserSelect, squareId }: { onUserSelect: (username: string) => void, squareId?: string }) {
    const firestore = useFirestore();
    const { user: currentUser } = useUser();
    const [isDjPanelOpen, setIsDjPanelOpen] = useState(false);

    const squareRef = useMemoFirebase(() => squareId ? doc(firestore, 'squares', squareId) : null, [firestore, squareId]);
    const { data: square, isLoading: isSquareLoading } = useDoc<SquareType>(squareRef);

    // Fetch all users once
    const allUsersCollectionRef = useMemoFirebase(
        () => collection(firestore, 'users'),
        [firestore]
    );
    const { data: allUsers, isLoading: isLoadingAllUsers } = useCollection<User>(allUsersCollectionRef);

    // Fetch all active user-square relationships
    const userSquaresCollectionRef = useMemoFirebase(
        () => collection(firestore, 'userSquares'),
        [firestore]
    );
    const { data: allUserSquares, isLoading: isLoadingUserSquares } = useCollection<UserSquare>(userSquaresCollectionRef);

    const { onlineUserIds, onlineUsers } = useMemo(() => {
        if (!allUsers || !allUserSquares || !squareId) return { onlineUserIds: new Set<string>(), onlineUsers: [] };

        const userIdsInSquare = new Set(allUserSquares
            .filter(us => us.squareId === squareId)
            .map(us => us.userId));

        const users = allUsers.filter(user =>
            userIdsInSquare.has(user.id) &&
            (!user.isGhost || user.id === currentUser?.uid) &&
            (user.status !== 'invisible' || user.id === currentUser?.uid)
        );
        return { onlineUserIds: userIdsInSquare, onlineUsers: users };
    }, [allUsers, allUserSquares, squareId, currentUser]);

    // --- Friends List Logic ---
    const friendsQuery1 = useMemoFirebase(() => {
        if (!currentUser) return null;
        return query(
            collection(firestore, 'friendRequests'),
            where('senderId', '==', currentUser.uid),
            where('status', '==', 'accepted')
        );
    }, [firestore, currentUser]);
    const { data: friendsAsSender, isLoading: isLoadingFriends1 } = useCollection<FriendRequest>(friendsQuery1);

    const friendsQuery2 = useMemoFirebase(() => {
        if (!currentUser) return null;
        return query(
            collection(firestore, 'friendRequests'),
            where('receiverId', '==', currentUser.uid),
            where('status', '==', 'accepted')
        );
    }, [firestore, currentUser]);
    const { data: friendsAsReceiver, isLoading: isLoadingFriends2 } = useCollection<FriendRequest>(friendsQuery2);

    const friendIds = useMemo(() => {
        const ids = new Set<string>();
        friendsAsSender?.forEach(req => ids.add(req.receiverId));
        friendsAsReceiver?.forEach(req => ids.add(req.senderId));
        return ids;
    }, [friendsAsSender, friendsAsReceiver]);

    const allFriends = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(u => friendIds.has(u.id));
    }, [allUsers, friendIds]);

    const djUser = useMemo(() => {
        if (!allUsers || !square || !square.djId) return null;
        return allUsers.find(u => u.id === square.djId);
    }, [allUsers, square]);

    const [onlineStaff, offlineStaff] = useMemo(() => {
        if (!allUsers || !square) return [[], []];
        const staffRoles = ['Owner', 'Co-Owner', 'Super Admin', 'Admin', 'Moderator', 'Room Owner', 'Room Admin', 'Room Moderator'];
        const squareMemberIds = new Set(square.memberIds || []);

        const staffInSquare = allUsers.filter(user => {
            const effectiveRole = getEffectiveUserRole(user, squareId);
            return staffRoles.includes(effectiveRole) && squareMemberIds.has(user.id);
        });

        const onlineStaffIds = new Set(onlineUsers.filter(u => staffInSquare.some(s => s.id === u.id)).map(u => u.id));
        const online = staffInSquare.filter(u => onlineStaffIds.has(u.id));
        const offline = staffInSquare.filter(u => !onlineStaffIds.has(u.id));

        return [online, offline];
    }, [allUsers, onlineUsers, square, squareId]);

    const [onlineFriends, offlineFriends] = useMemo(() => {
        if (!allFriends || !square) return [[], []];

        const squareMemberIds = new Set(square.memberIds || []);
        const friendsInSquare = allFriends.filter(u => squareMemberIds.has(u.id));

        const online = friendsInSquare.filter(u => onlineUsers.some(ou => ou.id === u.id));
        const onlineFriendIds = new Set(online.map(u => u.id));
        const offline = friendsInSquare.filter(u => !onlineFriendIds.has(u.id));
        return [online, offline];
    }, [allFriends, onlineUsers, square]);

    const [allOnlineUsers, allOfflineUsers] = useMemo(() => {
        if (!allUsers || !square) return [[], []];
        const botIds = new Set(['superbot', 'gemma', 'quizbot', 'qbot']);
        const bots = allUsers.filter(user => user.role === 'Bot' || botIds.has(user.id));

        const allOnline = [...onlineUsers, ...bots]
            .filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i) // unique
            .sort((a, b) => {
                const roleToSortVal = (role?: string) => {
                    if (role === 'Owner') return -2;
                    if (role === 'Bot') return -1;
                    return 0;
                };

                const aVal = roleToSortVal(a.role);
                const bVal = roleToSortVal(b.role);

                if (aVal !== bVal) {
                    return aVal - bVal;
                }

                return getEffectiveDisplayName(a).localeCompare(getEffectiveDisplayName(b));
            });

        const allOnlineIds = new Set(allOnline.map(u => u.id));
        const squareMemberIds = new Set(square.memberIds || []);

        const offlineMembers = allUsers.filter(user =>
            squareMemberIds.has(user.id) &&
            user.role !== 'Bot' &&
            !allOnlineIds.has(user.id)
        );

        return [allOnline, offlineMembers];
    }, [allUsers, onlineUsers, square]);

    const isLoading = isLoadingAllUsers || isLoadingUserSquares || isSquareLoading;
    const isLoadingFriends = isLoading || isLoadingFriends1 || isLoadingFriends2;


    return (
        <>
            <button
                className="mb-6 w-full text-left focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
                onClick={() => setIsDjPanelOpen(true)}
            >
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-2">ON-AIR DJ</h3>
                {isLoading ? (
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 animate-pulse">
                        <p>Loading...</p>
                    </div>
                ) : djUser && square ? (
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 shadow-lg">
                        <UserAvatar user={djUser} className="w-12 h-12 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{getEffectiveDisplayName(djUser)}</p>
                            <div className="text-xs text-blue-200 flex items-center gap-1.5 min-w-0">
                                <FontAwesomeIcon icon={faMusic} className="h-3 w-3 flex-shrink-0" />
                                <p className="truncate">{square.nowPlaying?.title || '...'}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center text-center p-3 rounded-lg bg-black/20">
                        <p className="text-sm text-muted-foreground">No DJ on air.</p>
                    </div>
                )}
            </button>
            <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all" className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faUsers} />
                        <span>All</span>
                    </TabsTrigger>
                    <TabsTrigger value="friends" className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserFriends} />
                        <span>Friends</span>
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserShield} />
                        <span>Staff</span>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
                    {isLoading ? <p>Loading...</p> : <UserList onlineUsers={allOnlineUsers} offlineUsers={allOfflineUsers} onUserSelect={onUserSelect} squareId={squareId} emptyMessage="No members found." />}
                </TabsContent>
                <TabsContent value="friends" className="mt-4">
                    {isLoadingFriends ? <p>Loading...</p> : <UserList onlineUsers={onlineFriends} offlineUsers={offlineFriends} onUserSelect={onUserSelect} squareId={squareId} emptyMessage="You have no friends." />}
                </TabsContent>
                <TabsContent value="staff" className="mt-4">
                    {isLoading ? <p>Loading...</p> : <UserList onlineUsers={onlineStaff} offlineUsers={offlineStaff} onUserSelect={onUserSelect} squareId={squareId} emptyMessage="No staff members found." />}
                </TabsContent>
            </Tabs>
            {squareId && (
                <DjPanelDialog
                    open={isDjPanelOpen}
                    onOpenChange={setIsDjPanelOpen}
                    square={square || null}
                    djUser={djUser || null}
                    squareId={squareId}
                />
            )}
        </>
    );
}

export function UserListSheet({ onUserSelect, squareId }: { onUserSelect: (username: string) => void, squareId?: string }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (username: string) => {
        onUserSelect(username);
        setOpen(false); // Close sheet on select
    }

    return (
        <Sheet open={open} onOpenChange={setOpen} modal={false}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                    <FontAwesomeIcon icon={faUsers} />
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col p-0 w-[320px] sm:w-[320px]">
                <SheetHeader className="p-6 pb-2 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faUsers} className="w-5 h-5" />
                        Members
                    </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                    <ScrollArea className="h-full">
                        <div className="p-6">
                            <UserListContent onUserSelect={handleSelect} squareId={squareId} />
                        </div>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    );
}
