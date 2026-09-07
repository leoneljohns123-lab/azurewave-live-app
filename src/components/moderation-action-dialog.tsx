
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User } from '@/lib/types';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ActionType = 'warn' | 'kick' | 'mute' | 'ban' | 'gag' | 'set_temp_nick' | 'go_anonymous' | 'room_ban';

interface ModerationActionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  actionType: ActionType;
  user: User;
  onConfirm: (details: { reason: string; duration?: number; text?: string }) => void;
}

export function ModerationActionDialog({
  isOpen,
  onOpenChange,
  actionType,
  user,
  onConfirm,
}: ModerationActionDialogProps) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('');
  const [text, setText] = useState('');
  const { toast } = useToast();

  const needsDuration = ['kick', 'mute', 'gag', 'set_temp_nick', 'go_anonymous', 'room_ban'].includes(actionType);
  const needsTextInput = actionType === 'set_temp_nick';
  const isReasonRequired = actionType !== 'set_temp_nick';

  const handleConfirm = () => {
    if (isReasonRequired && !reason.trim()) {
      toast({ variant: 'destructive', title: 'A reason is required.' });
      return;
    }
    if (needsTextInput && !text.trim()) {
        toast({ variant: 'destructive', title: 'A nickname is required.' });
        return;
    }

    const durationNum = duration ? parseInt(duration, 10) : undefined;
    if (duration && isNaN(durationNum)) {
        toast({ variant: 'destructive', title: 'Duration must be a number.' });
        return;
    }
    onConfirm({ reason, duration: durationNum, text });
    onOpenChange(false);
    setReason('');
    setDuration('');
    setText('');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setReason('');
    setDuration('');
    setText('');
  };

  if (!actionType || !user) return null;

  const getTitleAndDescription = () => {
      switch(actionType) {
          case 'warn': return { title: `Warn ${user.displayName}`, description: 'A warning will be sent to this user.' };
          case 'kick': return { title: `Kick ${user.displayName}`, description: 'The user will be removed from the room temporarily.' };
          case 'mute': return { title: `Mute ${user.displayName}`, description: 'The user will not be able to send messages.' };
          case 'ban': return { title: `Ban ${user.displayName}`, description: 'The user will be permanently banned.' };
          case 'room_ban': return { title: `Ban ${user.displayName} from Room`, description: 'The user will not be able to enter or interact in this room.' };
          case 'gag': return { title: `Gag ${user.displayName}`, description: "The user's messages will be scrambled." };
          case 'set_temp_nick': return { title: `Set Nickname for ${user.displayName}`, description: 'Assign a temporary nickname.' };
          case 'go_anonymous': return { title: `Make ${user.displayName} Anonymous`, description: 'The user will appear as "Anonymous".' };
          default: return { title: 'Moderation Action', description: 'Please provide details for this action.' };
      }
  }

  const { title, description } = getTitleAndDescription();
  const isDestructive = actionType === 'ban' || actionType === 'kick' || actionType === 'room_ban';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 text-white">
        <DialogHeader className="p-6 text-center">
          <DialogTitle className={cn("text-2xl font-bold", isDestructive && "text-red-400")}>{title}</DialogTitle>
          <DialogDescription className="text-gray-300">{description}</DialogDescription>
        </DialogHeader>
        <div className="px-6 space-y-4">
          {needsTextInput && (
             <div className="space-y-2">
                <Label htmlFor="moderation-text">Nickname</Label>
                <Input
                    id="moderation-text"
                    placeholder={'Enter a temporary nickname...'}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12"
                />
            </div>
          )}
          {isReasonRequired && (
            <div className="space-y-2">
                <Label htmlFor="moderation-reason">Reason</Label>
                <Textarea
                id="moderation-reason"
                placeholder={`Reason for the action...`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg"
                />
            </div>
          )}
          {needsDuration && (
            <div className="space-y-2">
              <Label htmlFor="moderation-duration">Duration (minutes)</Label>
              <Input
                id="moderation-duration"
                type="number"
                placeholder={actionType === 'kick' ? 'Default 1 minute' : "Leave blank for permanent/session"}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12"
              />
               <p className="text-xs text-gray-400">
                {actionType === 'kick' && 'Kicks are temporary. If left blank, it will default to a 1 minute cooldown.'}
                {(actionType === 'mute' || actionType === 'room_ban') && 'For mutes/bans, leaving this blank will result in a permanent restriction.'}
                {actionType === 'gag' && 'If left blank, gag will last for 5 minutes.'}
                {actionType === 'set_temp_nick' && 'If left blank, nickname will last for 8 hours.'}
                {actionType === 'go_anonymous' && 'If left blank, anonymous mode will last for 8 hours.'}
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="p-6 bg-black/20">
          <Button variant="ghost" onClick={handleCancel} className="hover:bg-white/10 hover:text-white">Cancel</Button>
          <Button onClick={handleConfirm} className={cn(isDestructive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gradient-to-r from-[#e91e63] to-[#9c27b0]")}>Confirm Action</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

