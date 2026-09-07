import { User, UserBadge } from './types';
import { badgeDefinitions } from './badge-definitions';

export const getEarnedBadges = (user: User | null): UserBadge[] => {
    if (!user || !user.badges) {
        return [];
    }
    const earnedBadgeDefs = user.badges.map(earned => {
        const definition = badgeDefinitions.find(def => def.id === earned.id);
        return definition ? { ...earned, ...definition } as UserBadge : null;
    }).filter((badge): badge is UserBadge => badge !== null);
    
    return earnedBadgeDefs;
};
