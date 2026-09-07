
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { User } from '@/lib/types';
import { useState } from 'react';

interface ForceSpeakDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  targetUser: User;
  onConfirm: (message: string) => void;
}

export function ForceSpeakDialog({
  isOpen,
  onOpenChange,
  targetUser,
  onConfirm,
}: ForceSpeakDialogProps) {
  const [message, setMessage] = useState('');

  const handleConfirm = () => {
    if (!message.trim()) {
      return;
    }
    onConfirm(message);
    onOpenChange(false);
    setMessage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 text-white">
        <DialogHeader className="p-6 text-center">
          <DialogTitle className="text-2xl font-bold">Force Speak as {targetUser.displayName}</DialogTitle>
          <DialogDescription className="text-gray-300">
            Type the message you want {targetUser.displayName} to say. This will appear in the chat as if they sent it.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6">
          <Textarea
            placeholder={`What will ${targetUser.displayName} say?`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg"
          />
        </div>
        <DialogFooter className="p-6 bg-black/20">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/10 hover:text-white">Cancel</Button>
          <Button onClick={handleConfirm} className="bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">Send Message</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
