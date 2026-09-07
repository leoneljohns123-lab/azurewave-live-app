'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { User } from '@/lib/types';
import { UserAvatar } from './user-avatar';
import { ScrollArea } from './ui/scroll-area';
import { getEffectiveDisplayName } from '@/lib/user-helpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMedal, faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';

interface LeaderboardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: User[];
  type: 'xp' | 'gold' | 'level' | 'gifts' | 'likes' | 'quiz' | null;
}

const getScore = (user: User, type: LeaderboardSheetProps['type']): string => {
    switch (type) {
        case 'xp':
            return `${user.xp || 0} XP`;
        case 'gold':
            return `${(user.gold || 0).toLocaleString()}`;
        case 'level':
            return `${user.level || 1}`;
        case 'gifts':
            return `${(user.gifts?.received?.total || 0).toLocaleString()}`;
        case 'likes':
            return `${(user.profileLikes || 0).toLocaleString()}`;
        case 'quiz':
            return `${(user.quizPoints || 0).toLocaleString()}`;
        default:
            return '';
    }
}

const getIcon = (type: LeaderboardSheetProps['type']) => {
    switch (type) {
        case 'xp':
            return <Image src="/Top_badges/top_xp.svg" alt="Top XP" width={16} height={16} className="rounded-full" />;
        case 'level':
            return <Image src="/Top_badges/top_level.svg" alt="Top Level" width={16} height={16} className="rounded-full" />;
        case 'gold':
            return <Image src="/Top_badges/top_gold.svg" alt="Top Gold" width={16} height={16} className="rounded-full" />;
        case 'gifts':
            return <Image src="/Top_badges/top_gift.svg" alt="Top Gifts" width={16} height={16} className="rounded-full" />;
        case 'likes':
            return <Image src="/Top_badges/top_like.svg" alt="Top Likes" width={16} height={16} className="rounded-full" />;
        case 'quiz':
            return <FontAwesomeIcon icon={faCircleQuestion} className="h-4 w-4 text-blue-400" />;
        default:
            return null;
    }
};

export function LeaderboardSheet({ open, onOpenChange, title, data, type }: LeaderboardSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 w-[350px] sm:w-[350px]">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faMedal} className="w-5 h-5 text-yellow-500" />
            {title}
          </SheetTitle>
          <SheetDescription>Top users ranked by {type}.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {data && data.length > 0 ? (
                data.map((user, index) => (
                <div
                    key={user.id}
                    className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted"
                >
                    <div className="flex items-center justify-center w-8 h-8 font-bold text-lg">
                        {index === 0 ? (
                            <Image src="/images/medal1.svg" alt="Rank 1" width={32} height={32} className="object-contain" />
                        ) : index === 1 ? (
                            <Image src="/images/medal2.svg" alt="Rank 2" width={32} height={32} className="object-contain" />
                        ) : index === 2 ? (
                            <Image src="/images/medal3.svg" alt="Rank 3" width={32} height={32} className="object-contain" />
                        ) : (
                            <span className="text-muted-foreground">{index + 1}</span>
                        )}
                    </div>
                    <UserAvatar user={user} className="w-10 h-10" />
                    <div className="flex-1">
                    <p className="font-semibold truncate">{getEffectiveDisplayName(user)}</p>
                    {type === 'level' && <p className="text-xs text-muted-foreground">{getScore(user, 'xp')}</p>}
                    </div>
                    <div className="flex items-center gap-2 font-bold">
                        {getIcon(type)}
                        <span>{getScore(user, type)}</span>
                    </div>
                </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center pt-24 text-center">
                    <Image src="/interface_icons/nodata.svg" alt="No data" width={64} height={64} className="opacity-70" />
                    <p className="text-sm text-muted-foreground mt-4">Not enough data for this leaderboard yet.</p>
                </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
