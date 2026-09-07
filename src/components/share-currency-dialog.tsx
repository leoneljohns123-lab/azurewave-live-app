
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
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, increment } from 'firebase/firestore';
import { User } from '@/lib/types';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { getEffectiveDisplayName } from '@/lib/user-helpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins } from '@fortawesome/free-solid-svg-icons';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ShareCurrencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: User;
  roomId: string;
}

export function ShareCurrencyDialog({ open, onOpenChange, recipient, roomId }: ShareCurrencyDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { profile: sender } = useEffectiveUserProfile();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'gold' | 'rubies'>('gold');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!sender) return null;

  const handleShare = async () => {
    const shareAmount = parseInt(amount, 10);
    if (isNaN(shareAmount) || shareAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a positive number.' });
      return;
    }

    const senderBalance = currency === 'gold' ? sender.gold || 0 : sender.rubies || 0;
    if (senderBalance < shareAmount) {
      toast({ variant: 'destructive', title: 'Insufficient Funds', description: `You do not have enough ${currency}.` });
      return;
    }

    setIsSubmitting(true);

    const senderRef = doc(firestore, 'users', sender.id);
    const recipientRef = doc(firestore, 'users', recipient.id);

    const currencyField = currency === 'gold' ? 'gold' : 'rubies';
    updateDocumentNonBlocking(senderRef, { [currencyField]: increment(-shareAmount) });
    updateDocumentNonBlocking(recipientRef, { [currencyField]: increment(shareAmount) });

    const notificationsCollection = collection(firestore, 'users', recipient.id, 'notifications');
    const notificationType = currency === 'gold' ? 'gold_received' : 'ruby_received';
    addDocumentNonBlocking(notificationsCollection, {
      userId: recipient.id,
      senderId: sender.id,
      text: `shared ${shareAmount.toLocaleString()} ${currency} with you!`,
      timestamp: new Date().toISOString(),
      read: false,
      type: notificationType,
    });

    if (roomId) {
      const messagesCollection = collection(firestore, 'chatRooms', roomId, 'messages');
      addDocumentNonBlocking(messagesCollection, {
        chatRoomId: roomId,
        senderId: 'system',
        content: `${getEffectiveDisplayName(sender)} shared ${shareAmount.toLocaleString()} ${currency} with ${getEffectiveDisplayName(recipient)}!`,
        timestamp: new Date().toISOString(),
        messageType: 'moderation_log',
      });
    }

    toast({
      title: 'Currency Shared!',
      description: `You sent ${shareAmount.toLocaleString()} ${currency} to ${getEffectiveDisplayName(recipient)}.`,
    });

    setIsSubmitting(false);
    setAmount('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 text-white">
        <DialogHeader className="p-6 text-center">
          <DialogTitle className="text-2xl font-bold">Share Currency</DialogTitle>
          <DialogDescription className="text-gray-300">
            Send Gold or Rubies to {getEffectiveDisplayName(recipient)}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 space-y-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <RadioGroup
              value={currency}
              onValueChange={(value: 'gold' | 'rubies') => setCurrency(value)}
              className="grid grid-cols-2 gap-4"
            >
              <Label htmlFor="gold" className={cn('flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all', currency === 'gold' ? 'border-[#e91e63] bg-[#e91e63]/20' : 'border-white/10 bg-black/20 hover:border-[#e91e63]/50')}>
                <RadioGroupItem value="gold" id="gold" className="sr-only" />
                <FontAwesomeIcon icon={faCoins} className="h-8 w-8 text-yellow-400" />
                <div>
                  <p className="font-semibold">Gold</p>
                  <p className="text-xs text-gray-300">Balance: {(sender.gold || 0).toLocaleString()}</p>
                </div>
              </Label>
              <Label htmlFor="rubies" className={cn('flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all', currency === 'rubies' ? 'border-[#e91e63] bg-[#e91e63]/20' : 'border-white/10 bg-black/20 hover:border-[#e91e63]/50')}>
                <RadioGroupItem value="rubies" id="rubies" className="sr-only" />
                <Image src="/interface_icons/ruby.svg" alt="Ruby" width={32} height={32} />
                <div>
                  <p className="font-semibold">Rubies</p>
                  <p className="text-xs text-gray-300">Balance: {(sender.rubies || 0).toLocaleString()}</p>
                </div>
              </Label>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12 text-lg"
            />
          </div>
        </div>
        <DialogFooter className="p-6 bg-black/20">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/10 hover:text-white">Cancel</Button>
          <Button onClick={handleShare} disabled={isSubmitting} className="bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">
            {isSubmitting ? 'Sharing...' : 'Share'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
