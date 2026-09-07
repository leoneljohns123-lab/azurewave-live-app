'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getEffectiveDisplayName, isUserAnonymous } from '@/lib/user-helpers';
import { faUserSecret } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';


interface UserAvatarProps {
  user: User;
  className?: string;
  isSquare?: boolean;
}

export function UserAvatar({ user, className, isSquare }: UserAvatarProps) {
  const effectiveName = getEffectiveDisplayName(user);
  const isAnon = isUserAnonymous(user);

  const initials = effectiveName
    .split(' ')
    .map((n) => n[0])
    .join('');

  const getFallbackAvatar = (user: User): string => {
    if (user.id === 'system') {
        return '/images/default_system.png';
    }
    if (user.id === 'gemma') {
        return 'https://picsum.photos/seed/gemma/100/100'; // Specific seed for Gemma
    }
    if (user.role === 'Guest') {
        return '/images/default_guest.png';
    }
    if (user.gender === 'male') {
      return '/images/default_male.png';
    }
    if (user.gender === 'female') {
      return '/images/default_female.png';
    }
    if (user.role === 'Bot') {
        return '/images/default_bot.png';
    }
    // Generic fallback if no other condition is met
    return `https://picsum.photos/seed/${user.id}/100/100`;
  };

  const avatarSrc = isAnon ? undefined : user.avatarUrl || getFallbackAvatar(user);

  const genderBorder = user.gender === 'male' 
    ? 'border-blue-500' 
    : user.gender === 'female' 
    ? 'border-pink-500' 
    : 'border-transparent';

  const statusIconMap = {
    online: '/status_indicators/online.svg',
    away: '/status_indicators/away.svg',
    busy: '/status_indicators/busy.svg',
    working: '/status_indicators/working.svg',
    angry: '/status_indicators/angry.svg',
    birthday: '/status_indicators/birthday.svg',
    friendly: '/status_indicators/friendly.svg',
    happy: '/status_indicators/happy.svg',
    listening_to_music: '/status_indicators/listening to music.svg',
    sad: '/status_indicators/sad.svg',
    watching: '/status_indicators/watching.svg',
  };

  const status = user.status;

  return (
    <div className={cn('relative shrink-0', className)}>
      <Avatar className={cn(
        'border-2 h-full w-full',
        isSquare ? 'rounded-xl' : 'rounded-full', 
        genderBorder
      )}>
        <AvatarImage
          src={avatarSrc}
          alt={effectiveName}
          className="object-cover"
        />
        <AvatarFallback className={cn(isAnon && 'bg-gray-700 text-white')}>
          {isAnon ? <FontAwesomeIcon icon={faUserSecret} /> : initials}
        </AvatarFallback>
      </Avatar>
      {status && status !== 'invisible' && statusIconMap[status as keyof typeof statusIconMap] && (
        <div className="absolute -bottom-0.5 -left-0.5 z-10 w-4 h-4 rounded-full overflow-hidden border-2 border-card">
          <Image src={statusIconMap[status as keyof typeof statusIconMap]} alt={status} fill />
        </div>
      )}
    </div>
  );
}
