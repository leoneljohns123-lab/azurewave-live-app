
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faRobot,
  faPalette,
  faPuzzlePiece,
  faGamepad,
  faCoins,
  faGift,
  faPaintBrush,
  faSmileBeam,
} from '@fortawesome/free-solid-svg-icons';
import { User } from './types';

export type StoreCategory = 'Bots' | 'Themes' | 'Add-ons' | 'Games' | 'Currency';

export interface StoreItem {
    id: string;
    name: string;
    description: string;
    category: StoreCategory;
    price: number;
    currency: 'gold' | 'rubies';
    icon: IconDefinition | string;
    iconColor?: string;
    tags?: ('NEW' | 'HOT' | 'SALE' | 'ONE-TIME')[];
    isPurchased?: (user: User) => boolean;
}

export const storeCategories: { name: StoreCategory, icon: IconDefinition, color: string }[] = [
    { name: 'Bots', icon: faRobot, color: 'text-blue-400' },
    { name: 'Themes', icon: faPalette, color: 'text-pink-400' },
    { name: 'Add-ons', icon: faPuzzlePiece, color: 'text-yellow-400' },
    { name: 'Games', icon: faGamepad, color: 'text-red-400' },
    { name: 'Currency', icon: faCoins, color: 'text-yellow-400' },
];

export const storeItems: StoreItem[] = [
    // Bots
    { id: 'bot-superbot', name: 'SuperBot', description: 'Your friendly in-chat AI assistant for answering questions.', category: 'Bots', price: 0, currency: 'gold', icon: faRobot, iconColor: 'text-blue-400', tags: ['NEW'] },
    { id: 'bot-quizbot', name: 'QuizBot', description: 'Hosts automated trivia games in your rooms.', category: 'Bots', price: 500, currency: 'gold', icon: faRobot, iconColor: 'text-green-400' },
    { id: 'bot-welcome', name: 'WelcomeBot', description: 'Greets new users who join a room for the first time.', category: 'Bots', price: 250, currency: 'gold', icon: faRobot, iconColor: 'text-yellow-400' },
    
    // Themes
    { id: 'theme-cyberpunk', name: 'Cyberpunk Theme', description: 'A neon-drenched, futuristic theme for your entire app.', category: 'Themes', price: 100, currency: 'rubies', icon: faPalette, iconColor: 'text-pink-400', tags: ['HOT'] },
    { id: 'theme-forest', name: 'Forest Theme', description: 'A calm and serene theme with natural vibes.', category: 'Themes', price: 5000, currency: 'gold', icon: faPalette, iconColor: 'text-green-500' },
    { id: 'theme-halloween', name: 'Halloween Theme', description: 'A spooky and fun theme for the Halloween season.', category: 'Themes', price: 2500, currency: 'gold', icon: faPalette, iconColor: 'text-orange-500' },

    // Add-ons
    { id: 'addon-bubbles', name: 'Chat Bubbles Pack', description: 'Unlock 20+ new chat bubble shapes and styles.', category: 'Add-ons', price: 50, currency: 'rubies', icon: faPuzzlePiece, iconColor: 'text-yellow-400', tags: ['NEW'] },
    { id: 'addon-profile-badges', name: 'Profile Badge Pack', description: 'Get a pack of 5 exclusive badges to show off on your profile.', category: 'Add-ons', price: 75, currency: 'rubies', icon: faPuzzlePiece, iconColor: 'text-purple-400' },
    { id: 'addon-emoji-pack', name: 'Custom Emoji Pack', description: 'Upload and use your own custom emojis in chat.', category: 'Add-ons', price: 100, currency: 'rubies', icon: faSmileBeam, iconColor: 'text-yellow-400' },
    { id: 'addon-paint', name: 'Paint It!', description: 'Unlocks the ability to draw and share images directly in chat.', category: 'Add-ons', price: 2000, currency: 'gold', icon: faPaintBrush, iconColor: 'text-red-400' },

    // Games
    { id: 'game-slots', name: 'Slot Machine', description: 'Test your luck with the classic casino slot machine.', category: 'Games', price: 0, currency: 'gold', icon: faGamepad, iconColor: 'text-red-400' },
    { id: 'game-dice', name: 'Dice Bet', description: 'Bet high or low in this simple and fast dice game.', category: 'Games', price: 0, currency: 'gold', icon: faGamepad, iconColor: 'text-green-400' },
    
    // Currency
    { id: 'currency-gold-1', name: 'Starter Gold Pack', description: 'A free pack of 1,000 gold to get you started.', category: 'Currency', price: 0, currency: 'gold', icon: faCoins, iconColor: 'text-yellow-500', tags: ['ONE-TIME'] },
    { id: 'currency-gold-2', name: 'Adventurer Gold Pack', description: 'A bonus of 5,000 gold for your journey.', category: 'Currency', price: 50, currency: 'rubies', icon: faCoins, iconColor: 'text-yellow-500' },
    { id: 'currency-ruby-1', name: 'Free Ruby Pack', description: 'A free pack of 10 rubies on us!', category: 'Currency', price: 0, currency: 'rubies', icon: faGift, iconColor: 'text-red-500', tags: ['ONE-TIME'] },
];
