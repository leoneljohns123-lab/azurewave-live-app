
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
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { User, PlaylistItem, Square, NowPlaying, SongRequest } from '@/lib/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic, faPlay, faTrash, faRecordVinyl, faPause, faForwardStep, faUpload, faCheck, faSearch } from '@fortawesome/free-solid-svg-icons';
import { getEffectiveDisplayName } from '@/lib/user-helpers';
import { UserAvatar } from './user-avatar';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { YouTubeSearchDialog } from './youtube-search-dialog';
import Image from 'next/image';
import { useChat } from '@/context/chat-context';

// Playlist Tab
function PlaylistTab({ squareId, isDJ, onPlaySong }: { squareId: string; isDJ: boolean; onPlaySong: (song: PlaylistItem) => void; }) {
    const firestore = useFirestore();
    const { profile: currentUserProfile } = useEffectiveUserProfile();
    const { toast } = useToast();
    const [isYouTubeSearchOpen, setIsYouTubeSearchOpen] = useState(false);

    const playlistQuery = useMemoFirebase(() => {
        return query(
            collection(firestore, 'squares', squareId, 'playlist'),
            orderBy('addedAt', 'asc')
        );
    }, [firestore, squareId]);
    const { data: playlist, isLoading } = useCollection<PlaylistItem>(playlistQuery);

    const handleAddSong = (video: { id: string; title: string, thumbnail: string }) => {
        if (!currentUserProfile) return;

        const playlistCollection = collection(firestore, 'squares', squareId, 'playlist');
        addDocumentNonBlocking(playlistCollection, {
            youtubeId: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            addedBy: getEffectiveDisplayName(currentUserProfile),
            addedAt: new Date().toISOString(),
        });
        toast({ title: 'Song Added', description: `${video.title} was added to the playlist.` });
    };

    const handleRequestSong = (video: { id: string; title: string; thumbnail: string }) => {
        if (!currentUserProfile) return;
        const requestsCollection = collection(firestore, 'squares', squareId, 'songRequests');
        addDocumentNonBlocking(requestsCollection, {
            squareId: squareId,
            requesterId: currentUserProfile.id,
            requesterName: getEffectiveDisplayName(currentUserProfile),
            songName: video.title,
            timestamp: new Date().toISOString(),
            status: 'pending',
        });
        toast({ title: 'Song Requested!', description: `${video.title} has been requested.` });
    };

    const handleRemoveSong = (itemId: string) => {
        const itemRef = doc(firestore, 'squares', squareId, 'playlist', itemId);
        deleteDocumentNonBlocking(itemRef);
    };

    return (
        <div className="space-y-4">
            <Button onClick={() => setIsYouTubeSearchOpen(true)} className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/30">
                <FontAwesomeIcon icon={faSearch} className="mr-2" /> {isDJ ? 'Search & Add' : 'Request a Song'}
            </Button>
            <h3 className="font-semibold text-white text-sm uppercase tracking-widest opacity-70">Up Next</h3>
            <ScrollArea className="h-64">
                <div className="space-y-1 pr-2">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />)
                    ) : playlist && playlist.length > 0 ? (
                        playlist.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl group hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">
                                <Image src={item.thumbnail} alt={item.title} width={64} height={48} className="w-16 h-12 object-cover rounded-lg shadow-lg" />
                                <div className="flex-1 overflow-hidden w-0">
                                    <p className="font-medium truncate text-white text-sm" title={item.title}>{item.title}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">By {item.addedBy}</p>
                                </div>
                                {isDJ && (
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400" onClick={() => onPlaySong(item)}>
                                            <FontAwesomeIcon icon={faPlay} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveSong(item.id)}>
                                            <FontAwesomeIcon icon={faTrash} />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-sm text-gray-400 py-8 italic">No songs in queue.</p>
                    )}
                </div>
            </ScrollArea>
            <YouTubeSearchDialog
                open={isYouTubeSearchOpen}
                onOpenChange={setIsYouTubeSearchOpen}
                onSelectVideo={isDJ ? handleAddSong : handleRequestSong}
                buttonLabel={isDJ ? 'Add' : 'Request'}
            />
        </div>
    );
}

// Requests Tab
function RequestsTab({ squareId, isDJ, onAddFromRequest }: { squareId: string; isDJ: boolean; onAddFromRequest: (songName: string) => void; }) {
    const firestore = useFirestore();

    const requestsQuery = useMemoFirebase(() => {
        return query(
            collection(firestore, 'squares', squareId, 'songRequests')
        );
    }, [firestore, squareId]);

    const { data: allRequests, isLoading } = useCollection<SongRequest>(requestsQuery);

    const requests = useMemo(() => {
        if (!allRequests) return null;
        const pendingRequests = allRequests.filter(req => req.status === 'pending');
        return pendingRequests.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [allRequests]);

    const handleAcceptRequest = (request: SongRequest) => {
        onAddFromRequest(request.songName);
        const requestRef = doc(firestore, 'squares', squareId, 'songRequests', request.id);
        updateDocumentNonBlocking(requestRef, { status: 'played' });
    };

    const handleDeclineRequest = (requestId: string) => {
        const requestRef = doc(firestore, 'squares', squareId, 'songRequests', requestId);
        updateDocumentNonBlocking(requestRef, { status: 'skipped' });
    };

    if (!isDJ) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center opacity-50">
                <FontAwesomeIcon icon={faMusic} className="h-12 w-12 mb-4" />
                <p className="text-sm">Only the DJ can manage requests.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[400px]">
            {isLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl bg-white/5" />)
            ) : requests && requests.length > 0 ? (
                requests.map(req => (
                    <div key={req.id} className="flex items-center gap-3 p-2 rounded-xl group hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">
                        <UserAvatar user={{ id: req.requesterId, displayName: req.requesterName, avatarUrl: '', username: req.requesterName, email: '' } as User} className="w-8 h-8" />
                        <div className="flex-1 overflow-hidden w-0">
                            <p className="font-medium truncate text-white text-sm" title={req.songName}>{req.songName}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">From {req.requesterName}</p>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400" onClick={() => handleAcceptRequest(req)}>
                                <FontAwesomeIcon icon={faPlay} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeclineRequest(req.id)}>
                                <FontAwesomeIcon icon={faTrash} />
                            </Button>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-center text-sm text-gray-400 py-16 italic">No pending requests.</p>
            )}
        </ScrollArea>
    )
}

