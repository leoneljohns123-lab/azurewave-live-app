
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
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { ScrollArea } from './ui/scroll-area';

interface ChatTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colors = [
    '#F44336', '#FF9800', '#FFEB3B', '#8BC34A', '#4CAF50', '#00BCD4', '#2196F3',
    '#3F51B5', '#673AB7', '#9C27B0', '#E91E63', '#795548', '#9E9E9E', '#607D8B',
    '#FFFFFF',
];
const moreColors = [
    '#E57373', '#FFB74D', '#FFF176', '#AED581', '#81C784', '#4DD0E1', '#64B5F6',
    '#7986CB', '#9575CD', '#F06292', '#A1887F', '#BDBDBD', '#90A4AE',
    '#E0E0E0', '#424242'
];

const fonts = [
    'Amita', 'Charm', 'Grenze Gotisch', 'Kalam', 'Lemonada', 'Lobster Two', 'Merienda', 'Orbitron', 'PT Sans', 'Sansita'
];

const fontStyles = [
    'Normal', 'Italic', 'Bold', 'Bold Italic', 'Heavy', 'Heavy Italic'
];

const customBubbleStyles: {id: string; name: string; className: string;}[] = [
    { id: 'default', name: 'Default', className: 'rounded-xl rounded-bl-md' },
    { id: 'bubble-1', name: 'Rounded 1', className: 'bubble-1' },
    { id: 'bubble-2', name: 'Rounded 2', className: 'bubble-2' },
    { id: 'bubble-5', name: 'Boxy', className: 'bubble-5' },
];

const bubbleColors = Array.from({ length: 32 }, (_, i) => ({ id: `bubcolor${i + 1}`, name: `Color ${i + 1}`, className: `bubcolor${i + 1}` }));
const bubbleGradients = Array.from({ length: 40 }, (_, i) => ({ id: `bubgrad${i + 1}`, name: `Gradient ${i + 1}`, className: `bubgrad${i + 1}` }));
const bubbleNeons = Array.from({ length: 40 }, (_, i) => ({ id: `bubneon${i + 1}`, name: `Neon ${i + 1}`, className: `bubneon${i + 1}` }));

