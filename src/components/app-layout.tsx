
'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { useEffect } from 'react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ModerationListener } from './moderation-listener';
import { ActivityCenterPopover } from './ActivityCenterPopover';
import { MessagesPopover } from './MessagesPopover';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { DMProvider } from '@/contexts/DMProvider';
import { DMCenter } from './dms/DMCenter';
import Image from 'next/image';
import Link from 'next/link';
import { AnnouncementBanner } from './AnnouncementBanner';
import { useChat } from '@/context/chat-context';
import { cn } from '@/lib/utils';
import { ReportsPopover } from './ReportsPopover';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage } from '@fortawesome/free-solid-svg-icons';
import { useNotifications } from '@/hooks/use-notifications';


export function AppLayout({ children, headerContent, soundState, setSoundState }: { children: React.ReactNode, headerContent?: React.ReactNode, soundState?: any, setSoundState?: any }) {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const { profile: userProfile, isLoading: isProfileLoading, isImpersonating, stopImpersonation } = useEffectiveUserProfile();
  const router = useRouter();
  const { isFeedOpen } = useChat();
  const { requestPermission } = useNotifications();

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);
  
  useEffect(() => {
    if (!isAuthLoading && !authUser) {
      router.replace('/login');
    }
  }, [authUser, isAuthLoading, router]);

  if (isAuthLoading || isProfileLoading || !authUser || !userProfile) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <DMProvider>
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="p-2 flex items-center justify-center group-data-[collapsible=icon]:p-0">
               <Link href="/squares" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 relative group-hover:rotate-6 transition-transform">
                      <Image src="/logo.png" alt="Azurewave" fill className="object-contain" />
                  </div>
                  <span className="text-xl font-black font-brand tracking-tight text-white group-data-[collapsible=icon]:hidden uppercaseLine">Azurewave</span>
                </Link>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <MainNav />
          </SidebarContent>
          <SidebarFooter>
            <UserNav soundState={soundState} setSoundState={setSoundState} />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className={cn("transition-all duration-300 ease-in-out w-full min-w-0 overflow-x-hidden h-screen")}>
          <div className="flex flex-col h-full max-h-screen w-full min-w-0 overflow-hidden">
            <AnnouncementBanner />
            <header className="sticky top-0 z-30 flex h-12 w-full items-center justify-between gap-4 border-b bg-card/75 backdrop-blur-sm px-4 shrink-0 lg:px-6">
              <div className="flex flex-1 min-w-0 items-center gap-4">
                <SidebarTrigger className="shrink-0" />
                <Link href="/squares" className="flex items-center gap-2 group shrink-0">
                  <div className="w-8 h-8 relative group-hover:rotate-6 transition-transform">
                      <Image src="/logo.png" alt="Azurewave" fill className="object-contain" />
                  </div>
                  <span className="text-xl font-black font-brand tracking-tight text-white hidden xs:block uppercase">Azurewave</span>
                </Link>
                {headerContent}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 shrink-0">
                  <ReportsPopover />
                  <MessagesPopover soundState={soundState} />
                  <ActivityCenterPopover soundState={soundState} />
                </div>
                <div className="block">
                  <UserNav soundState={soundState} setSoundState={setSoundState} />
                </div>
              </div>
            </header>
            <main className="flex-1 flex min-h-0 relative w-full min-w-0 overflow-x-hidden">
              {children}
            </main>
          </div>
        </SidebarInset>
        {soundState && <ModerationListener soundState={soundState} />}
      </SidebarProvider>
      <DMCenter />
    </DMProvider>
  );
}
