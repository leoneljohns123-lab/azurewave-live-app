
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { SlotMachine } from './slot-machine';
import { useChat } from '@/context/chat-context';
import styles from './slot-machine.module.css';

const symbols = [
    { icon: '🍒', weight: 12, payout: { '3': 5, '2': 2, '1': 1 } },
    { icon: '🍋', weight: 10, payout: { '3': 10 } },
    { icon: '🔔', weight: 6, payout: { '3': 15 } },
    { icon: '💲', weight: 4, payout: { '3': 20 } },
    { icon: '💎', weight: 2, payout: { '3': 50 } },
    { icon: '👑', weight: 1, payout: { '3': 100 } }
];

const PaytableModal = ({ open, onClose }: { open: boolean; onClose: () => void; }) => {
    if (!open) return null;

    const mainPayouts = symbols.sort((a, b) => (b.payout[3] || 0) - (a.payout[3] || 0));

    return (
        <div className={styles.modal} style={{ display: 'flex' }} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.close} onClick={onClose}>✕</div>
                <div className={styles.modalTitle}>HOW TO PLAY</div>
                <p style={{fontSize: '12px', textAlign: 'center', marginBottom: '15px', color: '#ccc'}}>Set your bet and spin! Match symbols to win.</p>
                <div className={styles.paytableGrid}>
                    <div className={styles.row} style={{opacity: 0.7, fontSize: '0.9em'}}>
                        3 of a kind:
                    </div>
                    {mainPayouts.map(s => (
                        <div key={s.icon} className={styles.row}>
                            <div className={styles.symbol}>{s.icon}</div>
                            <div className={styles.combo}>3x</div>
                            <div className={styles.payout}>{s.payout[3]}x</div>
                        </div>
                    ))}
                    <div className={styles.row} style={{opacity: 0.7, fontSize: '0.9em', marginTop: '10px'}}>
                        Special Wins:
                    </div>
                     <div className={styles.row}>
                        <div className={styles.symbol} style={{fontSize: '20px'}}>🔔/💲</div>
                        <div className={styles.combo}>Any 3</div>
                        <div className={styles.payout}>8x</div>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.symbol} style={{fontSize: '20px'}}>🍒/🍋</div>
                        <div className={styles.combo}>Any 3</div>
                        <div className={styles.payout}>3x</div>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.symbol}>🍒</div>
                        <div className={styles.combo}>2x</div>
                        <div className={styles.payout}>2x</div>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.symbol}>🍒</div>
                        <div className={styles.combo}>1x</div>
                        <div className={styles.payout}>1x</div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export function SlotMachineGamePopover() {
  const { currentUser, updateCurrentUser, addXp } = useChat();
  const [betAmount, setBetAmount] = useState('10');
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [showPaytable, setShowPaytable] = useState(false);
  const { toast } = useToast();

  if (!currentUser) return null;

  const balance = currentUser.gold || 0;
  
  const getRandomSymbol = (): string => {
    const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
    let randomNum = Math.random() * totalWeight;
    for (const symbol of symbols) {
        randomNum -= symbol.weight;
        if (randomNum <= 0) {
            return symbol.icon;
        }
    }
    return symbols[0].icon; // Fallback
  };

  const checkWin = (reels: string[], bet: number) => {
    let payoutMultiplier = 0;
    const [r1, r2, r3] = reels;
    
    const threeOfAKindSymbol = symbols.find(s => s.icon === r1 && r1 === r2 && r2 === r3);

    if (threeOfAKindSymbol) {
        payoutMultiplier = threeOfAKindSymbol.payout[3] || 0;
    } else {
        const bellOrDollar = (s: string) => s === '🔔' || s === '💲';
        const cherryOrLemon = (s: string) => s === '🍒' || s === '🍋';

        if (reels.every(bellOrDollar)) {
            payoutMultiplier = 8;
        } else if (reels.every(cherryOrLemon)) {
            payoutMultiplier = 3;
        } else {
            const cherrySymbol = symbols.find(s => s.icon === '🍒');
            if (cherrySymbol) {
                const cherryCount = reels.filter(s => s === '🍒').length;
                if (cherryCount === 2) {
                    payoutMultiplier = cherrySymbol.payout[2] || 0;
                } else if (cherryCount === 1) {
                    payoutMultiplier = cherrySymbol.payout[1] || 0;
                }
            }
        }
    }

    if (payoutMultiplier > 0) {
        const winnings = bet * payoutMultiplier;
        const netGain = winnings - bet;
        updateCurrentUser({ gold: balance + netGain });
        addXp(payoutMultiplier * 2);
        setResultMessage(`🎉 You win ${winnings.toLocaleString()}!`);
        toast({ title: "You Won!", description: `You won ${winnings.toLocaleString()} gold!` });
    } else {
        updateCurrentUser({ gold: balance - bet });
        setResultMessage('❌ Try Again');
    }
  };

  const spin = () => {
    if (isSpinning) return;
    const bet = parseInt(betAmount, 10);
    if (isNaN(bet) || bet <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Bet' });
      return;
    }
    if (bet > balance) {
      toast({ variant: 'destructive', title: 'Not enough balance!' });
      return;
    }

    addXp(5);
    setIsSpinning(true);
    setResultMessage('');

    const finalResult = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    setResult(finalResult);

    setTimeout(() => {
        checkWin(finalResult, bet);
        setIsSpinning(false);
    }, 2800);
  };

  return (
    <>
      <div className={styles.slotContainer}>
        <div className={styles.header}>
          <h1>CASINO SLOTS</h1>
          <div className={styles.balance}>Balance: {balance.toLocaleString()}</div>
        </div>

        <SlotMachine isSpinning={isSpinning} result={result} />

        <div className={styles.controls}>
          <Input
            id="bet"
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="1"
            className={styles.input}
            disabled={isSpinning}
          />
          <Button onClick={spin} disabled={isSpinning}>SPIN</Button>
        </div>

        <div className={styles.result}>{resultMessage}</div>

        <Button className={styles.paytableBtn} onClick={() => setShowPaytable(true)}>VIEW PAYTABLE</Button>
      </div>
      <PaytableModal open={showPaytable} onClose={() => setShowPaytable(false)} />
    </>
  );
}
