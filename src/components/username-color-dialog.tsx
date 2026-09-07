

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faCoins } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { useChat } from '@/context/chat-context';

interface UsernameColorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colors = [
  '#F44336', '#FF9800', '#FFEB3B', '#8BC34A', '#4CAF50', '#00BCD4', '#2196F3',
  '#3F51B5', '#673AB7', '#9C27B0', '#E91E63', '#795548', '#9E9E9E', '#607D8B',
  '#FFFFFF', '#000000'
];

const fonts = [
    'Amita', 'Charm', 'Grenze Gotisch', 'Kalam', 'Lemonada', 'Lobster Two', 'Merienda', 'Orbitron', 'PT Sans', 'Sansita'
];

const STYLE_COST = 500;

export function UsernameColorDialog({ open, onOpenChange }: UsernameColorDialogProps) {
  const { profile: user, isLoading: isProfileLoading } = useEffectiveUserProfile();
  const { hasFeaturePermission } = useChat();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedColor, setSelectedColor] = useState<string>('#FFFFFF');
  const [selectedFont, setSelectedFont] = useState<string>('PT Sans');
  const [selectedStyle, setSelectedStyle] = useState<'color' | 'neon' | 'gradient'>('color');

  useEffect(() => {
    if (user) {
      setSelectedColor(user.nameColor || '#FFFFFF');
      setSelectedFont(user.nameFont || 'PT Sans');
      setSelectedStyle(user.nameStyle || 'color');
    }
  }, [user, open]);

  const handleSave = () => {
    if (!user || !hasFeaturePermission(user, 'usernameStyle')) {
        toast({ variant: 'destructive', title: 'Permission Denied'});
        return;
    }
    
    if ((user.gold || 0) < STYLE_COST) {
        toast({ variant: 'destructive', title: 'Insufficient Gold', description: `You need ${STYLE_COST} gold to change your username style.` });
        return;
    }
    
    const userRef = doc(firestore, 'users', user.id);
    updateDocumentNonBlocking(userRef, {
      nameColor: selectedColor,
      nameFont: selectedFont,
      nameStyle: selectedStyle,
      gold: (user.gold || 0) - STYLE_COST,
    });
    
    toast({
        title: "Username Style Saved!",
        description: `Your new username style has been applied for ${STYLE_COST} gold.`,
    });

    onOpenChange(false);
  };

  const getPreviewStyle = () => {
    const style: React.CSSProperties = {
        fontFamily: `'${selectedFont}', sans-serif`,
    };
    if (selectedStyle === 'color') {
        style.color = selectedColor;
    } else if (selectedStyle === 'neon') {
        style.color = '#fff';
        style.textShadow = `0 0 5px #fff, 0 0 10px ${selectedColor}, 0 0 15px ${selectedColor}, 0 0 20px ${selectedColor}`;
    }
    else if (selectedStyle === 'gradient') {
        style.background = `linear-gradient(to right, ${selectedColor}, #FFC107)`; // Example gradient
        style.WebkitBackgroundClip = 'text';
        style.backgroundClip = 'text';
        style.color = 'transparent';
    }
    return style;
  }

  if (isProfileLoading || !user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md text-white">
            <DialogHeader>
                <DialogTitle className="text-lg font-semibold">Username Style</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-400">Preview</label>
                    <div className="p-4 bg-black/20 rounded-md text-center">
                        <span className="text-2xl font-bold" style={getPreviewStyle()}>{user.displayName}</span>
                    </div>
                </div>

                <Tabs value={selectedStyle} onValueChange={(value) => setSelectedStyle(value as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-black/20 rounded-md p-1">
                        <TabsTrigger value="color" className="data-[state=active]:bg-[#444] data-[state=active]:text-white rounded-sm">Color</TabsTrigger>
                        <TabsTrigger value="neon" className="data-[state=active]:bg-[#444] data-[state=active]:text-white rounded-sm">Neon</TabsTrigger>
                        <TabsTrigger value="gradient" className="data-[state=active]:bg-[#444] data-[state=active]:text-white rounded-sm">Gradient</TabsTrigger>
                    </TabsList>
                    <TabsContent value="color" className="mt-4">
                         <div className="grid grid-cols-8 gap-2">
                            {colors.map(color => (
                                <button key={color} onClick={() => setSelectedColor(color)} className={cn("w-full h-8 rounded-md border-2", selectedColor === color ? "border-white" : "border-transparent")} style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="neon" className="mt-4">
                         <div className="grid grid-cols-8 gap-2">
                            {colors.map(color => (
                                <button key={color} onClick={() => setSelectedColor(color)} className={cn("w-full h-8 rounded-md border-2", selectedColor === color ? "border-white" : "border-transparent")} style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    </TabsContent>
                     <TabsContent value="gradient" className="mt-4">
                         <div className="grid grid-cols-8 gap-2">
                            {colors.map(color => (
                                <button key={color} onClick={() => setSelectedColor(color)} className={cn("w-full h-8 rounded-md border-2", selectedColor === color ? "border-white" : "border-transparent")} style={{ background: `linear-gradient(to right, ${color}, #FFC107)` }} />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
                
                <div>
                    <label htmlFor="font" className="text-sm font-medium text-gray-400">Font</label>
                    <Select value={selectedFont} onValueChange={setSelectedFont}>
                        <SelectTrigger id="font" className="w-full bg-black/20 border-[#333] rounded-md mt-1">
                            <SelectValue placeholder="Select a font" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#212121] border-[#333] text-white">
                            {fonts.map(font => (
                                <SelectItem key={font} value={font} style={{fontFamily: `'${font}', sans-serif`}}>{font}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

            </div>

            <DialogFooter className="mt-6 flex justify-between items-center">
                <div className='flex items-center gap-2 text-sm text-gray-300'>
                    <FontAwesomeIcon icon={faCoins} className='text-yellow-500' />
                    <span>Cost: {STYLE_COST} Gold</span>
                </div>
                <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                    <FontAwesomeIcon icon={faSave} className="mr-2 h-4 w-4" /> Save
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
