'use client';

import React, { useState, useEffect } from 'react';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ImpersonationProvider } from '@/components/impersonation-provider';
import { cn } from '@/lib/utils';
import { DevToolsDetector } from '@/components/dev-tools-detector';
import { ChatProvider } from '@/context/chat-context';
import { ThemeInitializer } from '@/components/ThemeInitializer';
import { MaintenanceWrapper } from '@/components/maintenance-wrapper';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [soundState, setSoundState] = useState({
    chatSounds: true,
    privateSounds: true,
    notificationSounds: true,
    usernameSounds: true,
    callSounds: true,
  });

  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Safely check for desktop mode setting on the client
    const savedMode = localStorage.getItem('desktopMode');
    if (savedMode === 'true') {
      setIsDesktopMode(true);
    }

    // Listen for storage changes from other components (like UserNav)
    const handleStorageChange = () => {
      const mode = localStorage.getItem('desktopMode');
      setIsDesktopMode(mode === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-window updates
    window.addEventListener('desktopModeChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('desktopModeChanged', handleStorageChange);
    };
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Azurewave - The Future of Social Chat</title>
        <meta name="description" content="Join themed squares, connect with people, and chat in real-time in a modern, secure environment." />
        <meta name="application-name" content="Azurewave" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Azurewave" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />

        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Capture beforeinstallprompt BEFORE React hydrates — Chrome fires it very early */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.__pwaInstallPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaInstallPrompt = e;
          });
        `}} />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Amita&family=Charm&family=Grenze+Gotisch&family=Kalam&family=Lemonada&family=Lobster+Two&family=Merienda&family=Orbitron&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Sansita&family=Outfit:wght@100..900&family=Inter:wght@100..900&display=swap" rel="stylesheet" />
        <script src="https://unpkg.com/scrollreveal" async></script>
        <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" async></script>
      </head>
      <body 
        className={cn("font-body antialiased", mounted && isDesktopMode && "desktop-mode")}
        style={{ height: '100%' }}
        suppressHydrationWarning
      >
        <DevToolsDetector />
        <FirebaseClientProvider>
          <ThemeInitializer />
          <ImpersonationProvider>
            <ChatProvider>
              <MaintenanceWrapper>
                {React.Children.map(children, child => {
                  if (React.isValidElement(child)) {
                    // @ts-ignore
                    return React.cloneElement(child as React.ReactElement<any>, {
                      soundState,
                      setSoundState
                    });
                  }
                  return child;
                })}
              </MaintenanceWrapper>
              <Toaster />
            </ChatProvider>
          </ImpersonationProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
