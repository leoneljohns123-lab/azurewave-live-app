
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { UserAvatar } from './user-avatar';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSignOutAlt,
  faLayerGroup,
  faWallet,
  faCog,
  faPalette,
  faComment,
  faVolumeUp,
  faPaintBrush,
  faChevronLeft,
  faTimes,
  faIdCard,
  faStar,
  faCoins,
  faGhost,
  faDoorOpen,
  faUserShield,
  faChevronDown,
  faEdit,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { roleIcons } from '@/lib/data';
import { Separator } from './ui/separator';
import { User } from '@/lib/types';
import Image from 'next/image';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { useUser, useAuth, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { ProfileDialog } from './profile-dialog';
import { Progress } from './ui/progress';
import { ViewProfileDialog } from './view-profile-dialog';
import { UserRatingDialog } from './user-rating-dialog';
import { LevelInfoDialog } from './level-info-dialog';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { getEffectiveDisplayName } from '@/lib/user-helpers';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { UsernameColorDialog } from './username-color-dialog';
import { ChatTextDialog } from './chat-text-dialog';
import { cn } from '@/lib/utils';
import { useChat } from '@/context/chat-context';
import { ChatBackgroundDialog } from './chat-background-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';


export function UserNav({ soundState, setSoundState }: { soundState?: any, setSoundState?: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile: userProfile, isLoading: isProfileLoading, isImpersonating, stopImpersonation } = useEffectiveUserProfile();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission, hasFeaturePermission } = useChat();
  
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [usernameColorDialogOpen, setUsernameColorDialogOpen] = useState(false);
  const [chatTextDialogOpen, setChatTextDialogOpen] = useState(false);
  const [chatBackgroundDialogOpen, setChatBackgroundDialogOpen] = useState(false);
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(false);
  const [levelInfoOpen, setLevelInfoOpen] = useState(false);
  const [popoverView, setPopoverView] = useState('main');
  
  const isMobile = useIsMobile();
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('desktopMode');
      setIsDesktopMode(savedMode === 'true');
    }
  }, []);

  const handleDesktopModeToggle = (checked: boolean) => {
      setIsDesktopMode(checked);
      localStorage.setItem('desktopMode', JSON.stringify(checked));
      
      // Dispatch a custom event so RootLayout can update the body class
      window.dispatchEvent(new Event('desktopModeChanged'));
  };


  const onPopoverOpenChange = (open: boolean) => {
    if (!open) {
      setPopoverView('main');
    }
  };

  const handleLogout = () => {
    if (isImpersonating) {
        stopImpersonation();
    } else {
        auth.signOut().then(() => {
          router.push('/');
        });
    }
  };

  const handleLeaveSquare = () => {
    router.push('/squares');
  };

  const isAuthorizedForGhost = hasFeaturePermission(userProfile, 'useGhostMode');
  const isOwner = userProfile && userProfile.role === 'Owner';
  const canViewAdmin = hasPermission(userProfile, 'viewAnalytics');

  const handleGhostModeToggle = (checked: boolean) => {
    if (!userProfile) return;
    const userRef = doc(firestore, 'users', userProfile.id);
    updateDocumentNonBlocking(userRef, { isGhost: checked });
    toast({
      title: `Ghost Mode ${checked ? 'Enabled' : 'Disabled'}`,
      description: checked ? 'You are now invisible in user lists.' : 'You are now visible again.',
    });
  };

  const handleStatusChange = (newStatus: User['status']) => {
    if (!userProfile) return;
    const userRef = doc(firestore, 'users', userProfile.id);
    updateDocumentNonBlocking(userRef, { status: newStatus });
    toast({
      title: 'Status Updated',
      description: `Your status is now set to ${newStatus}.`,
    });
  };

  if (isProfileLoading || !userProfile) {
    return (
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
    );
  }

  const userRole = userProfile.role || 'Guest';
  const roleInfo = roleIcons[userRole];
  const xpForNextLevel = (userProfile.level || 1) * 100;
  const xpProgress = userProfile.xp ? (userProfile.xp / xpForNextLevel) * 100 : 0;
  const effectiveDisplayName = getEffectiveDisplayName(userProfile);
  const isSquarePage = pathname.startsWith('/squares/');

  const statusOptions = [
    { value: 'online', label: 'Online', icon: '/status_indicators/online.svg' },
    { value: 'away', label: 'Away', icon: '/status_indicators/away.svg' },
    { value: 'busy', label: 'Busy', icon: '/status_indicators/busy.svg' },
    { value: 'invisible', label: 'Invisible', icon: '/status_indicators/invisible.svg' },
    { value: 'working', label: 'Working', icon: '/status_indicators/working.svg' },
    { value: 'angry', label: 'Angry', icon: '/status_indicators/birthday.svg' },
    { value: 'birthday', label: 'Birthday', icon: '/status_indicators/birthday.svg' },
    { value: 'friendly', label: 'Friendly', icon: '/status_indicators/friendly.svg' },
    { value: 'happy', label: 'Happy', icon: '/status_indicators/happy.svg' },
    { value: 'listening_to_music', label: 'Listening to music', icon: '/status_indicators/listening to music.svg' },
    { value: 'sad', label: 'Sad', icon: '/status_indicators/sad.svg' },
    { value: 'watching', label: 'Watching', icon: '/status_indicators/watching.svg' },
  ];
  const currentStatus = statusOptions.find(s => s.value === userProfile.status) || statusOptions[0];


  return (
    <>
      <Popover onOpenChange={onPopoverOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-auto w-auto p-0 rounded-full group-data-[variant=floating]:h-8 group-data-[variant=floating]:w-8"
          >
            <UserAvatar user={userProfile} className="h-10 w-10" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 rounded-xl" align="end" forceMount>
          {popoverView === 'main' && (
            <div className="flex flex-col">
               <div className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <UserAvatar user={userProfile} className="h-10 w-10" />
                        <div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {roleInfo ? (
                                    roleInfo.imageUrl ? (
                                    <Image src={roleInfo.imageUrl} alt={roleInfo.label} width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                                    ) : (
                                    <FontAwesomeIcon icon={roleInfo.icon} className={cn('w-3.5 h-3.5', roleInfo.color)} />
                                    )
                                ) : null}
                                <span>{roleInfo ? roleInfo.label : userRole}</span>
                            </div>
                            <h4 className="font-semibold text-sm">{effectiveDisplayName}</h4>
                            <Button
                                variant="ghost"
                                className="h-auto p-0 text-xs font-normal text-[#D8B4FE] hover:bg-transparent hover:text-white"
                                onClick={() => setProfileDialogOpen(true)}
                            >
                                <FontAwesomeIcon icon={faEdit} className="mr-1 h-3 w-3" />
                                Edit profile
                            </Button>
                        </div>
                    </div>
                    <div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                    {currentStatus.value === 'online' ? (
                                        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                                            <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-white" />
                                        </div>
                                    ) : (
                                        <Image src={currentStatus.icon} alt={currentStatus.label} width={24} height={24} />
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-48">
                                <DropdownMenuLabel>Set your status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {statusOptions.map((option) => (
                                <DropdownMenuItem key={option.value} onSelect={() => handleStatusChange(option.value as any)}>
                                    <Image src={option.icon} alt={option.label} width={16} height={16} className="mr-2 rounded-full" />
                                    <span>{option.label}</span>
                                </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-2">
                <div className="flex justify-between items-baseline text-xs font-medium">
                  <span className="text-white">Level {userProfile.level || 1}</span>
                  <span className="text-muted-foreground">{userProfile.xp || 0} / {xpForNextLevel} XP</span>
                </div>
                <Progress value={xpProgress} className="h-2" />
              </div>
              {isAuthorizedForGhost && (
                <div className="p-2 pt-0">
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-white/10">
                      <Label htmlFor="ghost-mode" className="flex items-center gap-3 font-normal cursor-pointer">
                          <FontAwesomeIcon icon={faGhost} className="h-4 w-4 text-muted-foreground" />
                          Ghost Mode
                      </Label>
                      <Switch id="ghost-mode" checked={!!userProfile.isGhost} onCheckedChange={handleGhostModeToggle} />
                    </div>
                </div>
              )}
              <Separator className="bg-white/20" />
              <div className="p-2">
                {canViewAdmin && (
                    <Button asChild variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white">
                        <Link href="/admin">
                            <FontAwesomeIcon icon={faUserShield} className="mr-3 h-4 w-4 text-muted-foreground" />
                            Admin Panel
                        </Link>
                    </Button>
                )}
                <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={() => setViewProfileOpen(true)}>
                  <FontAwesomeIcon icon={faIdCard} className="mr-3 h-4 w-4 text-muted-foreground" />
                  View Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={() => setRatingsOpen(true)}>
                  <FontAwesomeIcon icon={faStar} className="mr-3 h-4 w-4 text-muted-foreground" />
                  My Ratings
                </Button>
                <Separator className="my-1 bg-white/20" />
                <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={() => setPopoverView('settings')}>
                  <FontAwesomeIcon icon={faCog} className="mr-3 h-4 w-4 text-muted-foreground" />
                  Chat options
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={() => setLevelInfoOpen(true)}>
                  <FontAwesomeIcon icon={faLayerGroup} className="mr-3 h-4 w-4 text-muted-foreground" />
                  Level info
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white">
                          <FontAwesomeIcon icon={faWallet} className="mr-3 h-4 w-4 text-muted-foreground" />
                          Wallet
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4 rounded-xl" side="left" align="start">
                      <h4 className="font-semibold text-sm mb-4">Your Wallet</h4>
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                  <FontAwesomeIcon icon={faCoins} className="h-5 w-5 text-yellow-400" />
                                  <span className="font-medium">Gold</span>
                              </div>
                              <span className="font-bold text-lg">{userProfile.gold ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                  <Image src="/interface_icons/ruby.svg" alt="Ruby" width={20} height={20} />
                                  <span className="font-medium">Rubies</span>
                              </div>
                              <span className="font-bold text-lg">{userProfile.rubies ?? 0}</span>
                          </div>
                      </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Separator className="bg-white/20" />
              <div className="p-2">
                {isSquarePage && (
                  <>
                    <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={handleLeaveSquare}>
                      <FontAwesomeIcon icon={faDoorOpen} className="mr-3 h-4 w-4 text-muted-foreground" />
                      Leave Square
                    </Button>
                    <Separator className="my-1 bg-white/20" />
                  </>
                )}
                <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={handleLogout}>
                  <FontAwesomeIcon icon={faSignOutAlt} className="mr-3 h-4 w-4 text-muted-foreground" />
                  {isImpersonating ? 'Exit Impersonation' : 'Logout'}
                </Button>
              </div>
            </div>
          )}

          {popoverView === 'settings' && (
            <div>
              <div className="flex items-center p-2 border-b border-white/20">
                 <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 hover:text-white" onClick={() => setPopoverView('main')}>
                   <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                 </Button>
                 <h4 className="font-semibold text-sm flex-1 text-center">Settings</h4>
                 <div className="w-8" />
              </div>
              <div className="p-2">
                <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={() => setUsernameColorDialogOpen(true)} disabled={!hasFeaturePermission(userProfile, 'usernameStyle')}>
                    <FontAwesomeIcon icon={faPalette} className="mr-3 h-4 w-4 text-muted-foreground" />
                    Username color
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={() => setChatTextDialogOpen(true)} disabled={!hasFeaturePermission(userProfile, 'chatTextStyle')}>
                    <FontAwesomeIcon icon={faComment} className="mr-3 h-4 w-4 text-muted-foreground" />
                    Chat text
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={() => setChatBackgroundDialogOpen(true)} disabled={!hasFeaturePermission(userProfile, 'chatBackground')}>
                    <FontAwesomeIcon icon={faPaintBrush} className="mr-3 h-4 w-4 text-muted-foreground" />
                    Chat Appearance
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={() => setPopoverView('sounds')}>
                    <FontAwesomeIcon icon={faVolumeUp} className="mr-3 h-4 w-4 text-muted-foreground" />
                    Sounds
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm font-normal hover:bg-white/10 hover:text-white" onClick={() => setPopoverView('layout')}>
                    <FontAwesomeIcon icon={faLayerGroup} className="mr-3 h-4 w-4 text-muted-foreground" />
                    Layout
                </Button>
              </div>
            </div>
          )}
          
          {popoverView === 'sounds' && (
            <div>
              <div className="flex items-center p-2 border-b border-white/20">
                 <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 hover:text-white" onClick={() => setPopoverView('settings')}>
                   <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                 </Button>
                 <h4 className="font-semibold text-sm flex-1 text-center">Sounds</h4>
                 <div className="w-8" />
              </div>
              <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                      <Label htmlFor="chat-sounds">Chat sounds</Label>
                      <Switch id="chat-sounds" checked={soundState?.chatSounds ?? false} onCheckedChange={(checked) => setSoundState?.((prev: any) => ({ ...prev, chatSounds: checked }))} />
                  </div>
                  <div className="flex items-center justify-between">
                      <Label htmlFor="private-sounds">Private sounds</Label>
                      <Switch id="private-sounds" checked={soundState?.privateSounds ?? true} onCheckedChange={(checked) => setSoundState?.((prev: any) => ({ ...prev, privateSounds: checked }))} />
                  </div>
                  <div className="flex items-center justify-between">
                      <Label htmlFor="notification-sounds">Notification sounds</Label>
                      <Switch id="notification-sounds" checked={soundState?.notificationSounds ?? true} onCheckedChange={(checked) => setSoundState?.((prev: any) => ({ ...prev, notificationSounds: checked }))} />
                  </div>
                  <div className="flex items-center justify-between">
                      <Label htmlFor="username-sounds">Username sounds</Label>
                      <Switch id="username-sounds" checked={soundState?.usernameSounds ?? true} onCheckedChange={(checked) => setSoundState?.((prev: any) => ({ ...prev, usernameSounds: checked }))} />
                  </div>
              </div>
            </div>
          )}

          {popoverView === 'layout' && (
            <div>
              <div className="flex items-center p-2 border-b border-white/20">
                 <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 hover:text-white" onClick={() => setPopoverView('settings')}>
                   <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                 </Button>
                 <h4 className="font-semibold text-sm flex-1 text-center">Layout</h4>
                 <div className="w-8" />
              </div>
              <div className="p-4 space-y-4">
                  {isMobile ? (
                      <div className="flex items-center justify-between rounded-lg border p-3">
                          <Label htmlFor="desktop-mode-switch" className="flex flex-col space-y-1">
                            <span>Desktop Mode</span>
                            <span className="text-xs text-muted-foreground font-normal">Simulate 800px width</span>
                          </Label>
                          <Switch
                              id="desktop-mode-switch"
                              checked={isDesktopMode}
                              onCheckedChange={handleDesktopModeToggle}
                          />
                      </div>
                  ) : (
                    <p className="text-sm text-center text-muted-foreground py-4">Layout options are available for mobile devices.</p>
                  )}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
      {userProfile && <ViewProfileDialog open={viewProfileOpen} onOpenChange={setViewProfileOpen} user={userProfile} />}
      {userProfile && <UserRatingDialog open={ratingsOpen} onOpenChange={setRatingsOpen} user={userProfile} />}
      {userProfile && <LevelInfoDialog open={levelInfoOpen} onOpenChange={setLevelInfoOpen} user={userProfile} />}
      <UsernameColorDialog open={usernameColorDialogOpen} onOpenChange={setUsernameColorDialogOpen} />
      <ChatTextDialog open={chatTextDialogOpen} onOpenChange={setChatTextDialogOpen} />
      <ChatBackgroundDialog open={chatBackgroundDialogOpen} onOpenChange={setChatBackgroundDialogOpen} />
    </>
  );
}
