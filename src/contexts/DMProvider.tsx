'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { User } from '@/lib/types';

interface DMContextType {
  openDMs: User[];
  openDM: (user: User) => void;
  closeDM: (userId: string) => void;
}

const DMContext = createContext<DMContextType | undefined>(undefined);

export function DMProvider({ children }: { children: ReactNode }) {
  const [openDMs, setOpenDMs] = useState<User[]>([]);

  const openDM = useCallback((user: User) => {
    setOpenDMs(currentDMs => {
      if (currentDMs.some(dmUser => dmUser.id === user.id)) {
        return currentDMs; // Already open
      }
      return [...currentDMs, user];
    });
  }, []);

  const closeDM = useCallback((userId: string) => {
    setOpenDMs(currentDMs => currentDMs.filter(dmUser => dmUser.id !== userId));
  }, []);

  const value = { openDMs, openDM, closeDM };

  return (
    <DMContext.Provider value={value}>
      {children}
    </DMContext.Provider>
  );
}

export function useDM() {
  const context = useContext(DMContext);
  if (context === undefined) {
    throw new Error('useDM must be used within a DMProvider');
  }
  return context;
}
