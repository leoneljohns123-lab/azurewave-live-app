'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useDoc, useCollection, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { User, Square, StaffPermissions, Permission, FeaturePermissions, FeaturePermission, UserRank } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const rankHierarchy: { [key in UserRank | 'Guest']: number } = {
  'Owner': 7,
  'Super Admin': 6,
  'Admin': 5,
  'Moderator': 4,
  'Super VIP': 3,
  'VIP': 2,
  'User': 1,
  'Guest': 0,
};

interface ChatContextType {
  currentUser: User | null;
  users: User[] | null;
  squares: Square[] | null;
  staffPermissions: StaffPermissions | null;
  featurePermissions: FeaturePermissions | null;
  updateCurrentUser: (data: Partial<User>) => void;
  addXp: (xp: number) => void;
  addNotification: (target: string, title: string, message: string, sound: string, user: User) => void;
  sendGameChallenge: (opponent: string, bet: number, currency: string, choice: string, game: string) => void;
  hasPermission: (user: User | null, permission: Permission) => boolean;
  hasFeaturePermission: (user: User | null, feature: FeaturePermission) => boolean;
  isFeedOpen: boolean;
  setFeedOpen: (open: boolean) => void;
  isNewsOpen: boolean;
  setNewsOpen: (open: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => authUser ? doc(firestore, 'users', authUser.uid) : null, [authUser, firestore]);
  const { data: firestoreUser } = useDoc<User>(userProfileRef);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFeedOpen, setFeedOpen] = useState(false);
  const [isNewsOpen, setNewsOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(firestoreUser);
  }, [firestoreUser]);

  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users } = useCollection<User>(usersCollectionRef);

  const squaresCollectionRef = useMemoFirebase(() => collection(firestore, 'squares'), [firestore]);
  const { data: squares } = useCollection<Square>(squaresCollectionRef);

  const staffPermissionsRef = useMemoFirebase(() => doc(firestore, 'staffPermissions', 'config'), [firestore]);
  const { data: staffPermissions } = useDoc<StaffPermissions>(staffPermissionsRef);
  
  const featurePermissionsRef = useMemoFirebase(() => doc(firestore, 'featurePermissions', 'config'), [firestore]);
  const { data: featurePermissions } = useDoc<FeaturePermissions>(featurePermissionsRef);


  const hasPermission = useCallback((user: User | null, permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === 'Owner') return true;
    if (!staffPermissions) return false;

    if (user.role && staffPermissions.roles[user.role]?.includes(permission)) {
      return true;
    }

    return false;
  }, [staffPermissions]);
  
  const hasFeaturePermission = useCallback((user: User | null, feature: FeaturePermission): boolean => {
    if (!user || !featurePermissions) return false;

    const requiredRank = featurePermissions[feature];
    if (!requiredRank) return true; // If no rank is set, allow by default
    
    const userRank = user.role || 'Guest';

    const requiredRankValue = rankHierarchy[requiredRank] || 0;
    const userRankValue = rankHierarchy[userRank as keyof typeof rankHierarchy] || 0;

    return userRankValue >= requiredRankValue;
}, [featurePermissions]);

  const updateCurrentUser = useCallback((data: Partial<User>) => {
    if (userProfileRef) {
      // Optimistic update
      setCurrentUser(prevUser => (prevUser ? { ...prevUser, ...data } : null));
      updateDocumentNonBlocking(userProfileRef, data);
    }
  }, [userProfileRef]);

  const addXp = useCallback((xpToAdd: number) => {
    if (!currentUser || !userProfileRef) return;

    const currentLevel = currentUser.level || 1;
    const currentXp = currentUser.xp || 0;
    const xpForNextLevel = currentLevel * 100;

    let newXp = currentXp + xpToAdd;
    let newLevel = currentLevel;

    if (newXp >= xpForNextLevel) {
      newLevel += 1;
      newXp -= xpForNextLevel;
      toast({
        title: "Level Up!",
        description: `Congratulations, you've reached level ${newLevel}!`,
      });
    }

    updateCurrentUser({ xp: newXp, level: newLevel });
  }, [currentUser, userProfileRef, updateCurrentUser, toast]);

  const addNotification = useCallback((target: string, title: string, message: string, sound: string, user: User) => {
    // Placeholder for broadcasting notifications
    console.log('Broadcasting notification:', { target, title, message, sound, user });
  }, []);

  const sendGameChallenge = useCallback((opponent: string, bet: number, currency: string, choice: string, game: string) => {
    // Placeholder for sending game challenges
    console.log('Sending game challenge:', { opponent, bet, currency, choice, game });
  }, []);


  const value = {
    currentUser,
    users,
    squares,
    staffPermissions,
    featurePermissions,
    updateCurrentUser,
    addXp,
    addNotification,
    sendGameChallenge,
    hasPermission,
    hasFeaturePermission,
    isFeedOpen,
    setFeedOpen,
    isNewsOpen,
    setNewsOpen,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
