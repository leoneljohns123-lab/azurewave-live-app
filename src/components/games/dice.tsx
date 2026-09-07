'use client';

import React from 'react';
import styles from './dice.module.css';
import { cn } from '@/lib/utils';

interface DiceProps {
  value: number;
  isRolling: boolean;
}

export function Dice({ value, isRolling }: DiceProps) {
  const dots = [];
  if (value === 1) dots.push('d1');
  if (value === 2) dots.push('d2', 'd5');
  if (value === 3) dots.push('d2', 'd1', 'd5');
  if (value === 4) dots.push('d2', 'd3', 'd4', 'd5');
  if (value === 5) dots.push('d2', 'd3', 'd1', 'd4', 'd5');
  if (value === 6) dots.push('d2', 'd3', 'd4', 'd5', 'd6', 'd7');

  return (
    <div className={cn(styles.dice, isRolling && styles.roll)}>
      {dots.map(cls => (
        <div key={cls} className={cn(styles.dot, styles[cls])}></div>
      ))}
    </div>
  );
}
