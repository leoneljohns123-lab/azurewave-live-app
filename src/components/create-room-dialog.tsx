
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faGlobe, faLock } from '@fortawesome/free-solid-svg-icons';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const roomAvatarOptions = [
  "https://picsum.photos/seed/room1/100/100",
  "https://picsum.photos/seed/room2/100/100",
  "https://picsum.photos/seed/room3/100/100",
  "https://picsum.photos/seed/room4/100/100",
  "https://picsum.photos/seed/room5/100/100",
  "https://picsum.photos/seed/room6/100/100",
  "https://picsum.photos/seed/room7/100/100",
  "https://picsum.photos/seed/room8/100/100",
];

export function CreateRoomDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [roomType, setRoomType] = useState<'public' | 'private'>('public');
  const [avatarUrl, setAvatarUrl] = useState(roomAvatarOptions[0]);
  
  const firestore = useFirestore();
  const { user } = useUser();

  const handleCreateRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create a Square.',
      });
      return;
    }
    
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const roomName = formData.get('name') as string;
    const roomDescription = formData.get('description') as string;
    const password = formData.get('password') as string;

    if (!roomName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Square Name Required',
        description: 'Please provide a name for your Square.',
      });
      setIsCreating(false);
      return;
    }

    if (roomType === 'private' && !password) {
      toast({
        variant: 'destructive',
        title: 'Password Required',
        description: 'Private Squares require a password.',
      });
      setIsCreating(false);
      return;
    }

    const roomsCollection = collection(firestore, 'chatRooms');

    const roomData: any = {
      name: roomName,
      description: roomDescription,
      creatorId: user.uid,
      type: roomType,
      avatarUrl: avatarUrl,
    };

    if (roomType === 'private') {
      roomData.password = password;
    }
    
    addDocumentNonBlocking(roomsCollection, roomData).then(() => {
      toast({
        title: 'Square Created!',
        description: `The Square "${roomName}" is now open.`,
      });
      setOpen(false);
    }).catch(() => {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Could not create the Square.",
        });
    }).finally(() => {
        setIsCreating(false);
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setRoomType('public');
      setAvatarUrl(roomAvatarOptions[0]);
    }
    setOpen(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlusCircle} className="mr-2 h-4 w-4" />
          Create Square
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 text-white">
        <form onSubmit={handleCreateRoom}>
          <DialogHeader className="p-6 pb-4 text-center">
            <DialogTitle className="text-2xl font-bold">Create a New Square</DialogTitle>
            <DialogDescription className="text-gray-300">
              Set up a new space for conversations and community.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Square Name</Label>
              <Input id="name" name="name" placeholder="e.g., General Discussion" required disabled={isCreating} className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="What is this Square about?" disabled={isCreating} className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg" />
            </div>
            
            <div className="space-y-2">
              <Label>Square Avatar</Label>
              <div className="grid grid-cols-4 gap-4">
                {roomAvatarOptions.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    className={cn(
                      'rounded-lg ring-offset-background focus:outline-none focus:ring-2 focus:ring-offset-[#2f194d]',
                      avatarUrl === url && 'ring-2 ring-[#e91e63]'
                    )}
                  >
                    <Image
                      src={url}
                      alt="Square avatar option"
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-md object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Square Type</Label>
              <RadioGroup
                  value={roomType}
                  onValueChange={(value) => setRoomType(value as 'public' | 'private')}
                  className="grid grid-cols-2 gap-4"
                  disabled={isCreating}
                  required
              >
                  <div>
                    <RadioGroupItem value="public" id="public" className="peer sr-only" />
                    <Label
                      htmlFor="public"
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                        "border-white/10 bg-black/20 text-gray-300",
                        "peer-hover:border-[#e91e63]/50 peer-hover:bg-[#e91e63]/10",
                        "peer-data-[state=checked]:border-[#e91e63] peer-data-[state=checked]:bg-[#e91e63]/20 peer-data-[state=checked]:text-white"
                      )}
                    >
                      <FontAwesomeIcon icon={faGlobe} className="mb-2 h-6 w-6 text-sky-400" />
                      <span className="font-bold">Public</span>
                      <span className="text-xs">Anyone can join</span>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="private" id="private" className="peer sr-only" />
                    <Label
                      htmlFor="private"
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-colors",
                        "border-white/10 bg-black/20 text-gray-300",
                        "peer-hover:border-[#e91e63]/50 peer-hover:bg-[#e91e63]/10",
                        "peer-data-[state=checked]:border-[#e91e63] peer-data-[state=checked]:bg-[#e91e63]/20 peer-data-[state=checked]:text-white"
                      )}
                    >
                      <FontAwesomeIcon icon={faLock} className="mb-2 h-6 w-6" />
                      <span className="font-bold">Private</span>
                      <span className="text-xs">Password required</span>
                    </Label>
                  </div>
              </RadioGroup>
            </div>

            {roomType === 'private' && (
                <div className="space-y-2 animate-in fade-in-0 zoom-in-95 duration-300">
                    <Label htmlFor="password">
                        Password
                    </Label>
                    <Input id="password" name="password" type="password" required disabled={isCreating} placeholder="Enter a password" className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12" />
                </div>
            )}
          </div>
          <DialogFooter className="p-6 bg-black/20">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isCreating} className="hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={isCreating} className="bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">
                {isCreating ? 'Creating...' : 'Confirm and Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
