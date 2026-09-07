
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, increment } from 'firebase/firestore';
import { User, Gift } from '@/lib/types';
import { giftDefinitions } from '@/lib/gift-definitions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faHeart, faStar, faSmile } from '@fortawesome/free-solid-svg-icons';
import { getEffectiveDisplayName } from '@/lib/user-helpers';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';


interface GiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: User;
  roomId: string;
}

const faIcons: { [key: string]: any } = {
  heart: faHeart,
  star: faStar,
  smile: faSmile,
};

export function GiftDialog({ open, onOpenChange, recipient, roomId }: GiftDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { profile: sender } = useEffectiveUserProfile();

  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const regularGifts = useMemo(() => giftDefinitions.filter(g => g.category === 'regular'), []);
  const vipGifts = useMemo(() => giftDefinitions.filter(g => g.category === 'vip'), []);
  const premiumGifts = useMemo(() => giftDefinitions.filter(g => g.category === 'premium'), []);

  if (!sender) return null;

  const handleSendGift = async () => {
    if (!selectedGift) return;

    const senderRef = doc(firestore, 'users', sender.id);
    const recipientRef = doc(firestore, 'users', recipient.id);
    
    const senderGold = sender.gold || 0;
    const senderRubies = sender.rubies || 0;

    // Check balance
    if (selectedGift.currency === 'gold' && senderGold < selectedGift.price) {
      toast({ variant: 'destructive', title: 'Insufficient Gold' });
      setIsConfirming(false);
      return;
    }
    if (selectedGift.currency === 'rubies' && senderRubies < selectedGift.price) {
      toast({ variant: 'destructive', title: 'Insufficient Rubies' });
      setIsConfirming(false);
      return;
    }

    // 1. Update sender's balance and gift stats
    const senderUpdate: { [key: string]: any } = {
      'gifts.sent.total': increment(1),
      [`gifts.sent.inventory.${selectedGift.id}`]: increment(1),
      xp: increment(20),
    };
    if (selectedGift.currency === 'gold') {
      senderUpdate.gold = increment(-selectedGift.price);
    } else {
      senderUpdate.rubies = increment(-selectedGift.price);
    }
    if (!sender.gifts?.sent?.inventory?.[selectedGift.id]) {
        senderUpdate['gifts.sent.unique'] = increment(1);
    }
    updateDocumentNonBlocking(senderRef, senderUpdate);

    // 2. Update recipient's gift stats and give XP
    const xpForReceiver = Math.round(selectedGift.price / 5);
    const recipientUpdate: { [key: string]: any } = {
        'gifts.received.total': increment(1),
        [`gifts.received.inventory.${selectedGift.id}`]: increment(1),
        xp: increment(xpForReceiver),
    };
    if (!recipient.gifts?.received?.inventory?.[selectedGift.id]) {
        recipientUpdate['gifts.received.unique'] = increment(1);
    }
    updateDocumentNonBlocking(recipientRef, recipientUpdate);


    // 3. Create a notification for the recipient
    const notificationsCollection = collection(firestore, 'users', recipient.id, 'notifications');
    addDocumentNonBlocking(notificationsCollection, {
      userId: recipient.id,
      senderId: sender.id,
      text: `sent you a ${selectedGift.name}!`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'gift_received',
    });

    // 4. Create a chat log message
    if (roomId) {
        const messagesCollection = collection(firestore, 'chatRooms', roomId, 'messages');
        addDocumentNonBlocking(messagesCollection, {
            chatRoomId: roomId,
            senderId: 'system',
            content: `${getEffectiveDisplayName(sender)} sent a ${selectedGift.name} to ${getEffectiveDisplayName(recipient)}!`,
            timestamp: new Date().toISOString(),
            messageType: 'gift_log',
            gift: {
                senderName: getEffectiveDisplayName(sender),
                receiverName: getEffectiveDisplayName(recipient),
                giftName: selectedGift.name,
                giftIcon: selectedGift.icon,
            }
        });
    }

    toast({ title: 'Gift Sent!', description: `You sent a ${selectedGift.name} to ${getEffectiveDisplayName(recipient)}.` });
    
    setIsConfirming(false);
    setSelectedGift(null);
    onOpenChange(false);
  };
  
  const GiftGrid = ({ gifts }: { gifts: Gift[] }) => (
    <ScrollArea className="h-72">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-4">
            {gifts.map((gift) => {
                const canAfford = gift.currency === 'gold' 
                    ? (sender.gold || 0) >= gift.price 
                    : (sender.rubies || 0) >= gift.price;
                const isFaIcon = !!faIcons[gift.icon];
    
                return (
                    <button
                        key={gift.id}
                        className={cn(
                            "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                            !canAfford && "opacity-50 cursor-not-allowed",
                            selectedGift?.id === gift.id ? "border-[#e91e63] bg-[#e91e63]/20" : "border-white/10 bg-black/20 hover:bg-black/40"
                        )}
                        onClick={() => canAfford && setSelectedGift(gift)}
                        disabled={!canAfford}
                    >
                        <div className='h-8 w-8 flex items-center justify-center'>
                          {isFaIcon ? (
                            <FontAwesomeIcon icon={faIcons[gift.icon]} className="h-8 w-8 text-primary" />
                          ) : (
                            <Image src={gift.icon} alt={gift.name} width={32} height={32} data-ai-hint={gift.id === 'yacht' ? 'yacht' : undefined} />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-center">{gift.name}</span>
                        <div className="flex items-center gap-1 text-xs">
                           {gift.currency === 'gold' ? (
                              <FontAwesomeIcon icon={faCoins} className="text-yellow-400" />
                            ) : (
                              <Image src="/interface_icons/ruby.svg" alt="Ruby" width={16} height={16} />
                            )}
                            <span>{gift.price}</span>
                        </div>
                    </button>
                )
            })}
          </div>
      </ScrollArea>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg p-0 bg-[#2f194d] border-none text-white rounded-2xl">
          <DialogHeader className="p-6 text-center">
            <DialogTitle className="text-2xl font-bold">Send a Gift to {getEffectiveDisplayName(recipient)}</DialogTitle>
            <DialogDescription className="text-gray-300">
                Your balance: {(sender.gold || 0).toLocaleString()} <FontAwesomeIcon icon={faCoins} className="text-yellow-400"/> / {(sender.rubies || 0).toLocaleString()} <Image src="/interface_icons/ruby.svg" alt="Ruby" width={16} height={16} className="inline-block -mt-1"/>
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="vip" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-black/20 mx-6 !w-[calc(100%-3rem)] rounded-lg p-1 h-auto">
              <TabsTrigger value="regular" className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md">Regular</TabsTrigger>
              <TabsTrigger value="vip" className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md">VIP</TabsTrigger>
              <TabsTrigger value="premium" className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md">Premium</TabsTrigger>
            </TabsList>
            <div className="px-2">
                <TabsContent value="regular">
                    <GiftGrid gifts={regularGifts} />
                </TabsContent>
                <TabsContent value="vip">
                    <GiftGrid gifts={vipGifts} />
                </TabsContent>
                <TabsContent value="premium">
                    <GiftGrid gifts={premiumGifts} />
                </TabsContent>
            </div>
          </Tabs>
          <DialogFooter className="p-6 bg-black/20">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button onClick={() => setIsConfirming(true)} disabled={!selectedGift} className="bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">
              Send Gift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedGift && (
        <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
            <AlertDialogContent className="sm:max-w-md p-0 bg-[#2f194d] border-none text-white rounded-2xl">
                <AlertDialogHeader className="p-6 text-center">
                    <AlertDialogTitle className="text-2xl font-bold">Confirm Gift</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-300">
                        Are you sure you want to send a {selectedGift.name} to {getEffectiveDisplayName(recipient)} for {selectedGift.price} {selectedGift.currency}?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="p-6 bg-black/20">
                    <AlertDialogCancel asChild>
                      <Button variant="ghost" className="hover:bg-white/10 hover:text-white">Cancel</Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button onClick={handleSendGift} className="bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">Confirm</Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
