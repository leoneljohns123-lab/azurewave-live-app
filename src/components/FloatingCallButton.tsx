
'use client';

import { Square } from '@/lib/types';
import { Button } from './ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface FloatingCallButtonProps {
  square: Square;
  squareId: string;
}

export function FloatingCallButton({ square, squareId }: FloatingCallButtonProps) {
    const { isCallEnabled, call } = square;
    const [isVisible, setIsVisible] = useState(false);
    
    const [position, setPosition] = useState({ x: 16, y: typeof window !== 'undefined' ? window.innerHeight - 160 : 500 });
    const [isDragging, setIsDragging] = useState(false);
    const wasDragged = useRef(false);
    const dragStartOffset = useRef({ x: 0, y: 0 });
    const controlsRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (isCallEnabled) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isCallEnabled]);

    const handleDragStart = (clientX: number, clientY: number) => {
        if (controlsRef.current) {
            setIsDragging(true);
            wasDragged.current = false;
            const rect = controlsRef.current.getBoundingClientRect();
            dragStartOffset.current = {
                x: clientX - rect.left,
                y: clientY - rect.top,
            };
        }
    };
    
    const handleDragMove = (clientX: number, clientY: number) => {
        if (isDragging) {
            wasDragged.current = true;
            setPosition({
                x: clientX - dragStartOffset.current.x,
                y: clientY - dragStartOffset.current.y,
            });
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };
    
    const handleMouseDown = (e: React.MouseEvent<HTMLAnchorElement>) => {
        handleDragStart(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLAnchorElement>) => {
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

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (wasDragged.current) {
            e.preventDefault();
        }
    }

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
            setPosition({ x: 16, y: window.innerHeight - 160 });
        }
    }, []);

    if (!isVisible) {
        return null;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={`/squares/${squareId}/call`}
                        ref={controlsRef}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                        onClick={handleClick}
                        className={cn(
                            "fixed z-[99] flex items-center justify-center p-0 w-16 h-16 rounded-full border bg-background/50 text-foreground shadow-lg backdrop-blur-sm transition-opacity duration-300 cursor-move",
                            isCallEnabled ? 'opacity-100' : 'opacity-0',
                            call?.isActive && 'border-green-500'
                        )}
                        style={{ left: `${position.x}px`, top: `${position.y}px` }}
                    >
                        <FontAwesomeIcon icon={faPhone} className={cn("h-6 w-6", call?.isActive && 'text-green-500 animate-pulse')} />
                    </Link>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{call?.isActive ? 'Join Active Call' : 'Start a Call'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
