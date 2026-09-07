

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { cn } from '@/lib/utils';
import { useChat } from '@/context/chat-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface ChatBackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const backgroundOptions = [
    { id: 'default', name: 'Default', url: '' },
    { id: 'arc_new', name: 'Arc', url: '/images/chat_background/arc.png' },
    { id: 'blue_new', name: 'Blue', url: '/images/chat_background/blue.png' },
    { id: 'remix_new', name: 'Remix', url: '/images/chat_background/remix.jpeg' },
    { id: 'bg1', name: 'WhatsApp 1', url: '/images/chat_background/whatsapp.jpg' },
    { id: 'bg3', name: 'WhatsApp 3', url: '/images/chat_background/whatsapp3.webp' },
    { id: 'bg4', name: 'WhatsApp 4', url: '/images/chat_background/whatsapp4.jpg' },
    { id: 'bg5', name: 'WhatsApp 5', url: '/images/chat_background/whatsapp5.jpg' },
    { id: 'bg6', name: 'WhatsApp 6', url: '/images/chat_background/whatsapp6.jpg' },
    { id: 'grey', name: 'Grey', url: '/images/chat_background/grey.jpg' },
    { id: 'pink', name: 'Pink', url: '/images/chat_background/Pink.jpg' },
    { id: 'hallow', name: 'Hallow', url: '/images/chat_background/Hallow.jpg' },
    { id: 'halloween1', name: 'Halloween 1', url: '/images/chat_background/haloween1.avif' },
    { id: 'halloween2', name: 'Halloween 2', url: '/images/chat_background/halloween2.jpg' },
    { id: 'halloween2webp', name: 'Halloween 2 Webp', url: '/images/chat_background/haloween2.webp' },
    { id: 'eerie', name: 'Eerie', url: '/images/chat_background/eerie.jpg' },
    { id: 'horror', name: 'Horror', url: '/images/chat_background/horror.jpg' },
    { id: 'red', name: 'Red', url: '/images/chat_background/red.jpg' },
];

const decorationOptions = [
    { id: 'none', name: 'None', url: '' },
    { id: 'flower_1', name: 'Flower 1', url: '/images/chat_background/flower.png' },
    { id: 'flower_2', name: 'Flower 2', url: '/images/chat_background/flower2.png' },
    { id: 'weendecoration', name: 'Ween Decor', url: '/images/chat_background/weendecoration.png' },
    { id: 'decoration2', name: 'Decoration 2', url: '/images/chat_background/decoration2.png' },
    { id: 'decoration', name: 'Decoration 1', url: '/images/chat_background/decoration.png' },
    { id: 'blue_decor', name: 'Blue Decor', url: '/images/chat_background/blue_decor.png' },
    { id: 'yankees_decor', name: 'Yankees', url: '/images/chat_background/yankees_decor.png' },
    { id: 'spGpot', name: 'Pot of Gold', url: '/images/chat_background/spGpot.jpg' },
    { id: 'purple_decor', name: 'Purple', url: '/images/chat_background/purple_decor.png' },
    { id: 'girl', name: 'Girl', url: '/images/chat_background/Girl.png' },
    { id: 'tom_jerry', name: 'Tom & Jerry', url: '/images/chat_background/Tom&Jerry.png' },
    { id: 'roses', name: 'Roses', url: '/images/chat_background/Roses.png' },
    { id: 'anime', name: 'Anime', url: '/images/chat_background/Anime.png' },
    { id: 'skeleton_man', name: 'Skeleton Man', url: '/images/chat_background/skeletonMan.png' },
];

const decorationPositionOptions = [
    { id: 'default', name: 'Default' },
    { id: 'bottom right', name: 'Bottom Right' },
    { id: 'bottom left', name: 'Bottom Left' },
    { id: 'top right', name: 'Top Right' },
    { id: 'top left', name: 'Top Left' },
    { id: 'center', name: 'Center' },
];

