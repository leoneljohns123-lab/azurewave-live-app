
'use client';

import { CallView } from '@/components/call-view';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { Square, User } from '@/lib/types';
import { doc, collection, arrayRemove, getDoc, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function CallViewPage() {
    const params = useParams();
    const router = useRouter();
    const squareId = params.id as string;
    const firestore = useFirestore();
    const { profile: currentUserProfile, isLoading: isUserLoading, realAuthUser } = useEffectiveUserProfile();

    // Redirect if not logged in
    useEffect(() => {
        if (!isUserLoading && !realAuthUser) {
            router.replace('/login');
        }
    }, [isUserLoading, realAuthUser, router]);

    const squareRef = useMemoFirebase(() => doc(firestore, 'squares', squareId), [firestore, squareId]);
    const { data: square, isLoading: isSquareLoading } = useDoc<Square>(squareRef);

    const allUsersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: allUsers, isLoading: areAllUsersLoading } = useCollection<User>(allUsersCollectionRef);

    const handleLeave = async () => {
        if (!currentUserProfile || !squareRef) return;

        try {
            await updateDoc(squareRef, {
                'call.participants': arrayRemove(currentUserProfile.id)
            });
    
            // Refetch square to check if we are the last one.
            const updatedSquareSnap = await getDoc(squareRef);
            if (updatedSquareSnap.exists()) {
                const updatedSquare = updatedSquareSnap.data() as Square;
                if (updatedSquare.call?.participants?.length === 0) {
                    await updateDoc(squareRef, {
                        'call.isActive': false,
                    });
                }
            }
        } catch (error) {
            console.error("Error leaving call:", error);
        }

        router.push(`/squares/${squareId}`);
    };

    const isLoading = isSquareLoading || isUserLoading || areAllUsersLoading;

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center bg-slate-900 min-h-screen">
                <p className="text-white">Loading Call...</p>
            </div>
        );
    }
    
    if (!square || !allUsers) {
        return (
            <div className="flex flex-1 items-center justify-center bg-slate-900 min-h-screen">
                <p className="text-white">Could not load call details.</p>
            </div>
        )
    }

    return <CallView square={square} allUsers={allUsers} onLeave={handleLeave} />;
}

export default CallViewPage;
