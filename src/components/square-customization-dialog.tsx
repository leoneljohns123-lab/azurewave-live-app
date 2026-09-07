
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
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useFirestore, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { collection, doc, getDocs, query, where, writeBatch, deleteField } from 'firebase/firestore';
import { Square, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { Switch } from './ui/switch';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload } from '@fortawesome/free-solid-svg-icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEffectiveDisplayName } from '@/lib/user-helpers';

interface SquareCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  square: Square;
  allUsers: User[];
}

export function SquareCustomizationDialog({ open, onOpenChange, square, allUsers }: SquareCustomizationDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isUpdating, setIsUpdating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [djPanelBackground, setDjPanelBackground] = useState('');
  const [djId, setDjId] = useState('none');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVipOnly, setIsVipOnly] = useState(false);
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [isStaffOnly, setIsStaffOnly] = useState(false);
  const [isMembersOnly, setIsMembersOnly] = useState(false);
  const [isCallEnabled, setIsCallEnabled] = useState(false);
  const [isQuizEnabled, setIsQuizEnabled] = useState(false);
  const [isQbotEnabled, setIsQbotEnabled] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [slowModeDelay, setSlowModeDelay] = useState(0);
  const [muteNewUsersDuration, setMuteNewUsersDuration] = useState(0);
  const [requiredLevelToChat, setRequiredLevelToChat] = useState(0);

  const { profile: currentUserProfile } = useEffectiveUserProfile();

  const squareMembers = useMemo(() => {
    if (!allUsers || !square.memberIds) return [];
    const memberIdSet = new Set(square.memberIds);
    return allUsers.filter(user => memberIdSet.has(user.id));
  }, [allUsers, square.memberIds]);

  useEffect(() => {
    if (square) {
      setName(square.name);
      setDescription(square.description);
      setAvatarUrl(square.avatarUrl || '');
      setBackgroundUrl(square.backgroundUrl || '');
      setDjPanelBackground(square.djPanelBackground || '');
      setDjId(square.djId || 'none');
      setIsFeatured(!!square.isFeatured);
      setIsVerified(!!square.isVerified);
      setIsVipOnly(!!square.isVipOnly);
      setIsAdminOnly(!!square.isAdminOnly);
      setIsStaffOnly(!!square.isStaffOnly);
      setIsMembersOnly(!!square.isMembersOnly);
      setIsCallEnabled(!!square.isCallEnabled);
      setIsQuizEnabled(!!square.isQuizEnabled);
      setIsQbotEnabled(!!square.isQbotEnabled);
      setPassword(''); // Always clear password for security
      setUploadProgress(null);
      setSlowModeDelay(square.slowModeDelay || 0);
      setMuteNewUsersDuration(square.muteNewUsersDuration || 0);
      setRequiredLevelToChat(square.requiredLevelToChat || 0);
    }
  }, [square, open]);

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


  const handleUpdateSquare = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);

    const updates: { [key: string]: any } = {};

    if (name.trim() && name.trim() !== square.name) updates.name = name.trim();
    if (description !== square.description) updates.description = description;
    if (avatarUrl !== (square.avatarUrl || '')) updates.avatarUrl = avatarUrl;
    if (backgroundUrl !== (square.backgroundUrl || '')) updates.backgroundUrl = backgroundUrl;
    if (djPanelBackground !== (square.djPanelBackground || '')) updates.djPanelBackground = djPanelBackground;
    
    const finalDjId = djId === 'none' ? deleteField() : djId;
    if (finalDjId !== (square.djId || '')) updates.djId = finalDjId;
    
    if (square.type === 'private' && password) updates.password = password;
    if (isFeatured !== !!square.isFeatured) updates.isFeatured = isFeatured;
    if (isVerified !== !!square.isVerified) updates.isVerified = isVerified;
    if (isVipOnly !== !!square.isVipOnly) updates.isVipOnly = isVipOnly;
    if (isAdminOnly !== !!square.isAdminOnly) updates.isAdminOnly = isAdminOnly;
    if (isStaffOnly !== !!square.isStaffOnly) updates.isStaffOnly = isStaffOnly;
    if (isMembersOnly !== !!square.isMembersOnly) updates.isMembersOnly = isMembersOnly;
    if (isCallEnabled !== !!square.isCallEnabled) updates.isCallEnabled = isCallEnabled;
    if (isQuizEnabled !== !!square.isQuizEnabled) updates.isQuizEnabled = isQuizEnabled;
    if (isQbotEnabled !== !!square.isQbotEnabled) updates.isQbotEnabled = isQbotEnabled;

    if (slowModeDelay !== (square.slowModeDelay || 0)) updates.slowModeDelay = slowModeDelay > 0 ? slowModeDelay : deleteField();
    if (muteNewUsersDuration !== (square.muteNewUsersDuration || 0)) updates.muteNewUsersDuration = muteNewUsersDuration > 0 ? muteNewUsersDuration : deleteField();
    if (requiredLevelToChat !== (square.requiredLevelToChat || 0)) updates.requiredLevelToChat = requiredLevelToChat > 0 ? requiredLevelToChat : deleteField();

    if (Object.keys(updates).length === 0) {
        toast({ title: 'No Changes', description: 'You did not make any changes.' });
        setIsUpdating(false);
        onOpenChange(false);
        return;
    }

    try {
        const squareRef = doc(firestore, 'squares', square.id);
        
        if (updates.isFeatured) {
            const squaresCollectionRef = collection(firestore, 'squares');
            const q = query(squaresCollectionRef, where("isFeatured", "==", true));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const batch = writeBatch(firestore);
                querySnapshot.forEach(docSnap => {
                    if (docSnap.id !== square.id) {
                        batch.update(docSnap.ref, { isFeatured: false });
                    }
                });
                await batch.commit();
            }
        }
        
        updateDocumentNonBlocking(squareRef, updates);
        toast({ title: 'Square Updated!', description: 'Your Square details have been saved.' });
    } catch (error) {
        console.error("Error updating Square:", error);
        toast({ variant: "destructive", title: "Update Failed", description: "Could not save your changes." });
    }

    setIsUpdating(false);
    onOpenChange(false);
  };
  
  const canManageVip = currentUserProfile && ['Owner', 'Super Admin', 'Admin'].includes(currentUserProfile.role || '');
  const canManageAdmin = currentUserProfile && ['Owner', 'Super Admin'].includes(currentUserProfile.role || '');
  const canManageStaff = currentUserProfile && ['Owner', 'Super Admin'].includes(currentUserProfile.role || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full p-0 text-white">
        <form onSubmit={handleUpdateSquare}>
          <DialogHeader className="p-6 pb-4 text-center">
            <DialogTitle className="text-2xl font-bold">Customize Square</DialogTitle>
            <DialogDescription className="text-gray-300">
              Edit the details for "{square.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-black/20 rounded-lg p-1 h-auto">
                <TabsTrigger value="general" className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md">General</TabsTrigger>
                <TabsTrigger value="dj" className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md">DJ</TabsTrigger>
                <TabsTrigger value="appearance" className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md">Appearance</TabsTrigger>
                <TabsTrigger value="permissions" className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md">Permissions</TabsTrigger>
              </TabsList>
              
              <div className="mt-6 max-h-[50vh] overflow-y-auto pr-2">
                <TabsContent value="general" className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Square Name</Label>
                      <Input id="name" value={name} onChange={e => setName(e.target.value)} required disabled={isUpdating} className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} disabled={isUpdating} className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg" />
                    </div>
                    {square.type === 'private' && (
                      <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input id="password" value={password} onChange={e => setPassword(e.target.value)} type="password" disabled={isUpdating} placeholder="Enter a new password" className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12" />
                        <p className="text-xs text-gray-400">Leave blank to keep the current password.</p>
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="dj" className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="dj">On-Air DJ</Label>
                        <Select value={djId} onValueChange={setDjId} disabled={isUpdating}>
                            <SelectTrigger id="dj" className="w-full bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12">
                                <SelectValue placeholder="Select a DJ" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2f194d] border-white/10 text-white">
                                <SelectItem value="none">None</SelectItem>
                                {squareMembers.map(member => (
                                <SelectItem key={member.id} value={member.id}>
                                    {getEffectiveDisplayName(member)}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">Select a user to be the DJ for this room.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="djPanelBackground">DJ Panel Background URL</Label>
                        <Input
                            id="djPanelBackground"
                            value={djPanelBackground}
                            onChange={e => setDjPanelBackground(e.target.value)}
                            placeholder="Paste an image URL..."
                            disabled={isUpdating}
                            className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                   <div className="space-y-2">
                        <Label htmlFor="avatarUrl">Square Avatar</Label>
                        <div className="flex items-center gap-4">
                            <Image
                            src={avatarUrl || `https://picsum.photos/seed/${square.id}/100/100`}
                            alt="Square avatar preview"
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-md object-cover bg-black/20"
                            />
                            <div className="flex-1 space-y-2">
                            <Input
                                id="avatarUrl"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="Or paste an image URL"
                                disabled={isUpdating || uploadProgress !== null}
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
                    <div className="space-y-2">
                        <Label htmlFor="backgroundUrl">Background Image URL</Label>
                        <Input
                        id="backgroundUrl"
                        value={backgroundUrl}
                        onChange={e => setBackgroundUrl(e.target.value)}
                        placeholder="Paste an image URL..."
                        disabled={isUpdating}
                        className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12"
                        />
                    </div>
                </TabsContent>
                
                <TabsContent value="permissions" className="space-y-4">
                     <div className="space-y-2">
                        <Label>Access Restrictions</Label>
                        {canManageVip && (
                            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-black/20 border-white/10">
                                <Label htmlFor="vip-only-switch" className="cursor-pointer">VIP Only</Label>
                                <Switch id="vip-only-switch" checked={isVipOnly} onCheckedChange={setIsVipOnly} disabled={isUpdating} />
                            </div>
                        )}
                        {canManageAdmin && (
                            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-black/20 border-white/10">
                                <Label htmlFor="admin-only-switch" className="cursor-pointer">Admins Only</Label>
                                <Switch id="admin-only-switch" checked={isAdminOnly} onCheckedChange={setIsAdminOnly} disabled={isUpdating} />
                            </div>
                        )}
                         {canManageStaff && (
                            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-black/20 border-white/10">
                                <Label htmlFor="staff-only-switch" className="cursor-pointer">Staff Only</Label>
                                <Switch id="staff-only-switch" checked={isStaffOnly} onCheckedChange={setIsStaffOnly} disabled={isUpdating} />
                            </div>
                        )}
                         <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-black/20 border-white/10">
                            <Label htmlFor="members-only-switch" className="cursor-pointer">Members Only</Label>
                            <Switch id="members-only-switch" checked={isMembersOnly} onCheckedChange={setIsMembersOnly} disabled={isUpdating} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Feature Toggles</Label>
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-black/20 border-white/10">
                            <Label htmlFor="call-enabled-switch" className="cursor-pointer">Enable Video Call</Label>
                            <Switch id="call-enabled-switch" checked={isCallEnabled} onCheckedChange={setIsCallEnabled} disabled={isUpdating} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="slow-mode">Slow Mode (seconds)</Label>
                        <Input
                            id="slow-mode"
                            type="number"
                            value={slowModeDelay}
                            onChange={e => setSlowModeDelay(Number(e.target.value))}
                            placeholder="0 for off"
                            disabled={isUpdating}
                            className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12"
                            min="0"
                        />
                        <p className="text-xs text-gray-400">Time users must wait between messages. 0 to disable.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mute-new-users">Mute New Users (minutes)</Label>
                        <Input
                            id="mute-new-users"
                            type="number"
                            value={muteNewUsersDuration}
                            onChange={e => setMuteNewUsersDuration(Number(e.target.value))}
                            placeholder="0 for off"
                            disabled={isUpdating}
                            className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12"
                            min="0"
                        />
                        <p className="text-xs text-gray-400">Automatically mute new users in this room for a set duration. 0 to disable.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="required-level">Required Level to Chat</Label>
                        <Input
                            id="required-level"
                            type="number"
                            value={requiredLevelToChat}
                            onChange={e => setRequiredLevelToChat(Number(e.target.value))}
                            placeholder="0 for no restriction"
                            disabled={isUpdating}
                            className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12"
                            min="0"
                        />
                        <p className="text-xs text-gray-400">Minimum level required for users to send messages. 0 for no restriction.</p>
                      </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
          <DialogFooter className="p-6 bg-black/20">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isUpdating} className="hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={isUpdating} className="bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">
                {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    