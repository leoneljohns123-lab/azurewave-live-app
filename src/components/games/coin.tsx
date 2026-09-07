'use client';

import React from 'react';
import styles from './coin.module.css';
import { cn } from '@/lib/utils';

interface CoinProps {
    isFlipping: boolean;
    result: 'Heads' | 'Tails' | null;
}

export function Coin({ isFlipping, result }: CoinProps) {
    const [displayResult, setDisplayResult] = React.useState<'Heads' | 'Tails' | null>(null);

    React.useEffect(() => {
        if (isFlipping) {
            setDisplayResult(null); // Hide result while flipping
        } else if (result) {
            // When flipping stops, set the final result to display
            setDisplayResult(result);
        }
    }, [isFlipping, result]);
    
    const style: React.CSSProperties = !isFlipping && displayResult ? {
        transform: displayResult === 'Tails' ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.5s ease-out'
    } : {};
    
    return (
        <div className={styles.coinContainer}>
            <div className={cn(styles.coin, isFlipping && styles.flip)} style={style}>
                 <div className={cn(styles.coinFace, styles.coinFront)}>H</div>
                 <div className={cn(styles.coinFace, styles.coinBack)}>T</div>
            </div>
        </div>
    );
}
