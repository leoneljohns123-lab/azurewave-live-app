
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

interface GiphySearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGif: (gifUrl: string) => void;
}

interface GiphyResult {
    id: string;
    title: string;
    url: string;
}

export function GiphySearchDialog({ open, onOpenChange, onSelectGif }: GiphySearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<GiphyResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setResults([]);
    try {
      // Giphy API Key - user should set this in env
      const apiKey = "ESaueO9iNvGbeDcNFRLMVsTOu9AvgWFW";
      if (!apiKey) {
          toast({ variant: 'destructive', title: 'API Key Missing', description: 'Giphy API key is not configured.' });
          setIsSearching(false);
          return;
      }
      
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
          searchTerm
        )}&limit=20&rating=g`
      );
      const data = await response.json();

      if (data.meta && data.meta.status !== 200) {
        toast({ variant: 'destructive', title: 'Giphy API Error', description: data.meta.msg });
        setIsSearching(false);
        return;
      }

      if (data.data) {
        const gifResults: GiphyResult[] = data.data.map((item: any) => ({
          id: item.id,
          title: item.title,
          url: item.images.fixed_height.url,
        }));
        setResults(gifResults);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      toast({ variant: 'destructive', title: 'Search Failed', description: 'Could not fetch GIFs.' });
      setResults([]);
    }
    setIsSearching(false);
  };
  
  const handleSelect = (gifUrl: string) => {
    onSelectGif(gifUrl);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 text-white">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Search Giphy</DialogTitle>
          <DialogDescription>Find the perfect GIF to express yourself.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-4">
            <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
                <Input
                    type="text"
                    placeholder="Search for GIFs..."
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
            <div className="grid grid-cols-2 gap-2 p-6 pt-0">
                {isSearching ? (
                    <div className="col-span-2 text-center text-muted-foreground p-8">Searching...</div>
                ) : results.length > 0 ? (
                    results.map(gif => (
                        <div key={gif.id} className="relative aspect-video group cursor-pointer overflow-hidden rounded-lg bg-black/20" onClick={() => handleSelect(gif.url)}>
                            <Image 
                                src={gif.url} 
                                alt={gif.title} 
                                fill 
                                unoptimized
                                className="object-cover transition-transform group-hover:scale-110" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-xs font-bold">Select</span>
                            </div>
                        </div>
                    ))
                ) : (
                  <div className="col-span-2 text-center text-muted-foreground p-8">No results. Try searching for something!</div>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
