
'use client';
import { User } from './types';

export function getEffectiveUserRole(user: User, squareId?: string): string {
    if (squareId && user.squareRoles && user.squareRoles[squareId]) {
        return user.squareRoles[squareId];
    }
    return user.role || 'User';
}

export function isUserGagged(user: User): boolean {
    return !!user.gaggedUntil && new Date(user.gaggedUntil).getTime() > Date.now();
}

export function isUserAnonymous(user: User): boolean {
    return !!user.anonymousUntil && new Date(user.anonymousUntil).getTime() > Date.now();
}

export function getEffectiveDisplayName(user: User | null): string {
    if (!user) return '...';
    if (isUserAnonymous(user)) {
        return 'Anonymous';
    }
    if (user.temporaryNickname && user.tempNickUntil && new Date(user.tempNickUntil).getTime() > Date.now()) {
        return user.temporaryNickname;
    }
    return user.displayName;
}

export function scrambleText(text: string): string {
    const chars = text.split('');
    for (let i = chars.length - 1; i > 0; i--) {
        if (chars[i].trim() === '') continue; // Don't swap spaces
        const j = Math.floor(Math.random() * (i + 1));
        if (chars[j].trim() === '') continue;
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return `🤐 ${chars.join('')}`;
}
