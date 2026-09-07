
'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faLock, faTrash, faThumbtack, faEllipsisV, faCog, faBookmark, faBolt, faCrown, faShieldAlt, faUserGraduate, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { AppLayout } from '@/components/app-layout';
import { CreateSquareDialog } from '@/components/create-square-dialog';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, getDocs, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Square, User, UserSquare } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SquareCustomizationDialog } from '@/components/square-customization-dialog';
import { getEffectiveDisplayName, getEffectiveUserRole } from '@/lib/user-helpers';
import { useChat } from '@/context/chat-context';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function SquaresPageContent() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { hasPermission } = useChat();

  const { profile: userProfile, isLoading: isUserProfileLoading } = useEffectiveUserProfile();

  const squaresCollectionRef = useMemoFirebase(
    () => collection(firestore, 'squares'),
    [firestore]
  );
  const { data: squares, isLoading, error } = useCollection<Square>(squaresCollectionRef);

  const userSquaresCollectionRef = useMemoFirebase(
    () => collection(firestore, 'userSquares'),
    [firestore]
  );
  const { data: userSquares } = useCollection<UserSquare>(userSquaresCollectionRef);

  const allUsersCollectionRef = useMemoFirebase(
    () => collection(firestore, 'users'),
    [firestore]
  );
  const { data: allUsers, isLoading: isLoadingAllUsers } = useCollection<User>(allUsersCollectionRef);

  const [squareToDelete, setSquareToDelete] = useState<Square | null>(null);
  const [squareToCustomize, setSquareToCustomize] = useState<Square | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<Square | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [kickCooldownInfo, setKickCooldownInfo] = useState<{ open: boolean; timeRemaining: string }>({ open: false, timeRemaining: '' });

  const canCreateSquare = hasPermission(userProfile, 'createSquare');

  const squareUserCounts = useMemo(() => {
    if (!userSquares || !allUsers) {
      return {};
    }
    const ghostUserIds = new Set(allUsers.filter(u => u.isGhost).map(u => u.id));

    const userSets: { [squareId: string]: Set<string> } = {};
    for (const userSquare of userSquares) {
      if (ghostUserIds.has(userSquare.userId)) continue;

      if (!userSets[userSquare.squareId]) {
        userSets[userSquare.squareId] = new Set();
      }
      userSets[userSquare.squareId].add(userSquare.userId);
    }
    const counts: { [squareId: string]: number } = {};
    for (const squareId in userSets) {
      counts[squareId] = userSets[squareId].size;
    }
    return counts;
  }, [userSquares, allUsers]);

  const handleDeleteSquare = async () => {
    if (!squareToDelete || !firestore) return;

    try {
        const messagesCollectionRef = collection(firestore, 'squares', squareToDelete.id, 'messages');
        const messagesSnapshot = await getDocs(messagesCollectionRef);
        const batch = writeBatch(firestore);
        messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const userSquaresQuery = query(collection(firestore, 'userSquares'), where('squareId', '==', squareToDelete.id));
        const userSquaresSnapshot = await getDocs(userSquaresQuery);
        userSquaresSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const squareRef = doc(firestore, 'squares', squareToDelete.id);
        batch.delete(squareRef);

        await batch.commit();
        toast({ title: 'Success', description: 'Square deleted successfully.' });
    } catch (error) {
        console.error("Error deleting Square: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not delete Square."
        });
    } finally {
        setSquareToDelete(null);
    }
  };

  const handleJoinClick = (square: Square) => {
    if (userProfile?.role === 'Owner') {
      router.push(`/squares/${square.id}`);
      return;
    }
    
    if (userProfile?.kickedUntil && new Date(userProfile.kickedUntil).getTime() > Date.now()) {
        const timeRemaining = formatDistanceToNow(new Date(userProfile.kickedUntil), { addSuffix: true });
        setKickCooldownInfo({ open: true, timeRemaining });
        return;
    }

    if (userProfile?.bannedFromSquares?.[square.id] && new Date(userProfile.bannedFromSquares[square.id].until).getTime() > Date.now()) {
      const banInfo = userProfile.bannedFromSquares[square.id];
      const isPermanent = banInfo.until.startsWith('9999');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: `You are ${isPermanent ? 'permanently' : 'temporarily'} banned from this square.`,
      });
      return;
    }
    
    const userRole = userProfile?.role || 'Guest';

    if (square.isMembersOnly && userRole === 'Guest') {
        toast({ 
            variant: "destructive", 
            title: "Members Only",
            description: "You must be a registered user to enter this square." 
        });
        return;
    }
    
    const adminRoles = ['Owner', 'Super Admin', 'Admin'];
    if (square.isAdminOnly && !adminRoles.includes(userRole)) {
        toast({ 
            variant: "destructive", 
            title: "Admins Only",
            description: "This square is restricted to administrators." 
        });
        return;
    }

    const staffRoles = [...adminRoles, 'Moderator', 'Room Owner', 'Room Admin', 'Room Moderator'];
    if (square.isStaffOnly && !staffRoles.includes(userRole)) {
        toast({ 
            variant: "destructive", 
            title: "Staff Only",
            description: "This square is restricted to staff members." 
        });
        return;
    }
    
    const isVip = userProfile && ['Owner', 'Super Admin', 'Admin', 'Super VIP', 'VIP'].includes(userProfile.role || '');
    if (square.isVipOnly && !isVip) {
        toast({ 
            variant: "destructive", 
            title: "VIPs Only",
            description: "This square is restricted to VIP members." 
        });
        return;
    }

    if (square.type !== 'private') {
        router.push(`/squares/${square.id}`);
    } else {
        setPasswordPrompt(square);
    }
  };

  const handlePasswordSubmit = () => {
    if (!passwordPrompt) return;
    if (passwordInput === passwordPrompt.password) {
        router.push(`/squares/${passwordPrompt.id}`);
        setPasswordPrompt(null);
        setPasswordInput('');
    } else {
        toast({
            variant: "destructive",
            title: "Invalid Password",
            description: "The password you entered is incorrect.",
        });
        setPasswordInput('');
    }
  };

  const handlePinSquare = (square: Square) => {
    if (!userProfile || !firestore) return;

    const userRef = doc(firestore, 'users', userProfile.id);
    const isPinned = userProfile.pinnedSquares?.includes(square.id);

    if (isPinned) {
        updateDocumentNonBlocking(userRef, {
            pinnedSquares: arrayRemove(square.id)
        });
        toast({ title: 'Bookmark Removed' });
    } else {
        updateDocumentNonBlocking(userRef, {
            pinnedSquares: arrayUnion(square.id)
        });
        toast({ title: 'Square Bookmarked' });

        const notificationsCollection = collection(firestore, 'users', userProfile.id, 'notifications');
        addDocumentNonBlocking(notificationsCollection, {
            userId: userProfile.id,
            senderId: 'system',
            text: `You bookmarked the square: ${square.name}`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'bookmark',
            context: { squareId: square.id }
        });
    }
  };
  
  const { pinnedSquares, unpinnedSquares } = useMemo(() => {
    if (!squares) return { pinnedSquares: [], unpinnedSquares: [] };

    const pinnedIds = new Set(userProfile?.pinnedSquares || []);
    const pinned: Square[] = [];
    const unpinned: Square[] = [];

    squares.forEach(square => {
        if (pinnedIds.has(square.id)) {
            pinned.push(square);
        } else {
            unpinned.push(square);
        }
    });

    return { pinnedSquares: pinned, unpinnedSquares: unpinned };
  }, [squares, userProfile]);

  const renderSquareCard = (square: Square) => {
    const onlineCount = squareUserCounts[square.id] || 0;
    
    const effectiveRole = userProfile ? getEffectiveUserRole(userProfile, square.id) : null;
    const canManageSquare = effectiveRole && ['Owner', 'Super Admin', 'Admin', 'Room Owner', 'Room Admin', 'Room Moderator'].includes(effectiveRole);
    const canDeleteSquare = userProfile && (square.creatorId === userProfile.id || hasPermission(userProfile, 'deleteAnySquare'));
    const isPinned = userProfile?.pinnedSquares?.includes(square.id);

    const calculateEnergy = (timestamp?: string) => {
        if (!timestamp) return 10;
        const lastMessageTime = new Date(timestamp).getTime();
        const now = Date.now();
        const diffMinutes = (now - lastMessageTime) / (1000 * 60);

        if (diffMinutes < 1) return 100;
        if (diffMinutes < 5) return 80;
        if (diffMinutes < 15) return 60;
        if (diffMinutes < 60) return 40;
        if (diffMinutes < 360) return 20;
        return 10;
    };
    const energy = calculateEnergy(square.lastMessage?.timestamp);

    return (
      <div 
        key={square.id} 
        className="group relative bg-card/40 hover:bg-card/60 border border-white/5 rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 flex flex-col"
      >
        <div className="absolute top-4 right-4 flex gap-2 z-20">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-8 w-8 rounded-full bg-black/20 backdrop-blur-md transition-all duration-200",
                                isPinned ? "text-yellow-400 opacity-100" : "text-white/50 opacity-0 group-hover:opacity-100"
                            )}
                            onClick={(e) => { e.stopPropagation(); handlePinSquare(square); }}
                        >
                            <FontAwesomeIcon icon={faBookmark} className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isPinned ? 'Remove Bookmark' : 'Bookmark Square'}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {(canManageSquare || canDeleteSquare) && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/20 backdrop-blur-md text-white/50 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <FontAwesomeIcon icon={faEllipsisV} className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900/90 backdrop-blur-xl border-white/10 text-white rounded-2xl">
                        <DropdownMenuLabel>Manage Square</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        {canManageSquare && (
                            <DropdownMenuItem onClick={() => setSquareToCustomize(square)}>
                                <FontAwesomeIcon icon={faCog} className="mr-2 h-4 w-4" />
                                Settings
                            </DropdownMenuItem>
                        )}
                        {canDeleteSquare && (
                            <DropdownMenuItem onClick={() => setSquareToDelete(square)} className="text-red-400 focus:text-red-400">
                                <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>

        <div className="relative h-32 w-full overflow-hidden">
            <Image
                src={square.backgroundUrl || square.avatarUrl || `https://picsum.photos/seed/${square.id}/600/300`}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110 opacity-40 blur-[2px]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/40" />
            
            <div className="absolute bottom-0 left-6 translate-y-1/2 z-10">
                <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-4 border-slate-900 shadow-xl">
                    <Image
                        src={square.avatarUrl || `https://picsum.photos/seed/${square.id}/200/200`}
                        alt={square.name}
                        fill
                        className="object-cover"
                    />
                </div>
            </div>
        </div>

        <div className="pt-12 px-6 pb-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">{square.name}</h3>
                    {square.isVerified && (
                        <Image src="/images/verified.gif" alt="Verified" width={16} height={16} className="h-4 w-4" />
                    )}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span className="text-xs font-bold">{onlineCount}</span>
                </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mt-2 min-h-[2.5rem]">
                {square.description}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
                {square.type === 'private' && (
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20 gap-1.5">
                        <FontAwesomeIcon icon={faLock} className="h-3 w-3" /> Locked
                    </Badge>
                )}
                {square.isVipOnly && (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20 gap-1.5">
                        <FontAwesomeIcon icon={faCrown} className="h-3 w-3" /> VIP
                    </Badge>
                )}
                {square.isAdminOnly && (
                    <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20 gap-1.5">
                        <FontAwesomeIcon icon={faShieldAlt} className="h-3 w-3" /> Admin
                    </Badge>
                )}
                {square.isStaffOnly && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1.5">
                        <FontAwesomeIcon icon={faUserGraduate} className="h-3 w-3" /> Staff
                    </Badge>
                )}
            </div>

            <div className="mt-auto pt-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <FontAwesomeIcon icon={faBolt} className={cn("transition-colors duration-300", energy > 50 ? "text-yellow-400" : "text-slate-500")} />
                        <span>Room Energy</span>
                    </div>
                    <span className="text-xs font-bold text-white">{energy}%</span>
                </div>
                <Progress value={energy} className="h-1.5 bg-white/5" />

                <div className="flex items-start gap-3 mt-6">
                    <div className="flex-1 min-w-0 min-h-[32px]">
                        {square.lastMessage ? (
                            <div className="text-[11px] text-muted-foreground leading-tight line-clamp-2 break-words">
                                <span className="text-white font-semibold">@{square.lastMessage.senderName}:</span> {square.lastMessage.content}
                            </div>
                        ) : (
                            <div className="text-[11px] text-muted-foreground italic line-clamp-2">No messages yet...</div>
                        )}
                    </div>
                    <Button 
                        onClick={() => handleJoinClick(square)}
                        className="rounded-full px-6 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                    >
                        Join
                    </Button>
                </div>
            </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading || isUserProfileLoading || isLoadingAllUsers) {
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[400px] w-full rounded-3xl bg-card/20 animate-pulse border border-white/5" />
            ))}
        </div>
      );
    }
    
    if (error) {
       return (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-3xl bg-card/5">
            <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-destructive h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">Failed to load Squares</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">We're having trouble connecting to the network. Please refresh the page.</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-6 rounded-full">Refresh Page</Button>
        </div>
      );
    }

    if (!squares || squares.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-white/10 rounded-3xl bg-card/5">
            <Image src="/interface_icons/nodata.svg" alt="" width={120} height={120} className="opacity-20 mb-6" />
            <h3 className="text-2xl font-bold tracking-tight">Quiet in the neighborhood...</h3>
            <p className="text-muted-foreground mt-2">No Squares have been created yet. Be the first to start a community!</p>
            {canCreateSquare && (
                <div className="mt-8">
                    <CreateSquareDialog />
                </div>
            )}
        </div>
      );
    }

    return (
      <div className="space-y-12">
        {pinnedSquares.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                    <FontAwesomeIcon icon={faBookmark} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Bookmarked Squares</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pinnedSquares.map(renderSquareCard)}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FontAwesomeIcon icon={faUsers} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Explore Communities</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {unpinnedSquares.map(renderSquareCard)}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-slate-950/50">
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Squares</h1>
                <p className="text-lg text-muted-foreground">Welcome back, <span className="text-primary font-bold">@{getEffectiveDisplayName(userProfile)}</span>. Find your space.</p>
            </div>
            {canCreateSquare && (
                <div className="flex-shrink-0">
                    <CreateSquareDialog />
                </div>
            )}
        </header>

        {renderContent()}
      </div>

      <AlertDialog open={!!passwordPrompt} onOpenChange={() => { setPasswordPrompt(null); setPasswordInput(''); }}>
            <AlertDialogContent className="bg-slate-900/90 backdrop-blur-xl border-white/10 rounded-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold">Secret Entrance</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                        The Square <span className="text-white font-bold">"{passwordPrompt?.name}"</span> is private. Please provide the secret key.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter password..."
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                            className="bg-black/20 border-white/10 h-12 rounded-xl"
                        />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordSubmit} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">Enter Square</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      <AlertDialog open={!!squareToDelete} onOpenChange={() => setSquareToDelete(null)}>
            <AlertDialogContent className="bg-slate-900/90 backdrop-blur-xl border-white/10 rounded-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold text-destructive">Deconstruct Square?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                        This will permanently remove <span className="text-white font-bold">"{squareToDelete?.name}"</span> and all its history. This action is irreversible.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full border-white/10 hover:bg-white/5">Keep Square</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteSquare}
                        className="rounded-full bg-destructive hover:bg-destructive/90 text-white font-bold"
                    >
                        Delete Permanently
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={kickCooldownInfo.open} onOpenChange={(open) => !open && setKickCooldownInfo({ open: false, timeRemaining: '' })}>
            <AlertDialogContent className="bg-slate-900/90 backdrop-blur-xl border-white/10 rounded-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold">Access Cooldown</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                        You've been temporarily removed from this sector. You may attempt to re-enter <span className="text-primary font-bold">{kickCooldownInfo.timeRemaining}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setKickCooldownInfo({ open: false, timeRemaining: '' })} className="rounded-full px-8">Acknowledged</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      {squareToCustomize && allUsers && (
        <SquareCustomizationDialog
            open={!!squareToCustomize}
            onOpenChange={(open) => !open && setSquareToCustomize(null)}
            square={squareToCustomize}
            allUsers={allUsers}
        />
      )}
    </div>
  );
}

export default function SquaresPage({ soundState, setSoundState }: any) {
  return (
    <AppLayout 
        soundState={soundState}
        setSoundState={setSoundState}
    >
      <SquaresPageContent />
    </AppLayout>
  );
}
