'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { PrivateMessage, User } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';

export function usePrivateMessages(otherUser: User | null) {
    const { user: currentUser } = useUser();
    const firestore = useFirestore();

    const messagesQuery = useMemoFirebase(() => {
        if (!currentUser || !otherUser) return null;

        const messagesRef = collection(firestore, 'privateMessages');

        // This query finds all messages between the current user and the other user.
        // We remove orderBy to avoid needing a composite index, and sort on the client instead.
        return query(
            messagesRef,
            where('participants', '==', [currentUser.uid, otherUser.id].sort())
        );
    }, [firestore, currentUser, otherUser]);

    const { data, isLoading, error } = useCollection<PrivateMessage>(messagesQuery);
    
    // Sort messages on the client-side since we can't do it in the query without an index.
    const sortedMessages = useMemo(() => {
        if (!data) return null;
        // Create a new sorted array to avoid mutating the original.
        return [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [data]);

    return { messages: sortedMessages, isLoading, error };
}
