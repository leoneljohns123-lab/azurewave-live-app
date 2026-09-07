
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface YouTubeSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVideo: (video: { id: string; title: string; thumbnail: string }) => void;
  buttonLabel?: string;
}

interface YouTubeVideo {
    id: string;
    title: string;
    thumbnail: string;
}

export function YouTubeSearchDialog({ open, onOpenChange, onSelectVideo, buttonLabel = 'Select' }: YouTubeSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setResults([]);
    try {
      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
      if (!apiKey) {
          toast({ variant: 'destructive', title: 'API Key Missing', description: 'YouTube API key is not configured.' });
          setIsSearching(false);
          return;
      }
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          searchTerm
        )}&type=video&key=${apiKey}&maxResults=10`
      );
      const data = await response.json();

      if (data.error) {
        console.error('YouTube API Error:', data.error);
        toast({ variant: 'destructive', title: 'YouTube API Error', description: data.error.message });
        setIsSearching(false);
        return;
      }

      if (data.items) {
        const videoResults: YouTubeVideo[] = data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        }));
        setResults(videoResults);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
      toast({ variant: 'destructive', title: 'Search Failed', description: 'Could not fetch YouTube videos.' });
      setResults([]);
    }
    setIsSearching(false);
  };
  
  const handleSelect = (video: YouTubeVideo) => {
    onSelectVideo(video);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 text-white">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Search YouTube</DialogTitle>
          <DialogDescription>Search for a video to share in the chat.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-4">
            <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
                <Input
                    type="text"
                    placeholder="Search for videos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-black/20 border-white/10 placeholder:text-gray-400 rounded-lg"
                />
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSearching}>
                    {isSearching ? 'Searching...' : 'Search'}
                </Button>
            </form>
        </div>
        <ScrollArea className="h-80">
            <div className="p-6 pt-0 space-y-3">
                {isSearching ? (
                    <div className="text-center text-muted-foreground p-8">Searching...</div>
                ) : results.length > 0 ? (
                    results.map(video => (
                        <div key={video.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/10">
                            <Image src={video.thumbnail} alt={video.title} width={120} height={90} className="w-24 h-auto rounded-md object-cover" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold line-clamp-2">{video.title}</p>
                            </div>
                            <Button size="sm" onClick={() => handleSelect(video)}>{buttonLabel}</Button>
                        </div>
                    ))
                ) : (
                  <div className="text-center text-muted-foreground p-8">No results.</div>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
