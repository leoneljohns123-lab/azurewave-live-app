
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGamepad, faCoins, faDice, faGem, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { CoinFlipGamePopover } from './coin-flip-game-popover';
import { DiceGamePopover } from './dice-game-popover';
import { SlotMachineGamePopover } from './slot-machine-game-popover';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function GamesPopover() {
    const [activeGame, setActiveGame] = useState<string | null>(null);

    const renderContent = () => {
        if (!activeGame) {
            return (
                <div className="p-4 space-y-2">
                    <h4 className="font-medium leading-none text-center mb-4">Select a Game</h4>
                    <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => setActiveGame('coin-flip')}>
                        <FontAwesomeIcon icon={faCoins} className="mr-4 h-5 w-5 text-yellow-500" /> Coin Flip
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => setActiveGame('dice')}>
                        <FontAwesomeIcon icon={faDice} className="mr-4 h-5 w-5 text-red-500" /> Dice Bet
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => setActiveGame('slots')}>
                        <FontAwesomeIcon icon={faGem} className="mr-4 h-5 w-5 text-blue-500" /> Slot Machine
                    </Button>
                </div>
            );
        }

        return (
            <div>
                <div className="relative p-2 border-b flex items-center justify-center h-14">
                    <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setActiveGame(null)}>
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </Button>
                    <h4 className="font-semibold text-sm">
                        {activeGame === 'coin-flip' && 'Coin Flip'}
                        {activeGame === 'dice' && 'Dice Bet'}
                        {activeGame === 'slots' && 'Slot Machine'}
                    </h4>
                </div>
                {activeGame === 'coin-flip' && <CoinFlipGamePopover />}
                {activeGame === 'dice' && <DiceGamePopover />}
                {activeGame === 'slots' && <SlotMachineGamePopover />}
            </div>
        );
    };

    return (
        <SidebarMenuItem>
            <Popover>
                <PopoverTrigger asChild>
                    <SidebarMenuButton tooltip="Games">
                        <FontAwesomeIcon icon={faGamepad} />
                        <span>Games</span>
                    </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent 
                    className="w-[90vw] sm:w-96 shadow-2xl p-0 ml-0 sm:ml-2" 
                    side={typeof window !== 'undefined' && window.innerWidth < 640 ? "bottom" : "right"}
                >
                    {renderContent()}
                </PopoverContent>
            </Popover>
        </SidebarMenuItem>
    );
}
