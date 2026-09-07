
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
import { faPlusCircle, faGlobe, faLock, faUpload } from '@fortawesome/free-solid-svg-icons';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, increment } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Switch } from './ui/switch';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';

export function CreateSquareDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [squareType, setSquareType] = useState<'public' | 'private'>('public');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile: userProfile } = useEffectiveUserProfile();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        
        setUploadProgress(0);
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev === null || prev >= 100) {
                    clearInterval(progressInterval);
                    return prev;
                }
                return Math.min(prev + 10, 100);
            });
        }, 50);

        reader.onloadend = () => {
            setAvatarUrl(reader.result as string);
            clearInterval(progressInterval);
            setUploadProgress(100);
            setTimeout(() => setUploadProgress(null), 500);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleCreateSquare = (e: React.FormEvent<HTMLFormElement>) => {
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
    const squareName = formData.get('name') as string;
    const squareDescription = formData.get('description') as string;
    const password = formData.get('password') as string;
    const isVipOnly = (formData.get('isVipOnly') as string) === 'on';
    const isAdminOnly = (formData.get('isAdminOnly') as string) === 'on';
    const isStaffOnly = (formData.get('isStaffOnly') as string) === 'on';
    const isMembersOnly = (formData.get('isMembersOnly') as string) === 'on';

    if (!squareName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Square Name Required',
        description: 'Please provide a name for your Square.',
      });
      setIsCreating(false);
      return;
    }

    if (squareType === 'private' && !password) {
      toast({
        variant: 'destructive',
        title: 'Password Required',
        description: 'Private Squares require a password.',
      });
      setIsCreating(false);
      return;
    }

    const squaresCollection = collection(firestore, 'squares');

    const squareData: any = {
      name: squareName,
      description: squareDescription,
      creatorId: user.uid,
      type: squareType,
      avatarUrl: avatarUrl || `https://picsum.photos/seed/${new Date().getTime()}/100/100`,
      isVipOnly: isVipOnly,
      isAdminOnly: isAdminOnly,
      isStaffOnly: isStaffOnly,
      isMembersOnly: isMembersOnly,
    };

    if (squareType === 'private') {
      squareData.password = password;
    }
    
    addDocumentNonBlocking(squaresCollection, squareData).then(() => {
      toast({
        title: 'Square Created!',
        description: `The Square "${squareName}" is now open.`,
      });
      const userRef = doc(firestore, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { xp: increment(50) });
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
      setSquareType('public');
      setAvatarUrl('');
      setUploadProgress(null);
    }
    setOpen(isOpen);
  }
  
  const canCreateVipRoom = userProfile && ['Owner', 'Super Admin', 'Admin'].includes(userProfile.role || '');
  const canCreateAdminRoom = userProfile && ['Owner', 'Super Admin', 'Admin'].includes(userProfile.role || '');
  const canCreateStaffRoom = userProfile && ['Owner', 'Super Admin', 'Admin'].includes(userProfile.role || '');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlusCircle} className="mr-2 h-4 w-4" />
          Create Square
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 text-white">
        <form onSubmit={handleCreateSquare}>
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
              <Label htmlFor="avatarUrl-create">Square Avatar</Label>
              <div className="flex items-center gap-4">
                <Image
                  src={avatarUrl || `https://picsum.photos/seed/placeholder/100/100`}
                  alt="Square avatar preview"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-md object-cover bg-black/20"
                />
                <div className="flex-1 space-y-2">
                  <Input
                    id="avatarUrl-create"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Or paste an image URL"
                    disabled={isCreating || uploadProgress !== null}
                    className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12"
                  />
                  <input type="file" ref={avatarInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()} className="w-full bg-black/20 border-white/10 hover:bg-black/30 relative overflow-hidden" disabled={uploadProgress !== null}>
                      {uploadProgress !== null && (
                          <div className="absolute top-0 left-0 h-full bg-green-500/50" style={{ width: `${uploadProgress}%`, transition: 'width 0.1s linear' }} />
                      )}
                      <span className="relative z-10 flex items-center">
                          <FontAwesomeIcon icon={faUpload} className="mr-2 h-4 w-4" />
                          {uploadProgress !== null ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload from file'}
                      </span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Square Type</Label>
              <RadioGroup
                  value={squareType}
                  onValueChange={(value) => setSquareType(value as 'public' | 'private')}
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

            {squareType === 'private' && (
                <div className="space-y-2 animate-in fade-in-0 zoom-in-95 duration-300">
                    <Label htmlFor="password">
                        Password
                    </Label>
                    <Input id="password" name="password" type="password" required disabled={isCreating} placeholder="Enter a password" className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12" />
                </div>
            )}
            
            <div className='space-y-2'>
              {canCreateVipRoom && (
                  <div className="flex items-center justify-between rounded-lg border-2 p-4 border-white/10 bg-black/20">
                      <Label htmlFor="vip-only-switch" className="flex flex-col space-y-1">
                          <span>VIP Only Room</span>
                          <span className="font-normal text-sm text-gray-300">
                              Restrict access to VIP users only.
                          </span>
                      </Label>
                      <Switch id="vip-only-switch" name="isVipOnly" disabled={isCreating} />
                  </div>
              )}
              {canCreateAdminRoom && (
                  <div className="flex items-center justify-between rounded-lg border-2 p-4 border-white/10 bg-black/20">
                      <Label htmlFor="admin-only-switch" className="flex flex-col space-y-1">
                          <span>Admin Only Room</span>
                      </Label>
                      <Switch id="admin-only-switch" name="isAdminOnly" disabled={isCreating} />
                  </div>
              )}
               {canCreateStaffRoom && (
                  <div className="flex items-center justify-between rounded-lg border-2 p-4 border-white/10 bg-black/20">
                      <Label htmlFor="staff-only-switch" className="flex flex-col space-y-1">
                          <span>Staff Only Room</span>
                      </Label>
                      <Switch id="staff-only-switch" name="isStaffOnly" disabled={isCreating} />
                  </div>
              )}
               <div className="flex items-center justify-between rounded-lg border-2 p-4 border-white/10 bg-black/20">
                    <Label htmlFor="members-only-switch" className="flex flex-col space-y-1">
                        <span>Members Only Room</span>
                    </Label>
                    <Switch id="members-only-switch" name="isMembersOnly" disabled={isCreating} />
                </div>
            </div>
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
