'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from '@/context/chat-context';
import { useToast } from '@/hooks/use-toast';
import styles from './dice.module.css';
import { Dice } from './dice';
import { cn } from '@/lib/utils';

// Sound Effects
const soundRoll = 'https://freesound.org/data/previews/178/178186_3505080-lq.mp3';
const soundWin  = 'https://freesound.org/data/previews/320/320655_5260877-lq.mp3';
const soundLose = 'https://freesound.org/data/previews/146/146729_2521403-lq.mp3';

const playSound = (src: string) => {
    try {
      const audio = new Audio(src);
      audio.volume = 0.4;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
            if (error.name !== 'NotAllowedError') {
                console.error("Sound play failed:", error);
            }
        });
      }
    } catch (e) {
      console.error("Audio could not be created.", e);
    }
};

interface HistoryItem {
  id: number;
  text: string;
}

export function DiceGamePopover() {
  const { currentUser, updateCurrentUser, addXp } = useChat();
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState('10');
  const [isRolling, setIsRolling] = useState(false);
  const [dice1Value, setDice1Value] = useState(1);
  const [dice2Value, setDice2Value] = useState(1);
  const [resultText, setResultText] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  if (!currentUser) {
    return (
        <div className="p-4 text-center text-muted-foreground">
            Loading...
        </div>
    );
  }

  const balance = currentUser.gold || 0;

  const roll = (choice: 'high' | 'low') => {
    if (isRolling) return;
    
    const bet = parseInt(betAmount, 10);
    if (isNaN(bet) || bet <= 0) {
      toast({ variant: 'destructive', title: 'Invalid bet amount' });
      return;
    }
    if (bet > balance) {
      toast({ variant: 'destructive', title: 'Insufficient balance' });
      return;
    }

    setIsRolling(true);
    setResultText('');
    playSound(soundRoll);
    
    // Deduct bet and award playing XP
    updateCurrentUser({ gold: balance - bet });
    addXp(5);

    setTimeout(() => {
      setIsRolling(false);
      
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;
      
      setDice1Value(d1);
      setDice2Value(d2);

      let win = false;
      if (choice === 'high' && total >= 8) win = true;
      if (choice === 'low' && total <= 6) win = true;

      let newBalance = balance - bet;

      if (win) {
        const payout = bet * 2;
        newBalance += payout;
        setResultText(`YOU WON ${payout}! (${total})`);
        playSound(soundWin);
        addXp(30);
      } else {
        setResultText(`YOU LOST! (${total})`);
        playSound(soundLose);
      }

      updateCurrentUser({ gold: newBalance });

      const newHistoryItem: HistoryItem = {
          id: Date.now(),
          text: `You chose ${choice.toUpperCase()} → Result: ${total}`
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 4)]);

    }, 900);
  };
  
  return (
    <div className={styles.container}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />

      <div className={styles.title}>RETRO DICE ROLL</div>
      <div className={styles.balance}>Balance: {balance.toLocaleString()}</div>
      
      <div className={styles.diceArea}>
        <Dice value={dice1Value} isRolling={isRolling} />
        <Dice value={dice2Value} isRolling={isRolling} />
      </div>

      <div className={styles.controls}>
        <input 
            id="bet" 
            type="number" 
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="1"
            className={styles.input}
            disabled={isRolling}
        />
      </div>

      <div className={styles.controls}>
        <button onClick={() => roll('high')} disabled={isRolling} className={styles.button}>HIGH (8-12)</button>
        <button onClick={() => roll('low')} disabled={isRolling} className={styles.button}>LOW (2-6)</button>
      </div>

      <div className={styles.result}>{resultText}</div>

      <div className={styles.history}>
        <h3>HISTORY</h3>
        <ul className={styles.historyList}>
            {history.map(item => (
                <li key={item.id} className={styles.historyItem}>{item.text}</li>
            ))}
        </ul>
      </div>
    </div>
  );
}
