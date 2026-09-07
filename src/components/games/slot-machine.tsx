
'use client';
import React, { useState, useEffect, useRef } from 'react';
import styles from './slot-machine.module.css';

const symbols = [
    { icon: '🍒', weight: 12, payout: { '3': 5, '2': 2, '1': 1 } },
    { icon: '🍋', weight: 10, payout: { '3': 10 } },
    { icon: '🔔', weight: 6, payout: { '3': 15 } },
    { icon: '💲', weight: 4, payout: { '3': 20 } },
    { icon: '💎', weight: 2, payout: { '3': 50 } },
    { icon: '👑', weight: 1, payout: { '3': 100 } }
];

interface ReelProps {
  isSpinning: boolean;
  finalSymbol: string | null;
  delay: number;
}

const Reel: React.FC<ReelProps> = ({ isSpinning, finalSymbol, delay }) => {
  const reelRef = useRef<HTMLDivElement>(null);
  const [reelSymbols, setReelSymbols] = useState<string[]>([]);
  const symbolHeight = 100;

  // Create a predictable, long reel strip for smooth spinning effect
  useEffect(() => {
    const baseSymbols = symbols.map(s => s.icon);
    const shuffled = [...baseSymbols].sort(() => 0.5 - Math.random());
    // Repeat the shuffled symbols to make the reel appear infinite
    setReelSymbols([...shuffled, ...shuffled, ...shuffled, ...shuffled]);
  }, []);

  useEffect(() => {
    const reel = reelRef.current;
    if (!reel || reelSymbols.length === 0) return;

    if (isSpinning && finalSymbol) {
      // Find a good landing spot for the final symbol (not at the very end)
      const targetIndex = reelSymbols.lastIndexOf(finalSymbol, reelSymbols.length - symbols.length - 1);
      if (targetIndex === -1) return; // Should not happen with repeated symbols

      const offset = targetIndex * symbolHeight;

      // Reset position and transition before spinning
      reel.style.transition = 'none';
      const startOffset = Math.floor(Math.random() * symbols.length) * symbolHeight;
      reel.style.top = `-${startOffset}px`;

      // A tiny delay to ensure the browser applies the reset before the transition
      setTimeout(() => {
        if (!reelRef.current) return;
        reelRef.current.style.transition = `top ${2 + delay}s cubic-bezier(.25,.8,.5,1.1)`;
        reelRef.current.style.top = `-${offset}px`;
      }, 50);
    }
  }, [isSpinning, finalSymbol, delay, reelSymbols, symbols.length]);

  return (
    <div className={styles.reel}>
      <div ref={reelRef} className={styles.symbols}>
        {reelSymbols.map((s, i) => (
          <div key={i} className={styles.symbol}>{s}</div>
        ))}
      </div>
    </div>
  );
};

interface SlotMachineProps {
  isSpinning: boolean;
  result: string[] | null;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ isSpinning, result }) => {
  return (
    <div className={styles.reels}>
      <Reel isSpinning={isSpinning} finalSymbol={result ? result[0] : null} delay={0} />
      <Reel isSpinning={isSpinning} finalSymbol={result ? result[1] : null} delay={0.35} />
      <Reel isSpinning={isSpinning} finalSymbol={result ? result[2] : null} delay={0.7} />
    </div>
  );
};
