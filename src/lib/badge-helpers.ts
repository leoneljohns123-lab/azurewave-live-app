
import { User, EarnedBadge } from './types';
import { BadgeDefinition, badgeDefinitions } from './badge-definitions';

/**
 * Checks a user's profile against all badge definitions and returns any new badges they have earned.
 * @param user The user's profile data, including any provisional updates (like a new level or message count).
 * @returns An array of objects, each containing the badge definition and the number of times it should be newly awarded.
 */
export const getNewBadges = (user: User): { definition: BadgeDefinition; times: number }[] => {
    const earnedBadgeCounts: { [key: string]: number } = {};
    (user.badges || []).forEach(b => {
        earnedBadgeCounts[b.id] = (earnedBadgeCounts[b.id] || 0) + 1;
    });

    const newBadgesToAward: { definition: BadgeDefinition; times: number }[] = [];

    for (const badgeDef of badgeDefinitions) {
        // The check function now returns the total number of times this badge *should* have been earned.
        const targetCount = badgeDef.check(user);
        const currentCount = earnedBadgeCounts[badgeDef.id] || 0;
        
        if (targetCount > currentCount) {
            const timesToAward = targetCount - currentCount;
            newBadgesToAward.push({ definition: badgeDef, times: timesToAward });
        }
    }
    
    return newBadgesToAward;
};
