

'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/context/chat-context';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faUser, faImage, faCoins, faCamera, faUpload, faCheckCircle, faSpinner, faCertificate, faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User, UserBadge } from '@/lib/types';
import { getEarnedBadges } from '@/lib/badges';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, increment } from 'firebase/firestore';
import Image from 'next/image';
import { badgeDefinitions, BadgeDefinition } from '@/lib/badge-definitions';


interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit?: User;
}

const EDIT_COSTS = {
    name: 250,
    age: 150,
    gender: 350,
    about: 100,
    avatar: 100,
    banner: 300,
    displayBadge: 250,
};

export function ProfileDialog({ open, onOpenChange, userToEdit }: ProfileDialogProps) {
    const { currentUser: loggedInUser, users, addXp, hasFeaturePermission } = useChat();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const targetUser = userToEdit || loggedInUser;
    const isEditingSelf = !userToEdit || (loggedInUser?.id === userToEdit?.id);

    const [totalCost, setTotalCost] = useState(0);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const verificationPhotoInputRef = useRef<HTMLInputElement>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [selectedBadgeId, setSelectedBadgeId] = useState<string | null | undefined>(undefined);

    const earnedBadges = useMemo(() => getEarnedBadges(targetUser), [targetUser]);

    const groupedBadges = useMemo(() => {
        if (!earnedBadges) return [];
        const badgeMap = new Map<string, { definition: BadgeDefinition, count: number }>();
        earnedBadges.forEach(badge => {
            const badgeId = badge.id;
            if (!badgeMap.has(badgeId)) {
                const definition = badgeDefinitions.find(def => def.id === badgeId);
                if (definition) {
                    badgeMap.set(badgeId, { definition: definition, count: 0 });
                }
            }
            if (badgeMap.has(badgeId)) {
                badgeMap.get(badgeId)!.count++;
            }
        });
        return Array.from(badgeMap.values()).sort((a,b) => b.count - a.count);
      }, [earnedBadges]);


    const profileSchema = z.object({
        displayName: z.string()
            .min(2, "Name must be at least 2 characters.")
            .max(50, "Name cannot exceed 50 characters.")
            .refine(val => !users?.some(u => u.displayName === val && u.id !== targetUser?.id), {
                message: "This username is already taken.",
            }),
        about: z.string().max(160, "Bio cannot exceed 160 characters.").optional(),
        age: z.coerce.number().min(13, "You must be at least 13 years old.").max(120).optional(),
        gender: z.enum(['male', 'female', 'other', 'private']).optional(),
        instagram: z.string().optional(),
        tiktok: z.string().optional(),
        snapchat: z.string().optional(),
    });

    type ProfileFormValues = z.infer<typeof profileSchema>;

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            displayName: '',
            about: '',
            age: 13,
            gender: 'private',
            instagram: '',
            tiktok: '',
            snapchat: ''
        },
    });

    const watchedValues = useWatch({ control: form.control });

    useEffect(() => {
        if (targetUser) {
            form.reset({
                displayName: targetUser.displayName,
                about: targetUser.about || '',
                age: targetUser.age,
                gender: targetUser.gender || 'private',
                instagram: targetUser.instagram || '',
                tiktok: targetUser.tiktok || '',
                snapchat: targetUser.snapchat || '',
            });
            setAvatarPreview(targetUser.avatarUrl);
            setBannerPreview(targetUser.banner || null);
            setSelectedBadgeId(targetUser.displayBadgeId);
        }
    }, [targetUser, open, form]);


    useEffect(() => {
        const calculateCost = () => {
            if (!targetUser) return;
            let cost = 0;
            const isFirstEdit = !targetUser.profileEdits || targetUser.profileEdits === 0;

            if (!isFirstEdit) {
                 if (watchedValues.displayName !== targetUser.displayName) {
                    cost += EDIT_COSTS.name;
                }
                if (watchedValues.about !== (targetUser.about || '')) {
                    cost += EDIT_COSTS.about;
                }
                if (watchedValues.age !== targetUser.age) {
                    cost += EDIT_COSTS.age;
                }
                if (watchedValues.gender !== (targetUser.gender || 'private')) {
                    cost += EDIT_COSTS.gender;
                }
            }
            setTotalCost(cost);
        };
        calculateCost();
    }, [watchedValues, targetUser]);
    
    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        if (file.type.startsWith('video/')) {
            if (type !== 'banner') {
                toast({
                    variant: 'destructive',
                    title: 'Invalid File Type',
                    description: 'Videos can only be used for banners.',
                });
                event.target.value = '';
                return;
            }
    
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 5) {
                    toast({
                        variant: 'destructive',
                        title: 'Video Too Long',
                        description: 'Banner videos cannot exceed 5 seconds.',
                    });
                    event.target.value = '';
                    return;
                }
                
                const reader = new FileReader();
                reader.onloadend = () => {
                    setBannerPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            };
            video.src = URL.createObjectURL(file);
    
        } else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (type === 'avatar') {
                    setAvatarPreview(result);
                } else {
                    setBannerPreview(result);
                }
            };
            reader.readAsDataURL(file);
        } else {
            toast({
                variant: 'destructive',
                title: 'Unsupported File Type',
            });
            event.target.value = '';
        }
    }, [toast]);

    const updateUserProfile = (userId: string, data: Partial<User>) => {
        const userRef = doc(firestore, 'users', userId);
        updateDocumentNonBlocking(userRef, data);
    };

    const deductCost = (cost: number) => {
        if (loggedInUser && cost > 0) {
            updateUserProfile(loggedInUser.id, { gold: (loggedInUser.gold || 0) - cost });
        }
    };

    const onProfileSubmit = (data: ProfileFormValues) => {
        if (!targetUser || !loggedInUser) return;
        const isFirstEdit = !targetUser.profileEdits || targetUser.profileEdits === 0;

        if (!isFirstEdit && (loggedInUser.gold || 0) < totalCost) {
            toast({
                variant: 'destructive',
                title: 'Insufficient Gold',
            });
            return;
        }

        const updatePayload: { [key: string]: any } = {
            displayName: data.displayName.trim(),
            profileEdits: (targetUser.profileEdits || 0) + 1,
            about: data.about,
            age: data.age,
            gender: data.gender,
            instagram: data.instagram,
            tiktok: data.tiktok,
            snapchat: data.snapchat,
        };
        
        if (data.displayName.trim() !== targetUser.displayName) {
            const historyCollection = collection(firestore, 'username_history');
            addDocumentNonBlocking(historyCollection, {
                userId: targetUser.id,
                username: targetUser.displayName,
                changedAt: new Date().toISOString(),
            });
            updatePayload.username = data.displayName.trim();
            updatePayload.lowercaseUsername = data.displayName.trim().toLowerCase();
        }

        // Sanitize the payload before sending to Firestore
        Object.keys(updatePayload).forEach(key => {
            const value = updatePayload[key];
            // Remove keys with undefined values
            if (value === undefined) {
                delete updatePayload[key];
            }
            // Specifically for age, also remove if it's not a valid number (e.g., NaN)
            if (key === 'age' && (typeof value !== 'number' || isNaN(value))) {
                 delete updatePayload[key];
            }
        });

        updateUserProfile(targetUser.id, updatePayload as Partial<User>);

        if (!isFirstEdit) {
            deductCost(totalCost);
        }
        
        if (isEditingSelf) {
            if (data.about && !targetUser.about) {
                addXp(100); // XP for filling bio
            }
            if ((data.instagram && !targetUser.instagram) || (data.tiktok && !targetUser.tiktok) || (data.snapchat && !targetUser.snapchat)) {
                addXp(50); // XP for adding a social link
            }
        }
        
        toast({
            title: 'Profile Updated',
        });
        onOpenChange(false);
    }
    
    const handleAvatarSave = () => {
        if (!targetUser || !loggedInUser || !hasFeaturePermission(loggedInUser, 'profileAvatar')) {
            toast({ variant: 'destructive', title: 'Permission Denied'});
            return;
        }
        const isFirstAvatar = !targetUser.avatarUrl;
        const cost = isFirstAvatar ? 0 : EDIT_COSTS.avatar;

        if (!avatarPreview || avatarPreview === targetUser.avatarUrl) {
             toast({ title: 'No Change' });
             return;
        }
        if ((loggedInUser.gold || 0) < cost) {
            toast({ variant: 'destructive', title: 'Insufficient Gold' });
            return;
        }
        
        updateUserProfile(targetUser.id, { avatarUrl: avatarPreview });
        deductCost(cost);
        
        if(isEditingSelf && isFirstAvatar) addXp(75);

        toast({ title: 'Avatar Updated!' });
        onOpenChange(false);
    };

    const handleBannerSave = () => {
        if (!targetUser || !loggedInUser || !hasFeaturePermission(loggedInUser, 'profileBanner')) {
            toast({ variant: 'destructive', title: 'Permission Denied'});
            return;
        }
        const isFirstBanner = !targetUser.banner;
        const cost = isFirstBanner ? 0 : EDIT_COSTS.banner;

        if (!bannerPreview || bannerPreview === targetUser.banner) {
             toast({ title: 'No Change' });
             return;
        }
        if ((loggedInUser.gold || 0) < cost) {
            toast({ variant: 'destructive', title: 'Insufficient Gold' });
            return;
        }

        updateUserProfile(targetUser.id, { banner: bannerPreview });
        deductCost(cost);
        
        if(isEditingSelf && isFirstBanner) addXp(75);

        toast({ title: 'Banner Updated!' });
        onOpenChange(false);
    };

    const handleVerification = () => {
        if (!targetUser || !loggedInUser) return;
        setIsVerifying(true);
        // Simulate a verification process
        setTimeout(() => {
            if(isEditingSelf) addXp(200);

            updateUserProfile(targetUser.id, { 
                isVerified: true,
            });

            if (isEditingSelf) {
                 updateUserProfile(loggedInUser.id, {
                    rubies: (loggedInUser.rubies || 0) + 10,
                });
            }
            
            toast({
                title: 'Verification Successful!',
            });
            setIsVerifying(false);
            onOpenChange(false);
        }, 2000);
    }

    const handleBadgeSave = () => {
        if (!targetUser || !loggedInUser) return;

        const isFirstBadgeChoice = !targetUser.displayBadgeId;
        const cost = (selectedBadgeId === targetUser.displayBadgeId) ? 0 : (isFirstBadgeChoice ? 0 : EDIT_COSTS.displayBadge);
        
        if ((loggedInUser.gold || 0) < cost) {
            toast({
                variant: 'destructive',
                title: 'Insufficient Gold',
            });
            return;
        }

        updateUserProfile(targetUser.id, { displayBadgeId: selectedBadgeId });
        deductCost(cost);

        toast({ title: 'Display Badge Updated!' });
        onOpenChange(false);
    };

    const handleClearBadge = () => {
        setSelectedBadgeId(null);
    }

    if (!targetUser) {
        return null;
    }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg p-0 text-white">
            <DialogHeader className='p-6 pb-4 text-center'>
                <DialogTitle className='text-2xl font-bold'>
                    Edit Profile for {targetUser.displayName}
                </DialogTitle>
                <DialogDescription className="text-gray-300">
                    Make changes to this profile. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-black/20 mx-6 !w-[calc(100%-3rem)] rounded-lg p-1 h-auto">
                    <TabsTrigger value="profile" className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md h-auto py-2 text-xs sm:text-sm flex items-center gap-2"><FontAwesomeIcon icon={faUser} /> Profile</TabsTrigger>
                    <TabsTrigger value="avatar" disabled={!isEditingSelf || !hasFeaturePermission(loggedInUser, 'profileAvatar')} className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md h-auto py-2 text-xs sm:text-sm flex items-center gap-2"><FontAwesomeIcon icon={faImage} /> Avatar</TabsTrigger>
                    <TabsTrigger value="banner" disabled={!isEditingSelf || !hasFeaturePermission(loggedInUser, 'profileBanner')} className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md h-auto py-2 text-xs sm:text-sm flex items-center gap-2"><FontAwesomeIcon icon={faCamera} /> Banner</TabsTrigger>
                    <TabsTrigger value="badges" className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md h-auto py-2 text-xs sm:text-sm flex items-center gap-2"><FontAwesomeIcon icon={faCertificate} /> Badges</TabsTrigger>
                    <TabsTrigger value="verification" className="text-white/70 data-[state=active]:bg-[#9c27b0] data-[state=active]:text-white rounded-md h-auto py-2 text-xs sm:text-sm flex items-center gap-2"><FontAwesomeIcon icon={faCheckCircle} /> Verify</TabsTrigger>
                </TabsList>
                <div className='p-6'>
                    <TabsContent value="profile">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="displayName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Display Name (Cost: {(!targetUser.profileEdits || targetUser.profileEdits === 0) ? 'Free' : `${EDIT_COSTS.name} Gold`})</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Your Name" {...field} className='bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12'/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="about"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bio (Cost: {(!targetUser.profileEdits || targetUser.profileEdits === 0) ? 'Free' : `${EDIT_COSTS.about} Gold`})</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Tell us a little bit about yourself" className="resize-none bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg" {...field}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className='flex gap-4'>
                                <FormField
                                    control={form.control}
                                    name="age"
                                    render={({ field }) => (
                                        <FormItem className='flex-1'>
                                            <FormLabel>Age (Cost: {(!targetUser.profileEdits || targetUser.profileEdits === 0) ? 'Free' : `${EDIT_COSTS.age} Gold`})</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Your Age" {...field} className='bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg h-12' />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="gender"
                                    render={({ field }) => (
                                        <FormItem className='flex-1'>
                                            <FormLabel>Gender (Cost: {(!targetUser.profileEdits || targetUser.profileEdits === 0) ? 'Free' : `${EDIT_COSTS.gender} Gold`})</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                <SelectTrigger className='bg-black/20 border-white/10 rounded-lg h-12'>
                                                    <SelectValue placeholder="Select your gender" />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="bg-[#2f194d] border-white/10 text-white">
                                                    <SelectItem value="male">Male</SelectItem>
                                                    <SelectItem value="female">Female</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                    <SelectItem value="private">Prefer not to say</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                </div>
                                <DialogFooter className="p-6 bg-black/20 -m-6 mt-6">
                                    <div className='flex items-center gap-2 text-sm text-gray-300 mr-4'>
                                        <FontAwesomeIcon icon={faCoins} className='text-yellow-500' />
                                        <span>Total Cost: {totalCost} Gold</span>
                                    </div>
                                    <Button type="submit" className="bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">Save changes</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="avatar">
                       <div className='space-y-4 text-center'>
                            <Avatar className="h-32 w-32 mx-auto border-4 border-black/20 rounded-full">
                                <AvatarImage src={avatarPreview || undefined} />
                                <AvatarFallback className="text-4xl">{targetUser.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <input type="file" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" accept="image/jpeg, image/png" />
                            <Button variant="ghost" onClick={() => avatarInputRef.current?.click()} className="mx-auto hover:bg-white/10 hover:text-white">
                                <FontAwesomeIcon icon={faUpload} className="mr-2" />
                                Upload Image
                            </Button>
                             <DialogFooter className="!mt-8 p-6 bg-black/20 -m-6">
                                <div className='flex items-center gap-2 text-sm text-gray-300 mr-4'>
                                    <FontAwesomeIcon icon={faCoins} className='text-yellow-500' />
                                    <span>Cost: {!targetUser.avatarUrl ? 'Free' : `${EDIT_COSTS.avatar} Gold`}</span>
                                </div>
                                <Button onClick={handleAvatarSave} disabled={!avatarPreview || avatarPreview === targetUser.avatarUrl} className="bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">Save Avatar</Button>
                            </DialogFooter>
                       </div>
                    </TabsContent>
                     <TabsContent value="banner">
                       <div className='space-y-4 text-center'>
                            <div className="w-full aspect-[4/1] bg-black/20 rounded-lg border border-white/10 overflow-hidden">
                                {bannerPreview ? (
                                    bannerPreview.startsWith('data:video') ? (
                                        <video key={bannerPreview} src={bannerPreview} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                                    )
                                ) : <div className="w-full h-full bg-black/20" />}
                            </div>
                            <input type="file" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} className="hidden" accept="image/jpeg, image/png, video/mp4, video/webm" />
                            <Button variant="ghost" onClick={() => bannerInputRef.current?.click()} className="mx-auto hover:bg-white/10 hover:text-white">
                                <FontAwesomeIcon icon={faUpload} className="mr-2" />
                                Upload Image or Video
                            </Button>
                             <DialogFooter className="!mt-8 p-6 bg-black/20 -m-6">
                                <div className='flex items-center gap-2 text-sm text-gray-300 mr-4'>
                                    <FontAwesomeIcon icon={faCoins} className='text-yellow-500' />
                                    <span>Cost: {!targetUser.banner ? 'Free' : `${EDIT_COSTS.banner} Gold`}</span>
                                </div>
                                <Button onClick={handleBannerSave} disabled={!bannerPreview || bannerPreview === targetUser.banner} className="bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">Save Banner</Button>
                            </DialogFooter>
                       </div>
                    </TabsContent>
                    <TabsContent value="badges">
                        <div className="space-y-4">
                            <div className="text-center">
                                <h3 className="font-semibold">Your Badge Collection</h3>
                                <p className="text-sm text-gray-300">Select a badge to display next to your name.</p>
                            </div>
                            <ScrollArea className="h-64">
                                <div className="grid grid-cols-4 gap-4 pr-4">
                                {groupedBadges.map(({ definition: badge, count }) => {
                                        return (
                                            <button
                                                key={badge.id}
                                                className={cn(
                                                    "relative flex flex-col items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition-all border-2",
                                                    selectedBadgeId === badge.id ? 'border-[#e91e63] bg-[#e91e63]/20' : 'border-white/10 bg-black/20 hover:bg-black/40'
                                                )}
                                                onClick={() => setSelectedBadgeId(badge.id)}
                                            >
                                                <div className={cn("relative w-12 h-14 flex-shrink-0 flex items-center justify-center")} style={{clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'}}>
                                                    {badge.imageUrl ? (
                                                        <Image src={badge.imageUrl} alt={badge.name} width={24} height={24} className="h-6 w-6 object-contain" />
                                                    ) : (
                                                        badge.icon && <FontAwesomeIcon icon={badge.icon} className="h-5 w-5 text-yellow-400" />
                                                    )}
                                                </div>
                                                <p className="text-xs font-semibold truncate text-center">{badge.name}</p>
                                                {count > 1 && (
                                                    <div className="absolute -top-1 -right-1 w-6 h-6">
                                                        <Image src={`/badge/numbers/${count}.svg`} alt={`Count ${count}`} layout="fill" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                            <DialogFooter className="!mt-8 p-6 bg-black/20 -m-6">
                                <div className='flex items-center gap-2 text-sm text-gray-300 mr-4'>
                                    <FontAwesomeIcon icon={faCoins} className='text-yellow-500' />
                                    <span>Cost: {!targetUser.displayBadgeId ? 'Free' : `${EDIT_COSTS.displayBadge} Gold`}</span>
                                </div>
                                <Button variant="ghost" onClick={handleClearBadge} className="hover:bg-white/10 hover:text-white">
                                    <FontAwesomeIcon icon={faTimes} className="mr-2 h-4 w-4" /> Clear
                                </Button>
                                <Button onClick={handleBadgeSave} disabled={selectedBadgeId === targetUser.displayBadgeId} className="bg-gradient-to-r from-[#e91e63] to-[#9c27b0]">
                                    <FontAwesomeIcon icon={faSave} className="mr-2 h-4 w-4" /> Save Badge
                                </Button>
                            </DialogFooter>
                        </div>
                    </TabsContent>
                    <TabsContent value="verification">
                       <div className='space-y-6 text-center py-4'>
                            {targetUser.isVerified ? (
                                <div className='flex flex-col items-center gap-4 text-green-400'>
                                    <FontAwesomeIcon icon={faCheckCircle} className="h-16 w-16" />
                                    <p className='font-bold text-lg'>This user is verified!</p>
                                    <p className='text-sm text-gray-300'>The "Authenticated Member" badge has been added to their collection.</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <h3 className='font-semibold text-lg'>Verify Account</h3>
                                        <p className='text-sm text-gray-300 mt-1'>Upload a photo holding a piece of paper with the username written on it. This is a mock verification process.</p>
                                    </div>
                                    <input type="file" ref={verificationPhotoInputRef} className="hidden" accept="image/jpeg, image/png" />
                                    <Button variant="ghost" onClick={() => verificationPhotoInputRef.current?.click()} className="hover:bg-white/10 hover:text-white">
                                        <FontAwesomeIcon icon={faCamera} className="mr-2" />
                                        Upload Verification Photo
                                    </Button>
                                    <DialogFooter className="!mt-8 p-6 bg-black/20 -m-6">
                                        <Button className='w-full bg-gradient-to-r from-[#e91e63] to-[#9c27b0]' onClick={handleVerification} disabled={isVerifying}>
                                            {isVerifying && <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />}
                                            {isVerifying ? 'Verifying...' : 'Start Verification'}
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                       </div>
                    </TabsContent>
                </div>
            </Tabs>
        </DialogContent>
    </Dialog>
  );
}
