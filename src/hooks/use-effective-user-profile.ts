'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useImpersonation } from '@/components/impersonation-provider';
import { User } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { User as FirebaseAuthUser } from 'firebase/auth';

interface EffectiveUserProfileResult {
    profile: User | null;
    isLoading: boolean;
    isImpersonating: boolean;
    realProfile: User | null;
    realAuthUser: FirebaseAuthUser | null;
    stopImpersonation: () => void;
}

export function useEffectiveUserProfile(): EffectiveUserProfileResult {
    const { user: realAuthUser, isUserLoading: isAuthUserLoading } = useUser();
    const { impersonatedUser, isImpersonating, stopImpersonation } = useImpersonation();
    const firestore = useFirestore();

    const realProfileRef = useMemoFirebase(() => realAuthUser ? doc(firestore, 'users', realAuthUser.uid) : null, [realAuthUser, firestore]);
    const { data: realProfile, isLoading: isRealProfileLoading } = useDoc<User>(realProfileRef);

    if (isImpersonating && impersonatedUser) {
        // While impersonating, we still need the real user's profile for permission checks
        // but the "effective" profile is the one being impersonated.
        return {
            profile: impersonatedUser,
            isLoading: false, // impersonatedUser is already loaded from session storage
            isImpersonating: true,
            realProfile: realProfile,
            realAuthUser: realAuthUser,
            stopImpersonation
        };
    }

    return {
        profile: realProfile,
        isLoading: isAuthUserLoading || isRealProfileLoading,
        isImpersonating: false,
        realProfile: realProfile,
        realAuthUser: realAuthUser,
        stopImpersonation
    };
}
