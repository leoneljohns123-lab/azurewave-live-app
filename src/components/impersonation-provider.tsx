'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '@/lib/types';
import { Button } from './ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faUserSecret } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

interface ImpersonationContextType {
  impersonatedUser: User | null;
  adminUser: User | null;
  isImpersonating: boolean;
  startImpersonation: (targetUser: User, admin: User) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const storedImpersonated = sessionStorage.getItem('impersonatedUser');
      const storedAdmin = sessionStorage.getItem('adminUser');
      if (storedImpersonated && storedAdmin) {
        setImpersonatedUser(JSON.parse(storedImpersonated));
        setAdminUser(JSON.parse(storedAdmin));
      }
    } catch (e) {
      sessionStorage.removeItem('impersonatedUser');
      sessionStorage.removeItem('adminUser');
    }
  }, []);

  const isImpersonating = !!impersonatedUser;
  const showBanner = isClient && isImpersonating;

  const startImpersonation = (targetUser: User, admin: User) => {
    sessionStorage.setItem('impersonatedUser', JSON.stringify(targetUser));
    sessionStorage.setItem('adminUser', JSON.stringify(admin));
    setImpersonatedUser(targetUser);
    setAdminUser(admin);
    window.location.reload();
  };

  const stopImpersonation = () => {
    sessionStorage.removeItem('impersonatedUser');
    sessionStorage.removeItem('adminUser');
    setImpersonatedUser(null);
    setAdminUser(null);
    window.location.reload();
  };

  const value = {
    impersonatedUser,
    adminUser,
    isImpersonating,
    startImpersonation,
    stopImpersonation,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {showBanner && adminUser && (
        <ImpersonationBanner
          impersonatedUser={impersonatedUser}
          adminUser={adminUser}
          onStop={stopImpersonation}
        />
      )}
      <div className={cn(showBanner && "pt-12")}>
        {children}
      </div>
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}

function ImpersonationBanner({
  impersonatedUser,
  adminUser,
  onStop,
}: {
  impersonatedUser: User;
  adminUser: User;
  onStop: () => void;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[101] bg-yellow-500 text-black px-4 py-2 flex items-center justify-between text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={faUserSecret} />
        <p>
          You are currently viewing as{' '}
          <span className="font-bold">{impersonatedUser.displayName}</span>. (Signed in as{' '}
          <span className="font-bold">{adminUser.displayName}</span>).
        </p>
      </div>
      <Button onClick={onStop} size="sm" variant="secondary" className="bg-yellow-700 hover:bg-yellow-800 text-white">
        <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
        Exit Impersonation
      </Button>
    </div>
  );
}
