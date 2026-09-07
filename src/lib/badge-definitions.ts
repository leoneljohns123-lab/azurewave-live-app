
import { User } from './types';
import { 
    faBaby, 
    faStar, 
    faHeart,
} from '@fortawesome/free-solid-svg-icons';

export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    icon?: any; // FontAwesome icon
    imageUrl?: string;
    // The check function determines how many times a user should have earned this badge.
    check: (user: User) => number;
}

const oneDay = 24 * 60 * 60 * 1000;
const oneMonth = 30 * oneDay;

export const badgeDefinitions: BadgeDefinition[] = [
    // --- Single-earn Badges ---
    {
        id: 'newbie',
        name: 'Newbie',
        description: 'Sent your first message!',
        icon: faBaby,
        check: (user) => ((user.messageCount || 0) >= 1) ? 1 : 0,
    },
    {
        id: 'highly-rated',
        name: 'Highly Rated',
        description: 'Received at least 5 ratings with an average of 4 stars or more.',
        icon: faStar,
        check: (user) => ((user.ratingCount || 0) >= 5 && (user.averageRating || 0) >= 4) ? 1 : 0,
    },
    {
        id: 'authenticated-member',
        name: 'Authenticated Member',
        description: 'Badge is bestowed upon users whose authenticity has been verified.',
        imageUrl: '/badge/Authenticated.svg',
        check: (user) => (user.isVerified === true) ? 1 : 0,
    },

    // --- Multi-earn Badges ---
    {
        id: 'generous-heart',
        name: 'Generous Heart',
        description: 'For every 10 gifts sent to other users.',
        icon: faHeart,
        check: (user) => Math.min(100, Math.floor((user.gifts?.sent?.total || 0) / 10)),
    },
    {
        id: 'dedicated-member',
        name: 'Dedicated Member',
        description: 'For every 1,000 messages sent.',
        imageUrl: '/badge/Dedicated member.svg',
        check: (user) => Math.min(100, Math.floor((user.messageCount || 0) / 1000)),
    },
    {
        id: 'active-member',
        name: 'Active Member',
        description: 'For every 10 levels gained.',
        imageUrl: '/badge/Active member.svg',
        check: (user) => Math.min(100, Math.floor((user.level || 0) / 10)),
    },
    {
        id: 'liked-member',
        name: 'Liked Member',
        description: 'For every 10 profile likes received.',
        imageUrl: '/badge/Liked member.svg',
        check: (user) => Math.min(100, Math.floor((user.profileLikes || 0) / 10)),
    },
    {
        id: 'friendly-member',
        name: 'Friendly Member',
        description: 'For every 10 friends made.',
        imageUrl: '/badge/Friendly member.svg',
        check: (user) => Math.min(100, Math.floor((user.friendsCount || 0) / 10)),
    },
    {
        id: 'top-winner',
        name: 'Top Winner',
        description: 'For every contest won.',
        imageUrl: '/badge/Top winner.svg',
        check: (user) => Math.min(100, user.contestWins || 0),
    },
    {
        id: 'gift-keeper',
        name: 'Gift-Keeper',
        description: 'For every 10 gifts received.',
        imageUrl: '/badge/Gift keeper.svg',
        check: (user) => Math.min(100, Math.floor((user.gifts?.received?.total || 0) / 10)),
    },
    {
        id: 'gold-trader',
        name: 'Gold Trader',
        description: 'For every 5,000 gold spent.',
        imageUrl: '/badge/Gold trader.svg',
        check: (user) => Math.min(100, Math.floor((user.goldSpent || 0) / 5000)),
    },
    {
        id: 'ruby-trader',
        name: 'Ruby Trader',
        description: 'For every 100 rubies spent.',
        imageUrl: '/badge/Ruby trader.svg',
        check: (user) => Math.min(100, Math.floor((user.rubiesSpent || 0) / 100)),
    },
    
    // --- Tiered (but single-earn) Community Badges ---
    { id: 'community-member-1', name: 'Community Member I', description: '1 month of membership.', imageUrl: '/badge/Community member1.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth) ? 1 : 0 },
    { id: 'community-member-2', name: 'Community Member II', description: '2 months of membership.', imageUrl: '/badge/Community member2.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 2) ? 1 : 0 },
    { id: 'community-member-3', name: 'Community Member III', description: '3 months of membership.', imageUrl: '/badge/Community member3.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 3) ? 1 : 0 },
    { id: 'community-member-4', name: 'Community Member IV', description: '4 months of membership.', imageUrl: '/badge/Community member4.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 4) ? 1 : 0 },
    { id: 'community-member-5', name: 'Community Member V', description: '5 months of membership.', imageUrl: '/badge/Community member5.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 5) ? 1 : 0 },
    { id: 'community-member-6', name: 'Community Member VI', description: '6 months of membership.', imageUrl: '/badge/Community member6.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 6) ? 1 : 0 },
    { id: 'community-member-7', name: 'Community Member VII', description: '8 months of membership.', imageUrl: '/badge/Community member7.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 8) ? 1 : 0 },
    { id: 'community-member-8', name: 'Community Member VIII', description: '10 months of membership.', imageUrl: '/badge/Community member8.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 10) ? 1 : 0 },
    { id: 'community-member-9', name: 'Community Member IX', description: '1 year of membership.', imageUrl: '/badge/Community member9.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 12) ? 1 : 0 },
    { id: 'community-member-10', name: 'Community Member X', description: '1.5 years of membership.', imageUrl: '/badge/Community member10.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 18) ? 1 : 0 },
    { id: 'community-member-11', name: 'Community Member XI', description: '2 years of membership.', imageUrl: '/badge/Community member11.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 24) ? 1 : 0 },
    { id: 'community-member-12', name: 'Community Member XII', description: '3 years of membership.', imageUrl: '/badge/Community member12.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 36) ? 1 : 0 },
    { id: 'community-member-13', name: 'Community Member XIII', description: '4 years of membership.', imageUrl: '/badge/Community member13.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 48) ? 1 : 0 },
    { id: 'community-member-14', name: 'Community Member XIV', description: '5 years of membership.', imageUrl: '/badge/Community member14.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 60) ? 1 : 0 },
    { id: 'community-member-15', name: 'Community Member XV', description: '6 years of membership.', imageUrl: '/badge/Community member15.svg', check: (user) => (user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime()) > oneMonth * 72) ? 1 : 0 },
];