export function ChatBackgroundDialog({ open, onOpenChange }: ChatBackgroundDialogProps) {
    const { profile: user, isLoading: isProfileLoading } = useEffectiveUserProfile();
    const { hasFeaturePermission } = useChat();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedBackground, setSelectedBackground] = useState('');
    const [selectedDecoration, setSelectedDecoration] = useState('');
    const [selectedDecorationPosition, setSelectedDecorationPosition] = useState('default');

    useEffect(() => {
        if (user) {
            setSelectedBackground(user.chatBackgroundUrl || '');
            setSelectedDecoration(user.chatDecorationUrl || '');
            setSelectedDecorationPosition(user.chatDecorationPosition || 'default');
        }
    }, [user, open]);

    const handleSave = () => {
        if (!user) return;

        if (!hasFeaturePermission(user, 'chatBackground')) {
          toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'You do not have permission to change chat backgrounds or decorations.',
          });
          return;
        }

        const userRef = doc(firestore, 'users', user.id);
        const finalDecorationPosition = selectedDecorationPosition === 'default' ? '' : selectedDecorationPosition;

        updateDocumentNonBlocking(userRef, {
            chatBackgroundUrl: selectedBackground,
            chatDecorationUrl: selectedDecoration,
            chatDecorationPosition: finalDecorationPosition,
        });

        toast({
            title: "Appearance Saved!",
            description: "Your new chat background and decoration have been applied.",
        });

        onOpenChange(false);
    };
    
    if (isProfileLoading || !user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl bg-background/50 backdrop-blur-sm border">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Chat Appearance</DialogTitle>
                    <DialogDescription>
                        Customize the background and decorations of your chat rooms.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="backgrounds" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="backgrounds">Backgrounds</TabsTrigger>
                        <TabsTrigger value="decorations">Decorations</TabsTrigger>
                        <TabsTrigger value="position">Position</TabsTrigger>
                    </TabsList>

                    <TabsContent value="backgrounds" className="mt-4 max-h-96 overflow-y-auto">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-1">
                            {backgroundOptions.map(bg => (
                                <button
                                    key={bg.id}
                                    className={cn(
                                        "relative aspect-video rounded-lg overflow-hidden border-2 focus:outline-none focus:ring-2 focus:ring-ring",
                                        selectedBackground === bg.url ? 'border-primary' : 'border-transparent hover:border-primary/50'
                                    )}
                                    onClick={() => setSelectedBackground(bg.url)}
                                >
                                    {bg.url ? <Image src={bg.url} alt={bg.name} layout="fill" objectFit="cover" /> : <div className="h-full w-full bg-secondary flex items-center justify-center text-xs text-secondary-foreground">Default</div>}
                                    <div className="absolute inset-0 bg-black/30" />
                                    <span className="absolute bottom-1 left-2 text-xs font-semibold text-white drop-shadow-md">{bg.name}</span>
                                </button>
                            ))}
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="decorations" className="mt-4 max-h-96 overflow-y-auto">
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-1">
                            {decorationOptions.map(deco => (
                                <button
                                    key={deco.id}
                                    className={cn(
                                        "relative aspect-video rounded-lg overflow-hidden border-2 flex items-center justify-center bg-secondary focus:outline-none focus:ring-2 focus:ring-ring",
                                        selectedDecoration === deco.url ? 'border-primary' : 'border-transparent hover:border-primary/50'
                                    )}
                                    onClick={() => setSelectedDecoration(deco.url)}
                                >
                                    <div className="h-full w-full flex items-center justify-center">
                                      {deco.url ? <Image src={deco.url} alt={deco.name} layout="fill" objectFit="contain" className="p-2" /> : <span className="text-sm text-secondary-foreground">None</span>}
                                    </div>
                                    <div className="absolute inset-0 bg-black/10" />
                                    <span className="absolute bottom-1 left-2 text-xs font-semibold text-white drop-shadow-md">{deco.name}</span>
                                </button>
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="position" className="mt-4">
                        <div className="space-y-2">
                          <Label>Decoration Position</Label>
                          <Select value={selectedDecorationPosition} onValueChange={setSelectedDecorationPosition}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Default" />
                              </SelectTrigger>
                              <SelectContent>
                                  {decorationPositionOptions.map(pos => (
                                      <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Select where the decoration image will be placed.</p>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-6">
                    <Button onClick={() => onOpenChange(false)} variant="ghost">Cancel</Button>
                    <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                        <FontAwesomeIcon icon={faSave} className="mr-2 h-4 w-4" /> Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
