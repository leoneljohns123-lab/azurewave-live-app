
'use client';

import { Square, PlaylistItem } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Button } from './ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faForward, faBackward, faVideo } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';
import { DraggableYouTubePlayer } from './dj-player';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';

interface FloatingDjControlsProps {
    square: Square;
    squareId: string;
}

export function FloatingDjControls({ square, squareId }: FloatingDjControlsProps) {
    const firestore = useFirestore();
    const { nowPlaying } = square;
    const [isVisible, setIsVisible] = useState(false);
    const [showVideo, setShowVideo] = useState(false);

    const { profile: currentUserProfile } = useEffectiveUserProfile();
    const isDJ = currentUserProfile?.id === square.djId;

    const [localIsPlaying, setLocalIsPlaying] = useState(true);

    // Draggable state
    const [position, setPosition] = useState({ x: 16, y: typeof window !== 'undefined' ? window.innerHeight - 80 : 500 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartOffset = useRef({ x: 0, y: 0 });
    const controlsRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        if (nowPlaying) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [nowPlaying]);

    useEffect(() => {
        if (!nowPlaying) {
            setShowVideo(false);
        }
    }, [nowPlaying]);

    useEffect(() => {
        if (nowPlaying?.isPlaying !== undefined) {
            setLocalIsPlaying(nowPlaying.isPlaying);
        }
    }, [nowPlaying?.isPlaying]);

    const playlistQuery = useMemoFirebase(() => {
        return query(
            collection(firestore, 'squares', squareId, 'playlist'),
            orderBy('addedAt', 'asc')
        );
    }, [firestore, squareId]);
    const { data: playlist } = useCollection<PlaylistItem>(playlistQuery);

    const handleTogglePlay = () => {
        if (isDJ) {
            if (!nowPlaying) return;
            const squareRef = doc(firestore, 'squares', squareId);
            updateDocumentNonBlocking(squareRef, { 'nowPlaying.isPlaying': !nowPlaying.isPlaying });
        } else {
            setLocalIsPlaying(prev => !prev);
        }
    };

    const playSong = (song: PlaylistItem) => {
        if (!isDJ) return;
        const squareRef = doc(firestore, 'squares', squareId);
        updateDocumentNonBlocking(squareRef, {
            nowPlaying: {
                youtubeId: song.youtubeId,
                title: song.title,
                isPlaying: true,
                startedAt: new Date().toISOString(),
            }
        });
    }

    const handleNext = () => {
        if (!isDJ || !playlist || playlist.length === 0) return;
        const currentIndex = nowPlaying ? playlist.findIndex(item => item.youtubeId === nowPlaying.youtubeId) : -1;
        let nextIndex = (currentIndex + 1) % playlist.length;
        const nextSong = playlist[nextIndex];
        if (nextSong) playSong(nextSong);
    };

    const handlePrevious = () => {
        if (!isDJ || !playlist || playlist.length === 0) return;
        const currentIndex = nowPlaying ? playlist.findIndex(item => item.youtubeId === nowPlaying.youtubeId) : -1;
        const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        const prevSong = playlist[prevIndex];
        if (prevSong) playSong(prevSong);
    };

    const handleDragStart = (clientX: number, clientY: number) => {
        if (controlsRef.current) {
            setIsDragging(true);
            const rect = controlsRef.current.getBoundingClientRect();
            dragStartOffset.current = {
                x: clientX - rect.left,
                y: clientY - rect.top,
            };
        }
    };

    const handleDragMove = (clientX: number, clientY: number) => {
        if (isDragging) {
            setPosition({
                x: clientX - dragStartOffset.current.x,
                y: clientY - dragStartOffset.current.y,
            });
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        handleDragStart(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        handleDragStart(touch.clientX, touch.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
        handleDragMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPosition({ x: 16, y: window.innerHeight - 80 });
        }
    }, []);

    if (!isVisible) {
        return null;
    }

    return (
        <>
            <div
                ref={controlsRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={cn(
                    "fixed z-[100] flex w-60 items-center space-x-2 overflow-hidden rounded-full border bg-background/60 p-1.5 pr-4 text-foreground shadow-lg backdrop-blur-md transition-opacity duration-300 cursor-move",
                    nowPlaying ? 'opacity-100' : 'opacity-0'
                )}
                style={{ left: `${position.x}px`, top: `${position.y}px` }}
            >
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={handlePrevious} disabled={!isDJ}>
                        <FontAwesomeIcon icon={faBackward} className="h-3 w-3" />
                    </Button>
                    <Button variant="default" size="icon" className="h-8 w-8 rounded-full shadow-md" onClick={handleTogglePlay}>
                        <FontAwesomeIcon icon={(isDJ ? nowPlaying?.isPlaying : localIsPlaying) ? faPause : faPlay} className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={handleNext} disabled={!isDJ}>
                        <FontAwesomeIcon icon={faForward} className="h-3 w-3" />
                    </Button>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-primary truncate leading-tight">{nowPlaying?.title || '...'}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight uppercase font-black opacity-70">On Air</p>
                </div>
                <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-full", showVideo && "text-primary")} onClick={() => setShowVideo(!showVideo)}>
                    <FontAwesomeIcon icon={faVideo} className="h-3 w-3" />
                </Button>
            </div>

            {nowPlaying && (
                <DraggableYouTubePlayer
                    key={nowPlaying.youtubeId}
                    videoId={nowPlaying.youtubeId}
                    title={nowPlaying.title}
                    onClose={() => setShowVideo(false)}
                    isPlaying={isDJ ? nowPlaying.isPlaying : localIsPlaying}
                    isVisible={showVideo}
                />
            )}
        </>
    );
}
