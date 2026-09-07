'use client';

import React from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ThemeSettings } from '@/lib/types';
import { MaintenanceMode } from './maintenance-mode';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { Skeleton } from './ui/skeleton';

export function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
    const firestore = useFirestore();
    const { profile } = useEffectiveUserProfile();

    const themeSettingsRef = useMemoFirebase(() => doc(firestore, 'app_settings', 'theme'), [firestore]);
    const { data: themeSettings, isLoading } = useDoc<ThemeSettings>(themeSettingsRef);

    const isOwner = profile?.role === 'Owner';
    const isInMaintenance = themeSettings?.isMaintenanceMode;

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <Skeleton className="h-full w-full" />
            </div>
        );
    }
    
    // Owners can still access the site during maintenance mode
    if (isInMaintenance && !isOwner) {
        return <MaintenanceMode />;
    }

    return <>{children}</>;
}
