'use client';

import { useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { Announcement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';

export function AnnouncementBanner() {
    const firestore = useFirestore();
    const [isVisible, setIsVisible] = useState(false);
    const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
    const { profile } = useEffectiveUserProfile();
    const isOwner = profile?.role === 'Owner';

    const announcementsQuery = useMemoFirebase(
        () => query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'), limit(1)),
        [firestore]
    );

    const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

    useEffect(() => {
        if (announcements && announcements.length > 0) {
            const latest = announcements[0];
            const dismissedId = localStorage.getItem('dismissedAnnouncementId');
            // The owner should always see the banner to have the option to remove it.
            if (latest.id !== dismissedId || isOwner) {
                setLatestAnnouncement(latest);
                setIsVisible(true);
            } else {
                setLatestAnnouncement(null);
                setIsVisible(false);
            }
        } else {
            // No announcements exist.
            setLatestAnnouncement(null);
            setIsVisible(false);
        }
    }, [announcements, isOwner]);

    const handleDismiss = () => {
        if (latestAnnouncement) {
            localStorage.setItem('dismissedAnnouncementId', latestAnnouncement.id);
        }
        setIsVisible(false);
    };

    const handleRemoveForEveryone = () => {
        if (!latestAnnouncement) return;
        const announcementRef = doc(firestore, 'announcements', latestAnnouncement.id);
        deleteDocumentNonBlocking(announcementRef);
        setIsVisible(false); // Immediately hide for the owner
    };

    if (!isVisible || !latestAnnouncement || isLoading) {
        return null;
    }
    
    const isImportant = latestAnnouncement.category === 'important';
    const iconSrc = isImportant ? '/special_badges/topic.svg' : '/special_badges/default.svg';

    return (
        <div className={cn(
            "p-3 text-sm flex items-center justify-center gap-4 relative",
            isImportant ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
        )}>
            <Image src={iconSrc} alt="Announcement Icon" width={24} height={24} className="rounded-full" />
            <p>
                <span className="font-bold">Announcement:</span> {latestAnnouncement.message}
            </p>
            {isOwner ? (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8 hover:bg-primary-foreground/20"
                    onClick={handleRemoveForEveryone}
                    title="Remove for everyone"
                >
                    <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                </Button>
            ) : (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8 hover:bg-primary-foreground/20"
                    onClick={handleDismiss}
                    title="Dismiss"
                >
                    <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
