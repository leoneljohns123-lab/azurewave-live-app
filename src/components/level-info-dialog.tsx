'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { User } from '@/lib/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { Separator } from './ui/separator';

interface LevelInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function LevelInfoDialog({ open, onOpenChange, user }: LevelInfoDialogProps) {
  if (!user) return null;

  const currentLevel = user.level || 1;
  const currentXp = user.xp || 0;
  const xpForNextLevel = currentLevel * 100;
  const xpProgress = xpForNextLevel > 0 ? (currentXp / xpForNextLevel) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-full bg-[#1c1c24] border-none rounded-2xl p-6 text-white shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl font-bold">Level {currentLevel}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-2">
            <div className="relative h-6 w-full rounded-full bg-black/50 overflow-hidden">
                <div 
                    className="absolute top-0 left-0 h-full bg-[#84cc16] rounded-full transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                >
                     <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white drop-shadow-md">
                            {Math.round(xpProgress)}%
                        </span>
                    </div>
                </div>
            </div>
            <p className="text-sm text-gray-400 text-center">{currentXp} / {xpForNextLevel} XP</p>
        </div>

        <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center text-gray-300">
                <span>Weekly XP</span>
                <span className="font-semibold text-white">{currentXp}</span>
            </div>
             <Separator className="bg-white/10" />
            <div className="flex justify-between items-center text-gray-300">
                <span>Monthly XP</span>
                <span className="font-semibold text-white">{currentXp}</span>
            </div>
             <Separator className="bg-white/10" />
            <div className="flex justify-between items-center text-gray-300">
                <span>Total XP</span>
                <span className="font-semibold text-white">{currentXp}</span>
            </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
