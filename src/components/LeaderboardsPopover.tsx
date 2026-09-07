'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion, faMedal } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import { useState } from 'react';
import { useChat } from '@/context/chat-context';
import type { User } from '@/lib/types';
import { LeaderboardSheet } from './leaderboard-sheet';

type LeaderboardType = 'xp' | 'gold' | 'level' | 'gifts' | 'likes' | 'quiz' | null;

export function LeaderboardsPopover() {
  const { users } = useChat();
  const [openSheet, setOpenSheet] = useState(false);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LeaderboardType>(null);
  const [leaderboardData, setLeaderboardData] = useState<User[]>([]);
  const [leaderboardTitle, setLeaderboardTitle] = useState('');

  const handleLeaderboardClick = (type: LeaderboardType) => {
    if (!type || !users) return;

    let sortedUsers: User[] = [];
    let title = '';

    switch (type) {
      case 'xp':
        sortedUsers = [...users].sort((a, b) => (b.xp || 0) - (a.xp || 0));
        title = 'Top XP';
        break;
      case 'gold':
        sortedUsers = [...users].sort((a, b) => (b.gold || 0) - (a.gold || 0));
        title = 'Top Gold';
        break;
      case 'level':
        sortedUsers = [...users].sort((a, b) => {
            const levelDiff = (b.level || 1) - (a.level || 1);
            if (levelDiff !== 0) return levelDiff;
            return (b.xp || 0) - (a.xp || 0);
        });
        title = 'Top Level';
        break;
      case 'gifts':
        sortedUsers = [...users].sort((a, b) => (b.gifts?.received?.total || 0) - (a.gifts?.received?.total || 0));
        title = 'Top Gifts';
        break;
      case 'likes':
        sortedUsers = [...users].sort((a, b) => (b.profileLikes || 0) - (a.profileLikes || 0));
        title = 'Top Likes';
        break;
      case 'quiz':
        sortedUsers = [...users].sort((a, b) => (b.quizPoints || 0) - (a.quizPoints || 0));
        title = 'Quiz Scores';
        break;
    }

    setSelectedLeaderboard(type);
    setLeaderboardData(sortedUsers);
    setLeaderboardTitle(title);
    setOpenSheet(true);
  };


  const leaderboardItems = [
    {
      icon: <Image src="/Top_badges/top_xp.svg" alt="Top XP" width={24} height={24} className="rounded-md" />,
      label: 'Top XP',
      type: 'xp' as LeaderboardType,
    },
    { icon: <Image src="/Top_badges/top_gold.svg" alt="Top Gold" width={24} height={24} className="rounded-md" />, label: 'Top gold', type: 'gold' as LeaderboardType },
    { icon: <Image src="/Top_badges/top_level.svg" alt="Top Level" width={24} height={24} className="rounded-md" />, label: 'Top level', type: 'level' as LeaderboardType },
    { icon: <Image src="/Top_badges/top_gift.svg" alt="Top Gifts" width={24} height={24} className="rounded-md" />, label: 'Top gifts', type: 'gifts' as LeaderboardType },
    {
      icon: <Image src="/Top_badges/top_like.svg" alt="Top Likes" width={24} height={24} className="rounded-md" />,
      label: 'Top likes',
      type: 'likes' as LeaderboardType
    },
    {
      icon: <FontAwesomeIcon icon={faCircleQuestion} className="w-6 h-6 text-blue-500" />,
      label: 'Quiz scores',
      type: 'quiz' as LeaderboardType
    },
  ];

  return (
    <>
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger asChild>
            <SidebarMenuButton tooltip="Leaderboards">
              <FontAwesomeIcon icon={faMedal} />
              <span>Leaderboards</span>
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent className="w-60 shadow-neumorphic-out ml-2 bg-popover p-2">
            <div className="space-y-1">
              <h4 className="font-bold leading-none text-lg px-2 py-1">Leaderboards</h4>
              <div className="grid gap-1">
                {leaderboardItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleLeaderboardClick(item.type)}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">{item.icon}</div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
      <LeaderboardSheet
        open={openSheet}
        onOpenChange={setOpenSheet}
        title={leaderboardTitle}
        data={leaderboardData}
        type={selectedLeaderboard}
      />
    </>
  );
}