export function ChatTextDialog({ open, onOpenChange }: ChatTextDialogProps) {
  const { profile: user, isLoading: isProfileLoading } = useEffectiveUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedColor, setSelectedColor] = useState<string>('#FFFFFF');
  const [selectedFont, setSelectedFont] = useState<string>('PT Sans');
  const [selectedStyle, setSelectedStyle] = useState<'color' | 'neon' | 'gradient'>('color');
  const [selectedFontStyle, setSelectedFontStyle] = useState<string>('Normal');
  const [selectedBubbleShape, setSelectedBubbleShape] = useState<string>('default');
  const [selectedBubbleFill, setSelectedBubbleFill] = useState<string>('');

  useEffect(() => {
    if (user) {
      setSelectedColor(user.chatTextColor || '#FFFFFF');
      setSelectedFont(user.chatTextFont || 'PT Sans');
      setSelectedStyle(user.chatTextStyle || 'color');
      setSelectedFontStyle(user.chatTextFontStyle || 'Normal');
      setSelectedBubbleShape(user.chatBubbleShape || 'default');
      setSelectedBubbleFill(user.chatBubbleFill || '');
    }
  }, [user, open]);

  const handleSave = () => {
    if (!user) return;
    
    const userRef = doc(firestore, 'users', user.id);
    updateDocumentNonBlocking(userRef, {
      chatTextColor: selectedColor,
      chatTextFont: selectedFont,
      chatTextStyle: selectedStyle,
      chatTextFontStyle: selectedFontStyle,
      chatBubbleShape: selectedBubbleShape,
      chatBubbleFill: selectedBubbleFill,
    });
    
    toast({
        title: "Chat Style Saved!",
        description: "Your new chat text style has been applied.",
    });

    onOpenChange(false);
  };
  
  const getFontWeight = (fontStyle: string) => {
      if (fontStyle.includes('Heavy')) return 900;
      if (fontStyle.includes('Bold')) return 700;
      return 400;
  }
  
  const getFontStyle = (fontStyle: string) => {
      return fontStyle.includes('Italic') ? 'italic' : 'normal';
  }

  const getPreviewStyle = () => {
    const style: React.CSSProperties = {
        fontFamily: `'${selectedFont}', sans-serif`,
        fontWeight: getFontWeight(selectedFontStyle),
        fontStyle: getFontStyle(selectedFontStyle),
    };
    if (selectedStyle === 'color') {
        style.color = selectedColor;
    } else if (selectedStyle === 'neon') {
        style.color = '#fff';
        style.textShadow = `0 0 5px #fff, 0 0 10px ${selectedColor}, 0 0 15px ${selectedColor}, 0 0 20px ${selectedColor}`;
    }
    else if (selectedStyle === 'gradient') {
        style.background = `linear-gradient(to right, ${selectedColor}, #FFC107)`;
        style.WebkitBackgroundClip = 'text';
        style.backgroundClip = 'text';
        style.color = 'transparent';
    }
    return style;
  }

  if (isProfileLoading || !user) return null;

  const previewShapeClass = customBubbleStyles.find(b => b.id === selectedBubbleShape)?.className || 'rounded-xl rounded-bl-md';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md text-white">
            <DialogHeader>
                <DialogTitle className="text-lg font-semibold">Chat Text Style</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
                <div className="p-4 bg-black/20 rounded-md flex items-center justify-center">
                    <div className={cn(
                        "p-3 inline-block",
                        previewShapeClass,
                        selectedBubbleFill ? selectedBubbleFill : 'bg-slate-700'
                    )}>
                        <p className="text-lg" style={getPreviewStyle()}>Lorem ipsum dolor sit amet.</p>
                    </div>
                </div>

                <Tabs defaultValue="color" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-black/20 rounded-md p-1">
                        <TabsTrigger value="color" className="data-[state=active]:bg-[#444] data-[state=active]:text-white rounded-sm">Color</TabsTrigger>
                        <TabsTrigger value="neon" className="data-[state=active]:bg-[#444] data-[state=active]:text-white rounded-sm">Neon</TabsTrigger>
                        <TabsTrigger value="gradient" className="data-[state=active]:bg-[#444] data-[state=active]:text-white rounded-sm">Gradient</TabsTrigger>
                        <TabsTrigger value="bubbles" className="data-[state=active]:bg-[#444] data-[state=active]:text-white rounded-sm">Bubbles</TabsTrigger>
                    </TabsList>
                    <TabsContent value="color" className="mt-4">
                         <div className="grid grid-cols-8 gap-2">
                            {colors.concat(moreColors).map(color => (
                                <button key={color} onClick={() => setSelectedColor(color)} className={cn("w-full h-8 rounded-md border-2", selectedColor === color ? "border-white" : "border-transparent")} style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="neon" className="mt-4">
                         <div className="grid grid-cols-8 gap-2">
                            {colors.concat(moreColors).map(color => (
                                <button key={color} onClick={() => setSelectedColor(color)} className={cn("w-full h-8 rounded-md border-2", selectedColor === color ? "border-white" : "border-transparent")} style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    </TabsContent>
                     <TabsContent value="gradient" className="mt-4">
                         <div className="grid grid-cols-8 gap-2">
                            {colors.concat(moreColors).map(color => (
                                <button key={color} onClick={() => setSelectedColor(color)} className={cn("w-full h-8 rounded-md border-2", selectedColor === color ? "border-white" : "border-transparent")} style={{ background: `linear-gradient(to right, ${color}, #FFC107)` }} />
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="bubbles" className="mt-4">
                        <Tabs defaultValue="shapes" className='w-full'>
                            <TabsList className='grid w-full grid-cols-4'>
                                <TabsTrigger value="shapes">Shapes</TabsTrigger>
                                <TabsTrigger value="colors">Colors</TabsTrigger>
                                <TabsTrigger value="gradients">Gradients</TabsTrigger>
                                <TabsTrigger value="neon">Neon</TabsTrigger>
                            </TabsList>
                            <div className='max-h-64 overflow-y-auto mt-4'>
                                <TabsContent value="shapes">
                                    <div className="grid grid-cols-3 gap-2 p-1">
                                        {customBubbleStyles.map(bubble => (
                                            <button 
                                                key={bubble.id} 
                                                onClick={() => setSelectedBubbleShape(bubble.id)} 
                                                className={cn("p-2 rounded-lg border-2 text-center transition-all", selectedBubbleShape === bubble.id ? 'border-purple-500' : 'border-transparent hover:border-purple-500/50')}
                                            >
                                                <div className={cn('p-3 text-xs leading-none bg-gray-500', bubble.className)}>
                                                    <span className={'text-white'}>Aa</span>
                                                </div>
                                                <span className="text-xs mt-2 block">{bubble.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </TabsContent>
                                <TabsContent value="colors">
                                    <div className="grid grid-cols-5 gap-2 p-1">
                                        {bubbleColors.map(bubble => (
                                            <button key={bubble.id} onClick={() => setSelectedBubbleFill(bubble.id)} className={cn("w-full h-10 rounded-md border-2", selectedBubbleFill === bubble.id ? 'border-white' : 'border-transparent')}>
                                                <div className={cn('w-full h-full rounded-md', bubble.className)} />
                                            </button>
                                        ))}
                                    </div>
                                </TabsContent>
                                <TabsContent value="gradients">
                                     <div className="grid grid-cols-5 gap-2 p-1">
                                        {bubbleGradients.map(bubble => (
                                            <button key={bubble.id} onClick={() => setSelectedBubbleFill(bubble.id)} className={cn("w-full h-10 rounded-md border-2", selectedBubbleFill === bubble.id ? 'border-white' : 'border-transparent')}>
                                                <div className={cn('w-full h-full rounded-md', bubble.className)} />
                                            </button>
                                        ))}
                                    </div>
                                </TabsContent>
                                <TabsContent value="neon">
                                     <div className="grid grid-cols-5 gap-2 p-1">
                                        {bubbleNeons.map(bubble => (
                                            <button key={bubble.id} onClick={() => setSelectedBubbleFill(bubble.id)} className={cn("w-full h-10 rounded-md border-2", selectedBubbleFill === bubble.id ? 'border-white' : 'border-transparent')}>
                                                <div className={cn('w-full h-full rounded-md', bubble.className)} />
                                            </button>
                                        ))}
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </TabsContent>
                </Tabs>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="font-style" className="text-sm font-medium text-gray-400">Font style</label>
                        <Select value={selectedFontStyle} onValueChange={setSelectedFontStyle}>
                            <SelectTrigger id="font-style" className="w-full bg-black/20 border-[#333] rounded-md mt-1">
                                <SelectValue placeholder="Select a style" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#212121] border-[#333] text-white">
                                {fontStyles.map(style => (
                                    <SelectItem key={style} value={style}>{style}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
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
            </div>

            <DialogFooter className="mt-6">
                <Button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-700">
                    <FontAwesomeIcon icon={faSave} className="mr-2 h-4 w-4" /> Save
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
