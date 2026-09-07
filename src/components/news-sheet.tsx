
'use client';

import { Announcement } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faPlus, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { SidebarMenuButton, SidebarMenuItem } from './ui/sidebar';
import { useChat } from '@/context/chat-context';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { useToast } from '@/hooks/use-toast';
import { getEffectiveDisplayName } from '@/lib/user-helpers';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

function CreateAnnouncement() {
  const { profile } = useEffectiveUserProfile();
  const { hasPermission } = useChat();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'normal' | 'important'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const canPostAnnouncement = hasPermission(profile, 'sendGlobalAnnouncements');

  if (!canPostAnnouncement) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !content.trim()) return;
    setIsSubmitting(true);

    const announcementsCollection = collection(firestore, 'announcements');
    await addDocumentNonBlocking(announcementsCollection, {
      createdBy: getEffectiveDisplayName(profile),
      message: content.trim(),
      category: category,
      createdAt: new Date().toISOString(),
    });

    toast({ title: 'Announcement posted!'});
    setContent('');
    setCategory('normal');
    setIsSubmitting(false);
    setIsComposing(false);
  };

  if (!isComposing) {
    return (
      <div className="mb-4">
        <Button size="sm" onClick={() => setIsComposing(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
          Post Announcement
        </Button>
      </div>
    );
  }

  return (
    <Card className="bg-[#3a2269]/20 backdrop-blur-sm border-none text-white mb-4">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's the news?"
            className="resize-none bg-white/10 border-white/20 placeholder-purple-200/70"
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex justify-between items-center">
            <RadioGroup defaultValue="normal" value={category} onValueChange={(value) => setCategory(value as 'important' | 'normal')} className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="r-normal" />
                    <Label htmlFor="r-normal">Normal</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="important" id="r-important" />
                    <Label htmlFor="r-important">Important</Label>
                </div>
            </RadioGroup>
            <div className="flex items-center gap-2">
                 <Button type="button" variant="ghost" className="text-purple-300 hover:text-white" onClick={() => setIsComposing(false)} disabled={isSubmitting}>
                    Cancel
                 </Button>
                <Button type="submit" disabled={isSubmitting || !content.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <FontAwesomeIcon icon={faPaperPlane} className="mr-2" /> Post
                </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


function NewsCard({ announcement }: { announcement: Announcement }) {
    const isImportant = announcement.category === 'important';
    const iconSrc = isImportant ? '/special_badges/topic.svg' : '/special_badges/default.svg';

    return (
        <Card className="bg-[#3a2269]/20 backdrop-blur-sm border-none text-white">
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-black/20 flex items-center justify-center">
                    <Image src={iconSrc} alt="Announcement Icon" width={28} height={28} />
                </div>
                <div>
                    <p className="font-semibold">{announcement.createdBy}</p>
                    <p className="text-sm text-purple-300/80">
                        {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                <p className="whitespace-pre-wrap">{announcement.message}</p>
            </CardContent>
        </Card>
    );
}

function NewsSheetContent() {
    const firestore = useFirestore();
    const announcementsQuery = useMemoFirebase(() => query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc')), [firestore]);
    const { data: announcements, isLoading: isLoadingAnnouncements } = useCollection<Announcement>(announcementsQuery);

    return (
        <>
            <SheetHeader className="p-4 border-b border-white/10">
                <SheetTitle className="text-xl font-bold text-white">News & Announcements</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    <CreateAnnouncement />
                    {isLoadingAnnouncements ? (
                         <div className="space-y-6">
                            {[...Array(3)].map((_, i) => (
                                <Card key={i} className="bg-[#3a2269]/20 backdrop-blur-sm border-none">
                                    <CardHeader className="flex flex-row items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    </CardHeader>
                                    <CardContent>
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-4/5" />
                                    </CardContent>
                                </Card>
                            ))}
                         </div>
                    ) : announcements && announcements.length > 0 ? (
                        announcements.map(announcement => (
                            <NewsCard key={announcement.id} announcement={announcement} />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center pt-24 text-center text-purple-300/80">
                             <Image src="/interface_icons/nodata.svg" alt="No news" width={80} height={80} className="opacity-70" />
                            <p className="mt-4 text-base font-medium">No announcements yet</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </>
    );
}

export function NewsSheet() {
  const { isNewsOpen, setNewsOpen } = useChat();

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="News" onClick={() => setNewsOpen(true)}>
          <FontAwesomeIcon icon={faNewspaper} />
          <span>News</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <Sheet open={isNewsOpen} onOpenChange={setNewsOpen}>
        <SheetContent className="w-[400px] sm:w-[400px] p-0 flex flex-col bg-[#2e1550] border-l-0 text-white">
          <NewsSheetContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
