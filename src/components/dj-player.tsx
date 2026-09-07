
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    __yt_player_ready_queue: (() => void)[];
  }
}

interface DraggableYouTubePlayerProps {
  videoId: string;
  title: string;
  onClose: () => void;
  isPlaying: boolean;
  isVisible: boolean;
}

export function DraggableYouTubePlayer({ videoId, title, onClose, isPlaying, isVisible }: DraggableYouTubePlayerProps) {
  const [position, setPosition] = useState({ x: typeof window !== 'undefined' ? (window.innerWidth - 384) / 2 : 100, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerApiRef = useRef<any>(null); // This will hold the YT.Player instance
  const playerDivId = useMemo(() => `yt-player-${Math.random().toString(36).substring(7)}`, []);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (playerContainerRef.current && (e.target as HTMLElement).closest('.yt-player-title-bar')) {
      setIsDragging(true);
      dragStartOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStartOffset.current.x;
      const newY = e.clientY - dragStartOffset.current.y;
      
      const elWidth = playerContainerRef.current?.offsetWidth || 384;
      const elHeight = playerContainerRef.current?.offsetHeight || 216;
      
      setPosition({
        x: Math.max(0, Math.min(newX, window.innerWidth - elWidth)),
        y: Math.max(0, Math.min(newY, window.innerHeight - elHeight)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // YouTube Player API logic
  useEffect(() => {
    const createPlayer = () => {
      if (!document.getElementById(playerDivId) || playerApiRef.current) return;
      
      playerApiRef.current = new window.YT.Player(playerDivId, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
        },
        events: {
          onReady: (event: any) => {
            if (isPlaying) {
              event.target.playVideo();
            } else {
              event.target.pauseVideo();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      if (!window.__yt_player_ready_queue) {
        window.__yt_player_ready_queue = [];
        window.onYouTubeIframeAPIReady = () => {
          window.__yt_player_ready_queue.forEach((cb) => cb());
        };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api";
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }
      }
      window.__yt_player_ready_queue.push(createPlayer);
    }

    // Cleanup on component unmount
    return () => {
      if (playerApiRef.current && typeof playerApiRef.current.destroy === 'function') {
        playerApiRef.current.destroy();
      }
      playerApiRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, playerDivId]);

  // Effect to control play/pause state from props
  useEffect(() => {
    if (playerApiRef.current && typeof playerApiRef.current.getPlayerState === 'function') {
      if (isPlaying) {
        playerApiRef.current.playVideo();
      } else {
        playerApiRef.current.pauseVideo();
      }
    }
  }, [isPlaying]);

  return (
    <div
      ref={playerContainerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "fixed z-[101] transition-opacity",
        isVisible
          ? "w-[90vw] sm:w-96 bg-black rounded-lg shadow-2xl border border-primary/50"
          : "w-0 h-0 opacity-0 pointer-events-none"
      )}
      style={isVisible ? { left: `${position.x}px`, top: `${position.y}px` } : { left: '-9999px', top: '-9999px' }}
    >
      <div
        className={cn("flex items-center justify-between p-2 cursor-move bg-primary/20 yt-player-title-bar", !isVisible && "hidden")}
      >
        <p className="text-sm font-semibold truncate text-white">{title}</p>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-white" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </Button>
      </div>
      <div className={cn("aspect-video w-full rounded-b-lg overflow-hidden", !isVisible && 'w-0 h-0')}>
        <div id={playerDivId} />
      </div>
    </div>
  );
}
