import type { Square, User, Message, PrivateMessage, Notification, RoleIcon } from './types';
import { PlaceHolderImages } from './placeholder-images';
import { 
    faShieldAlt
} from '@fortawesome/free-solid-svg-icons';

const getUserAvatar = (id: string): string => {
  const img = PlaceHolderImages.find(p => p.id === id);
  return img ? img.imageUrl : '';
}

export const users: User[] = [];

export const friends: User[] = []

export const staff: User[] = [];

export let squares: Square[] = [];

export const messages: Message[] = [];

export const friendRequests = [];

export const privateMessages: PrivateMessage[] = [];

export const notifications: Notification[] = [];

export const roleIcons: { [key: string]: RoleIcon } = {
  'Owner': { imageUrl: '/rank/owner.gif', label: 'Owner' },
  'Co-Owner': { imageUrl: '/rank/co_owner.gif', label: 'Co-Owner' },
  'Super Admin': { imageUrl: '/rank/super.gif', label: 'Super Admin' },
  'Admin': { imageUrl: '/rank/admin.gif', label: 'Admin' },
  'Moderator': { icon: faShieldAlt, color: 'text-green-500', label: 'Moderator' },
  'Room Owner': { imageUrl: '/rank/room_owner.svg', label: 'Room Owner' },
  'Room Admin': { imageUrl: '/rank/room_admin.svg', label: 'Room Admin' },
  'Room Moderator': { imageUrl: '/rank/room_mod.svg', label: 'Room Moderator' },
  'Super VIP': { imageUrl: '/rank/reby.gif', label: 'Super VIP' },
  'VIP': { imageUrl: '/rank/vip.gif', label: 'VIP' },
  'User': { imageUrl: '/rank/user.svg', label: 'User' },
  'Guest': { imageUrl: '/rank/guest.svg', label: 'Guest' },
  'Bot': { imageUrl: '/rank/bot.svg', label: 'Bot' },
};
