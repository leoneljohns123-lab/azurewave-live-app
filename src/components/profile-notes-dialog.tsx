
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { User, ProfileNote } from '@/lib/types';
import { useState } from 'react';
import { useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { UserAvatar } from './user-avatar';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { getEffectiveDisplayName } from '@/lib/user-helpers';
import Image from 'next/image';


interface ProfileNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

function NoteItem({ note }: { note: ProfileNote }) {
    const firestore = useFirestore();
    const authorRef = useMemoFirebase(() => note.authorId ? doc(firestore, 'users', note.authorId) : null, [firestore, note.authorId]);
    const { data: author, isLoading } = useDoc<User>(authorRef);

    if (isLoading || !author) {
        return <Skeleton className="h-20 w-full bg-black/20" />;
    }

    return (
        <div className="bg-black/20 p-3 rounded-lg">
            <div className="flex items-center gap-3">
                <UserAvatar user={author} className="w-8 h-8" />
                <div>
                    <p className="font-semibold text-sm">{getEffectiveDisplayName(author)}</p>
                    <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</p>
                </div>
            </div>
            <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{note.note}</p>
        </div>
    );
}

export function ProfileNotesDialog({ open, onOpenChange, user }: ProfileNotesDialogProps) {
  const { profile: currentUserProfile } = useEffectiveUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newNote, setNewNote] = useState('');
  const isViewingSelf = currentUserProfile?.id === user.id;

  const notesQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'users', user.id, 'profileNotes'), orderBy('createdAt', 'desc'));
  }, [firestore, user.id]);

  const { data: notes, isLoading } = useCollection<ProfileNote>(notesQuery);

  const handlePostNote = () => {
    if (!newNote.trim() || !currentUserProfile) return;

    const notesCollectionRef = collection(firestore, 'users', user.id, 'profileNotes');
    addDocumentNonBlocking(notesCollectionRef, {
        authorId: currentUserProfile.id,
        authorName: getEffectiveDisplayName(currentUserProfile),
        note: newNote.trim(),
        createdAt: new Date().toISOString(),
    });

    toast({
        title: "Note Posted!",
        description: `Your note has been left on ${getEffectiveDisplayName(user)}'s profile.`,
    });

    setNewNote('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 bg-[#2f194d] border-none rounded-2xl overflow-hidden text-white shadow-2xl">
        <DialogHeader className="p-6">
          <DialogTitle className="text-2xl font-bold">Profile Notes for {getEffectiveDisplayName(user)}</DialogTitle>
          <DialogDescription className="text-gray-300">
            {isViewingSelf ? "Notes other users have left on your profile." : "Leave a note for this user."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-80 px-6">
            <div className="space-y-3">
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-20 w-full bg-black/20" />
                        <Skeleton className="h-20 w-full bg-black/20" />
                    </div>
                ) : notes && notes.length > 0 ? (
                    notes.map(note => <NoteItem key={note.id} note={note} />)
                ) : (
                    <div className="flex flex-col items-center justify-center h-full pt-16 text-center">
                        <Image src="/interface_icons/nodata.svg" alt="No notes" width={64} height={64} className="opacity-70" />
                        <p className="text-sm text-muted-foreground mt-4">No notes yet.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
        
        {!isViewingSelf && (
            <div className="p-6 bg-black/20">
                <Textarea 
                    placeholder="Write a note..." 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="bg-[#2f194d] border-[#412293] placeholder:text-gray-400"
                />
                <Button onClick={handlePostNote} disabled={!newNote.trim()} className="w-full mt-2 bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">
                    Post Note
                </Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
