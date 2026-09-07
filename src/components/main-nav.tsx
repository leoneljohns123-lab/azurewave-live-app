
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faRss,
  faNewspaper,
  faMedal,
  faStore,
  faCog,
  faDownload,
  faMobileScreen,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { GamesPopover } from './games/games-popover';
import { LeaderboardsPopover } from './LeaderboardsPopover';
import { FeedSheet } from './feed-sheet';
import { useChat } from '@/context/chat-context';
import { NewsSheet } from './news-sheet';
import { useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Square } from '@/lib/types';
import { SquareCustomizationDialog } from './square-customization-dialog';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function MainNav() {
  const pathname = usePathname();
  const { currentUser, users: allUsers } = useChat();
  const firestore = useFirestore();

  const isSquarePage = pathname.startsWith('/squares/') && pathname.split('/').length === 3;
  const squareId = isSquarePage ? pathname.split('/')[2] : null;

  const squareRef = useMemoFirebase(() => (squareId ? doc(firestore, 'squares', squareId) : null), [firestore, squareId]);
  const { data: square } = useDoc<Square>(squareRef);

  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);

  const isRoomOwner = square && currentUser && (currentUser.id === square.creatorId || currentUser.role === 'Owner');

  const { showInstallButton, hasNativePrompt, triggerNativePrompt } = usePWAInstall();

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      await triggerNativePrompt();
    } else {
      setIsInstallDialogOpen(true);
    }
  };

  const menuItems = [
    {
      href: '/squares',
      label: 'Home',
      icon: faHome,
      isActive: pathname.startsWith('/squares'),
      disabled: false,
    },
  ];

  if (currentUser?.role === 'Owner') {
    menuItems.push({
      href: '/store',
      label: 'Store',
      icon: faStore,
      isActive: pathname === '/store',
      disabled: false,
    });
  }

  return (
    <>
      <SidebarMenu>
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              asChild
              isActive={item.isActive}
              tooltip={item.label}
              disabled={item.disabled}
            >
              <Link href={item.href}>
                <FontAwesomeIcon icon={item.icon} />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        {isSquarePage && isRoomOwner && (
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" onClick={() => setIsCustomizationOpen(true)}>
              <FontAwesomeIcon icon={faCog} />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        <NewsSheet />
        <FeedSheet />
        <GamesPopover />
        <LeaderboardsPopover />
        {showInstallButton && (
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Install App" onClick={handleInstallClick}>
              <FontAwesomeIcon icon={faDownload} />
              <span>Install App</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>

      {/* Fallback install instructions dialog */}
      <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faMobileScreen} className="text-primary" />
              Install Azurewave
            </DialogTitle>
            <DialogDescription>
              Add Azurewave to your home screen for the best experience — fast, full-screen, and always available.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">📱 On iPhone / iPad (Safari)</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Tap the <strong>Share</strong> button (box with arrow at the bottom)</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>Add</strong></li>
              </ol>
            </div>
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">🖥️ On Chrome / Edge (Desktop)</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Look for the <strong>install icon</strong> (⊕) in the address bar</li>
                <li>Click it and select <strong>"Install"</strong></li>
              </ol>
            </div>
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">🤖 On Android (Chrome)</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Tap the <strong>⋮ menu</strong> (top right)</li>
                <li>Tap <strong>"Add to Home screen"</strong></li>
                <li>Tap <strong>Add</strong></li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isCustomizationOpen && square && allUsers && (
        <SquareCustomizationDialog
          open={isCustomizationOpen}
          onOpenChange={setIsCustomizationOpen}
          square={square}
          allUsers={allUsers}
        />
      )}
    </>
  );
}
