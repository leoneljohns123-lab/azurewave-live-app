'use client';

import { useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { ThemeSettings } from '@/lib/types';
import { doc } from 'firebase/firestore';

export function ThemeInitializer() {
    const firestore = useFirestore();
    const themeSettingsRef = useMemoFirebase(() => doc(firestore, 'app_settings', 'theme'), [firestore]);
    const { data: themeData } = useDoc<ThemeSettings>(themeSettingsRef);

    useEffect(() => {
        if (themeData?.variables) {
            const root = document.documentElement;
            
            if (themeData.isDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }

            Object.entries(themeData.variables).forEach(([key, value]) => {
                root.style.setProperty(key, value as string);
            });
        }
    }, [themeData]);

    return null; // This component doesn't render anything
}
