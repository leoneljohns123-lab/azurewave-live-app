'use client';

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import Image from 'next/image';

interface MediaViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: { type: 'image' | 'video'; src: string } | null;
}

export function MediaViewerDialog({ open, onOpenChange, media }: MediaViewerDialogProps) {
  if (!media) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-auto h-auto p-0 bg-transparent border-none shadow-none">
        {media.type === 'image' ? (
          <Image src={media.src} alt="Expanded view" width={1920} height={1080} className="object-contain w-full h-auto max-h-[90vh] rounded-lg" />
        ) : (
          <video src={media.src} controls autoPlay className="w-full max-h-[90vh] rounded-lg outline-none" />
        )}
      </DialogContent>
    </Dialog>
  );
}
