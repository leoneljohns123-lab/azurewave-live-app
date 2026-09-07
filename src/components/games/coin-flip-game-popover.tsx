'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/chat-context';
import { useToast } from '@/hooks/use-toast';
import styles from './coin.module.css';
import { Coin } from './coin';

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

const soundFlipSrc = 'https://freesound.org/data/previews/256/256113_3263906-lq.mp3';
const soundWinSrc  = 'https://freesound.org/data/previews/320/320655_5260877-lq.mp3';
const soundLoseSrc = 'https://freesound.org/data/previews/146/146729_2521403-lq.mp3';

interface HistoryItem {
    id: number;
    text: string;
}

export function CoinFlipGamePopover() {
  const { currentUser, updateCurrentUser, addXp } = useChat();
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState('10');
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'Heads' | 'Tails' | null>(null);
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

  const flip = (choice: 'Heads' | 'Tails') => {
    if (isFlipping) return;

    const bet = parseInt(betAmount, 10);
    if (isNaN(bet) || bet <= 0) {
      toast({ variant: 'destructive', title: 'Invalid bet amount' });
      return;
    }
    if (bet > balance) {
      toast({ variant: 'destructive', title: 'Insufficient balance' });
      return;
    }

    setResultText('');
    setIsFlipping(true);
    setResult(null);
    playSound(soundFlipSrc);
    addXp(5);
    // No optimistic update for loss, only for win after calculation.
    
    setTimeout(() => {
      const outcome = Math.random() < 0.5 ? 'Heads' : 'Tails';
      const win = outcome === choice;
      
      setResult(outcome);
      setIsFlipping(false);

      if (win) {
        const payout = bet * 2; // total return is 2x the bet
        const netWinnings = bet; // what you get back on top of your stake
        setResultText(`YOU WON ${netWinnings.toLocaleString()}! (${outcome.toUpperCase()})`);
        playSound(soundWinSrc);
        updateCurrentUser({ gold: balance + netWinnings });
        addXp(25);
      } else {
        setResultText(`YOU LOST! (${outcome.toUpperCase()})`);
        playSound(soundLoseSrc);
        // We deduct the bet only when they lose.
        updateCurrentUser({ gold: balance - bet });
      }
      
      const newHistoryItem: HistoryItem = {
          id: Date.now(),
          text: `You chose ${choice.toUpperCase()} → Result: ${outcome.toUpperCase()}`
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 4)]);
      
    }, 1000);
  };

  return (
    <div className={styles.container}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />

      <div className={styles.title}>RETRO COIN FLIP</div>
      <div className={styles.balance}>Balance: {balance.toLocaleString()}</div>

      <Coin isFlipping={isFlipping} result={result} />

      <div className={styles.controls}>
        <input 
            id="bet" 
            type="number" 
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="1"
            className={styles.input}
            disabled={isFlipping}
        />
      </div>

      <div className={styles.controls}>
        <button onClick={() => flip('Heads')} disabled={isFlipping} className={styles.button}>HEADS</button>
        <button onClick={() => flip('Tails')} disabled={isFlipping} className={styles.button}>TAILS</button>
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