export function DjPanelDialog({ open, onOpenChange, square, djUser, squareId }: { open: boolean; onOpenChange: (open: boolean) => void; square: Square | null; djUser: User | null; squareId: string; }) {
    const { profile: currentUserProfile } = useEffectiveUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const squareRef = useMemoFirebase(() => doc(firestore, 'squares', squareId), [firestore, squareId]);

    if (!square) return null;

    const isDJ = !!(currentUserProfile && square.djId === currentUserProfile.id);

    const handlePlaySong = (song: PlaylistItem) => {
        if (!isDJ || !squareRef) return;
        const nowPlayingData: NowPlaying = {
            youtubeId: song.youtubeId,
            title: song.title,
            isPlaying: true,
            startedAt: new Date().toISOString(),
        };
        updateDocumentNonBlocking(squareRef, { nowPlaying: nowPlayingData });
        toast({ title: 'Playing Now', description: song.title });
    };

    const handleTogglePlay = () => {
        if (!isDJ || !square.nowPlaying || !squareRef) return;
        updateDocumentNonBlocking(squareRef, { 'nowPlaying.isPlaying': !square.nowPlaying.isPlaying });
    }

    const handleNextSong = () => {
        if (!isDJ || !squareRef) return;
        updateDocumentNonBlocking(squareRef, { nowPlaying: null });
    };

    const addSongFromRequest = async (songName: string) => {
        if (!currentUserProfile || !squareRef) return;

        toast({ title: 'Processing Request...', description: `Searching for "${songName}"...` });

        try {
            const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
            if (!apiKey) {
                toast({ variant: 'destructive', title: 'API Error', description: 'YouTube service is not configured.' });
                return;
            }
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(songName)}&type=video&key=${apiKey}&maxResults=1`
            );
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                const video = {
                    id: item.id.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
                };

                const playlistCollection = collection(firestore, 'squares', squareId, 'playlist');
                addDocumentNonBlocking(playlistCollection, {
                    youtubeId: video.id,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    addedBy: getEffectiveDisplayName(currentUserProfile),
                    addedAt: new Date().toISOString(),
                });

                updateDocumentNonBlocking(squareRef, {
                    nowPlaying: {
                        youtubeId: video.id,
                        title: video.title,
                        isPlaying: true,
                        startedAt: new Date().toISOString(),
                    }
                });

                toast({ title: 'Success', description: `${video.title} is now playing.` });
            } else {
                toast({ variant: 'destructive', title: 'Not Found', description: `Could not find "${songName}".` });
            }
        } catch (error) {
            console.error('Error adding song from request:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to process request.' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg p-0 text-white bg-cover bg-center rounded-3xl overflow-hidden shadow-2xl border-white/10" style={{ backgroundImage: square.djPanelBackground ? `url(${square.djPanelBackground})` : undefined }}>
                <div className="bg-slate-950/80 backdrop-blur-xl h-full w-full p-6">
                    <DialogHeader className="text-center mb-6">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/30">
                                <FontAwesomeIcon icon={faMusic} />
                            </div>
                            <DialogTitle className="text-2xl font-black tracking-tighter">DJ PANEL</DialogTitle>
                        </div>
                        <DialogDescription className="text-gray-400 font-medium">
                            Broadcast hits to <span className="text-white font-bold">{square.name}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="playlist" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-white/5 rounded-2xl p-1 mb-6">
                            <TabsTrigger value="playlist" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Playlist</TabsTrigger>
                            <TabsTrigger value="requests" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Requests</TabsTrigger>
                        </TabsList>
                        <TabsContent value="playlist">
                            <PlaylistTab squareId={squareId} isDJ={isDJ} onPlaySong={handlePlaySong} />
                        </TabsContent>
                        <TabsContent value="requests">
                            <RequestsTab squareId={squareId} isDJ={isDJ} onAddFromRequest={addSongFromRequest} />
                        </TabsContent>
                    </Tabs>

                    {isDJ && square.nowPlaying && (
                        <div className="mt-8 flex items-center justify-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/10">
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full hover:bg-white/10" onClick={handleTogglePlay}>
                                <FontAwesomeIcon icon={square.nowPlaying.isPlaying ? faPause : faPlay} className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full hover:bg-white/10" onClick={handleNextSong}>
                                <FontAwesomeIcon icon={faForwardStep} className="h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
