
'use client';

import { AppLayout } from '@/components/app-layout';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useDoc, updateDocumentNonBlocking, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, limit, doc, writeBatch, getDocs, deleteField } from 'firebase/firestore';
import { User, Square, UserSquare, StaffPermissions, Permission, FeaturePermissions, UserRank, ThemeSettings, Announcement, ModerationAction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/user-avatar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faDoorOpen, faSignal, faComments, faShieldAlt, faToggleOff, faToggleOn } from '@fortawesome/free-solid-svg-icons';
import { format, subDays } from 'date-fns';
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getEffectiveDisplayName, getEffectiveUserRole } from '@/lib/user-helpers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/context/chat-context';
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PERMISSIONS_CONFIG: { id: Permission, label: string, description: string }[] = [
  { id: 'createSquare', label: 'Create Square', description: 'Can create new public or private squares.' },
  { id: 'featureSquare', label: 'Feature Square', description: 'Can feature squares on the landing page.' },
  { id: 'verifySquare', label: 'Verify Square', description: 'Can mark squares as verified.' },
  { id: 'setGlobalRole', label: 'Set Global Role', description: 'Can change a user\'s global role (Admin, VIP, etc.).' },
  { id: 'loginAsUser', label: 'Login As User', description: 'Can impersonate other users.' },
  { id: 'deleteAnySquare', label: 'Delete Any Square', description: 'Can delete squares they did not create.' },
  { id: 'clearAnyChat', label: 'Clear Any Chat', description: 'Can clear chat history in any square.' },
  { id: 'manageBotsInAnySquare', label: 'Manage Bots', description: 'Can enable/disable bots in any square.' },
  { id: 'viewAnalytics', label: 'View Analytics', description: 'Can view dashboard stats, charts, and lists.' },
  { id: 'managePermissions', label: 'Manage Permissions', description: 'Can manage staff and feature permissions.' },
  { id: 'sendGlobalAnnouncements', label: 'Send Global Announcements', description: 'Can send global announcements to all users.' },
  { id: 'manageUsers', label: 'View User Management', description: 'Can view and search all users in the user management table.' },
  { id: 'manageTheme', label: 'Manage Theme', description: 'Can change the application theme.' },
  { id: 'warnUser', label: 'Warn User', description: 'Can send official warnings to users.' },
  { id: 'kickUser', label: 'Kick User', description: 'Can temporarily kick users from a room.' },
  { id: 'muteUser', label: 'Mute User', description: 'Can mute users, preventing them from chatting.' },
  { id: 'banUser', label: 'Ban User', description: 'Can permanently ban users from the platform.' },
  { id: 'gagUser', label: 'Gag User', description: 'Can scramble a user\'s messages.' },
  { id: 'setTempNick', label: 'Set Temporary Nickname', description: 'Can assign a temporary nickname to a user.' },
  { id: 'makeAnonymous', label: 'Make User Anonymous', description: 'Can put a user into anonymous mode.' },
  { id: 'summonUser', label: 'Summon User', description: 'Can summon a user to the current room.' },
  { id: 'undoModeration', label: 'Undo Moderation', description: 'Can undo actions like unmute, unban, ungag, etc.' },
  { id: 'manageRegistration', label: 'Manage Registration', description: 'Can configure settings for new user registrations.' },
  { id: 'managePosts', label: 'Manage Feed Posts', description: 'Can delete any post on the user feed wall.' },
  { id: 'pinPosts', label: 'Pin Feed Posts', description: 'Can pin or unpin posts on the user feed wall.' },
  { id: 'viewReports', label: 'View Reports', description: 'Can view and respond to user-submitted reports.' },
  { id: 'viewWhois', label: 'Whois Lookup', description: 'Can view detailed information about a user.' },
];

const MANAGEABLE_ROLES = ['Co-Owner', 'Super Admin', 'Admin', 'Moderator'];

const CUSTOMIZATION_FEATURES: { id: keyof Omit<FeaturePermissions, 'id'>, label: string, description: string }[] = [
    { id: 'usernameStyle', label: 'Username Styling', description: 'Allow users to change their username color, font, and style.' },
    { id: 'chatTextStyle', label: 'Chat Text Styling', description: 'Allow users to customize their chat message font and color.' },
    { id: 'profileAvatar', label: 'Custom Profile Avatar', description: 'Allow users to upload a custom avatar.' },
    { id: 'profileBanner', label: 'Custom Profile Banner', description: 'Allow users to upload a custom profile banner.' },
    { id: 'chatBackground', label: 'Custom Chat Background', description: 'Allow users to set a custom chat background.' },
    { id: 'sendGift', label: 'Send Gifts', description: 'Allow users to send virtual gifts to others.' },
    { id: 'shareCurrency', label: 'Share Currency', description: 'Allow users to share their gold/rubies.' },
    { id: 'useDjBooth', label: 'Use DJ Booth', description: 'Allow users to act as a DJ in squares.' },
    { id: 'createPost', label: 'Create Feed Posts', description: 'Allow users to create new posts on the feed.' },
    { id: 'commentOnPost', label: 'Comment on Posts', description: 'Allow users to comment on feed posts.' },
    { id: 'reactToPost', label: 'React to Posts', description: 'Allow users to react to feed posts.' },
    { id: 'privateMessaging', label: 'Private Messaging', description: 'Allow users to send direct messages.' },
    { id: 'mentionUser', label: 'Mention Users', description: 'Allow users to @mention others in chat.' },
    { id: 'quoteMessage', label: 'Quote Messages', description: 'Allow users to quote other messages in chat.' },
    { id: 'useGhostMode', label: 'Ghost Mode', description: 'Allow users to browse squares without appearing in the user list.' },
];

const USER_RANKS: UserRank[] = ['Owner', 'Super Admin', 'Admin', 'Moderator', 'Super VIP', 'VIP', 'User'];

const THEMES = [
  { name: 'Arc', cssUrl: '/themes/Arc/Arc.css', isDark: true, backgroundUrl: '/images/chat_background/arc.png', previewColors: ['hsl(227, 18%, 11%)', 'hsl(226, 44%, 53%)', 'hsl(225, 16%, 20%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '227 18% 11%', '--foreground': '0 0% 100%', '--card': '225 16% 20%', '--card-foreground': '0 0% 100%', '--popover': '225 16% 20%', '--popover-foreground': '0 0% 100%', '--primary': '226 44% 53%', '--primary-foreground': '0 0% 100%', '--secondary': '225 16% 20%', '--secondary-foreground': '0 0% 100%', '--muted': '225 16% 20%', '--muted-foreground': '225 10% 65%', '--accent': '225 16% 25%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '225 16% 25%', '--input': '225 16% 20%', '--ring': '226 44% 53%' }},
  { name: 'Blue', cssUrl: '/themes/Blue/Blue.css', isDark: true, backgroundUrl: '/images/chat_background/blue.png', previewColors: ['hsl(209, 100%, 8%)', 'hsl(210, 100%, 56%)', 'hsl(209, 100%, 21%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '209 100% 8%', '--foreground': '0 0% 100%', '--card': '209 100% 21%', '--card-foreground': '0 0% 100%', '--popover': '209 100% 21%', '--popover-foreground': '0 0% 100%', '--primary': '210 100% 56%', '--primary-foreground': '0 0% 100%', '--secondary': '209 100% 21%', '--secondary-foreground': '0 0% 100%', '--muted': '209 100% 21%', '--muted-foreground': '210 14% 71%', '--accent': '209 100% 26%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '0 0% 100%', '--border': '209 100% 31%', '--input': '209 100% 21%', '--ring': '210 100% 56%' }},
  { name: 'Catween', cssUrl: '/themes/Catween/Catween.css', isDark: true, backgroundUrl: '/images/chat_background/halloween2.jpg', previewColors: ['hsl(0, 0%, 0%)', 'hsl(20, 98%, 44%)', 'hsl(26, 30%, 6%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '0 0% 0%', '--foreground': '0 0% 100%', '--card': '26 30% 6%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '20 98% 44%', '--primary-foreground': '0 0% 100%', '--secondary': '31 28% 9%', '--secondary-foreground': '0 0% 100%', '--muted': '27 24% 6%', '--muted-foreground': '39 100% 84%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '30 24% 9%', '--input': '27 24% 6%', '--ring': '20 98% 44%' }},
  { name: 'CuteOwl', cssUrl: '/themes/CuteOwl/CuteOwl.css', isDark: true, previewColors: ['hsl(0, 0%, 8%)', 'hsl(52, 100%, 40%)', 'hsl(26, 30%, 3%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '0 0% 8%', '--foreground': '0 0% 100%', '--card': '26 30% 3%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '52 100% 40%', '--primary-foreground': '0 0% 0%', '--secondary': '31 11% 13%', '--secondary-foreground': '0 0% 100%', '--muted': '26 30% 3%', '--muted-foreground': '47 100% 84%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '35 34% 17%', '--input': '26 30% 3%', '--ring': '52 100% 40%' }},
  { name: 'Dark Purple', cssUrl: '/themes/Dark Purple/Dark Purple.css', isDark: true, backgroundUrl: '/images/chat_background/purple_decor.png', previewColors: ['hsl(295, 65%, 18%)', 'hsl(294, 73%, 23%)', 'hsl(294, 78%, 13%)', 'hsl(289, 14%, 83%)'], variables: { '--background': '295 65% 18%', '--foreground': '289 14% 83%', '--card': '294 78% 13%', '--card-foreground': '289 14% 83%', '--popover': '294 78% 13%', '--popover-foreground': '289 14% 83%', '--primary': '294 73% 33%', '--primary-foreground': '0 0% 100%', '--secondary': '294 78% 13%', '--secondary-foreground': '289 14% 83%', '--muted': '294 78% 13%', '--muted-foreground': '289 10% 65%', '--accent': '294 78% 18%', '--accent-foreground': '289 14% 83%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '294 78% 18%', '--input': '294 78% 13%', '--ring': '294 73% 33%' }},
  { name: 'Dolphin', cssUrl: '/themes/Dolphin/Dolphin.css', isDark: false, previewColors: ['hsl(0, 0%, 93%)', 'hsl(22, 100%, 50%)', 'hsl(210, 21%, 94%)', 'hsl(0, 0%, 20%)'], variables: { '--background': '0 0% 93%', '--foreground': '0 0% 20%', '--card': '0 0% 100%', '--card-foreground': '0 0% 20%', '--popover': '0 0% 100%', '--popover-foreground': '0 0% 20%', '--primary': '22 100% 50%', '--primary-foreground': '0 0% 100%', '--secondary': '210 21% 94%', '--secondary-foreground': '0 0% 20%', '--muted': '210 21% 94%', '--muted-foreground': '0 0% 40%', '--accent': '210 21% 94%', '--accent-foreground': '0 0% 20%', '--destructive': '0 84.2% 60.2%', '--destructive-foreground': '0 0% 98%', '--border': '210 20% 85%', '--input': '0 0% 100%', '--ring': '22 100% 50%' }},
  { name: 'Explorer', cssUrl: '/themes/Explorer/Explorer.css', isDark: true, previewColors: ['hsl(2, 75%, 11%)', 'hsl(14, 100%, 57%)', 'hsl(4, 65%, 21%)', 'hsl(18, 100%, 86%)'], variables: { '--background': '2 75% 11%', '--foreground': '18 100% 86%', '--card': '4 65% 21%', '--card-foreground': '18 100% 86%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '14 100% 57%', '--primary-foreground': '0 0% 100%', '--secondary': '2 81% 11%', '--secondary-foreground': '0 0% 100%', '--muted': '6 81% 30%', '--muted-foreground': '18 100% 86%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '0 91% 3%', '--input': '6 81% 30%', '--ring': '14 100% 57%' }},
  { name: 'Forest', cssUrl: '/themes/Forest/Forest.css', isDark: true, previewColors: ['hsl(0, 0%, 8%)', 'hsl(43, 83%, 69%)', 'hsl(0, 0%, 13%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '0 0% 8%', '--foreground': '0 0% 100%', '--card': '0 0% 13%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '43 83% 69%', '--primary-foreground': '0 0% 0%', '--secondary': '33 22% 16%', '--secondary-foreground': '0 0% 100%', '--muted': '0 0% 13%', '--muted-foreground': '40 100% 87%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '35 15% 17%', '--input': '0 0% 13%', '--ring': '43 83% 69%' }},
  { name: 'Halloween', cssUrl: '/themes/Halloween/Halloween.css', isDark: true, backgroundUrl: '/images/chat_background/halloween2.jpg', previewColors: ['hsl(23, 100%, 4%)', 'hsl(28, 97%, 51%)', 'hsl(28, 100%, 27%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '23 100% 4%', '--foreground': '0 0% 100%', '--card': '28 100% 27%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '28 97% 51%', '--primary-foreground': '0 0% 100%', '--secondary': '28 100% 26%', '--secondary-foreground': '0 0% 100%', '--muted': '28 100% 20%', '--muted-foreground': '0 0% 100%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '28 100% 32%', '--input': '28 100% 20%', '--ring': '28 97% 51%' }},
  { name: 'Jungle', cssUrl: '/themes/Jungle_Green/Jungle_Green.css', isDark: true, backgroundUrl: '/images/chat_background/whatsapp.jpg', previewColors: ['hsl(158, 68%, 7%)', 'hsl(163, 65%, 52%)', 'hsl(164, 45%, 14%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '158 68% 7%', '--foreground': '0 0% 100%', '--card': '164 45% 14%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '163 65% 52%', '--primary-foreground': '0 0% 0%', '--secondary': '160 52% 17%', '--secondary-foreground': '0 0% 100%', '--muted': '162 43% 15%', '--muted-foreground': '0 0% 100%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '162 61% 10%', '--input': '162 43% 15%', '--ring': '163 65% 52%' }},
  { name: 'Light Blue', cssUrl: '/themes/Light Blue/Light Blue.css', isDark: true, previewColors: ['hsl(215, 21%, 15%)', 'hsl(216, 27%, 45%)', 'hsl(216, 20%, 23%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '215 21% 15%', '--foreground': '0 0% 100%', '--card': '216 20% 23%', '--card-foreground': '0 0% 100%', '--popover': '216 20% 23%', '--popover-foreground': '0 0% 100%', '--primary': '216 27% 45%', '--primary-foreground': '0 0% 100%', '--secondary': '216 20% 23%', '--secondary-foreground': '0 0% 100%', '--muted': '216 20% 23%', '--muted-foreground': '216 10% 65%', '--accent': '216 20% 28%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '216 20% 28%', '--input': '216 20% 23%', '--ring': '216 27% 45%' }},
  { name: 'Lite', cssUrl: '/themes/Lite/Lite.css', isDark: false, previewColors: ['hsl(0, 0%, 93%)', 'hsl(192, 97%, 43%)', 'hsl(0, 0%, 100%)', 'hsl(0, 0%, 20%)'], variables: { '--background': '0 0% 93%', '--foreground': '0 0% 20%', '--card': '0 0% 100%', '--card-foreground': '0 0% 20%', '--popover': '0 0% 100%', '--popover-foreground': '0 0% 20%', '--primary': '192 97% 43%', '--primary-foreground': '0 0% 100%', '--secondary': '0 0% 96%', '--secondary-foreground': '0 0% 20%', '--muted': '0 0% 96%', '--muted-foreground': '0 0% 40%', '--accent': '0 0% 96%', '--accent-foreground': '0 0% 20%', '--destructive': '0 84.2% 60.2%', '--destructive-foreground': '0 0% 98%', '--border': '0 0% 89%', '--input': '0 0% 100%', '--ring': '192 97% 43%' }},
  { name: 'Mauve', cssUrl: '/themes/Mauve_Purple/Mauve_Purple.css', isDark: true, previewColors: ['hsl(246, 60%, 10%)', 'hsl(243, 38%, 62%)', 'hsl(246, 44%, 18%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '246 60% 10%', '--foreground': '0 0% 100%', '--card': '246 44% 18%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '243 38% 62%', '--primary-foreground': '0 0% 100%', '--secondary': '244 54% 23%', '--secondary-foreground': '0 0% 100%', '--muted': '246 39% 23%', '--muted-foreground': '0 0% 100%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '244 50% 14%', '--input': '246 39% 23%', '--ring': '243 38% 62%' }},
  { name: 'Nord', cssUrl: '/themes/Nord/Nord.css', isDark: true, previewColors: ['hsl(0, 0%, 8%)', 'hsl(223, 43%, 51%)', 'hsl(231, 10%, 20%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '0 0% 8%', '--foreground': '0 0% 100%', '--card': '231 10% 20%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '223 43% 51%', '--primary-foreground': '0 0% 100%', '--secondary': '227 15% 26%', '--secondary-foreground': '0 0% 100%', '--muted': '227 15% 26%', '--muted-foreground': '0 0% 100%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '220 12% 21%', '--input': '227 15% 26%', '--ring': '223 43% 51%' }},
  { name: 'Obsidian', cssUrl: '/themes/Obsidian/Obsidian.css', isDark: true, previewColors: ['hsl(0, 0%, 8%)', 'hsl(192, 97%, 43%)', 'hsl(0, 0%, 10%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '0 0% 8%', '--foreground': '0 0% 100%', '--card': '0 0% 10%', '--card-foreground': '0 0% 100%', '--popover': '0 0% 10%', '--popover-foreground': '0 0% 100%', '--primary': '192 97% 43%', '--primary-foreground': '0 0% 100%', '--secondary': '0 0% 10%', '--secondary-foreground': '0 0% 100%', '--muted': '0 0% 10%', '--muted-foreground': '0 0% 65%', '--accent': '0 0% 15%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '0 0% 15%', '--input': '0 0% 10%', '--ring': '192 97% 43%' }},
  { name: 'Purple', cssUrl: '/themes/Purple/Purple.css', isDark: true, backgroundUrl: '/images/chat_background/purple_decor.png', previewColors: ['hsl(261, 94%, 10%)', 'hsl(256, 95%, 71%)', 'hsl(256, 62%, 25%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '261 94% 10%', '--foreground': '0 0% 100%', '--card': '256 62% 25%', '--card-foreground': '0 0% 100%', '--popover': '256 62% 25%', '--popover-foreground': '0 0% 100%', '--primary': '256 95% 71%', '--primary-foreground': '0 0% 100%', '--secondary': '256 62% 25%', '--secondary-foreground': '0 0% 100%', '--muted': '256 62% 25%', '--muted-foreground': '250 14% 71%', '--accent': '256 62% 30%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '0 0% 100%', '--border': '256 62% 35%', '--input': '256 62% 25%', '--ring': '256 95% 71%' }},
  { name: 'Red Leaves', cssUrl: '/themes/Red_Leaves/Red_Leaves.css', isDark: true, backgroundUrl: '/images/chat_background/red.jpg', previewColors: ['hsl(0, 0%, 8%)', 'hsl(0, 50%, 61%)', 'hsl(0, 48%, 17%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '0 0% 8%', '--foreground': '0 0% 100%', '--card': '0 48% 17%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '0 50% 61%', '--primary-foreground': '0 0% 100%', '--secondary': '0 44% 20%', '--secondary-foreground': '0 0% 100%', '--muted': '0 46% 16%', '--muted-foreground': '0 33% 86%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '0 100% 74%', '--input': '0 46% 16%', '--ring': '0 50% 61%' }},
  { name: 'Remix', cssUrl: '/themes/Remix/Remix.css', isDark: true, backgroundUrl: '/images/chat_background/remix.jpeg', previewColors: ['hsl(225, 93%, 7%)', 'hsl(223, 100%, 62%)', 'hsl(228, 79%, 17%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '225 93% 7%', '--foreground': '0 0% 100%', '--card': '228 79% 17%', '--card-foreground': '0 0% 100%', '--popover': '228 79% 17%', '--popover-foreground': '0 0% 100%', '--primary': '223 100% 62%', '--primary-foreground': '0 0% 100%', '--secondary': '228 79% 17%', '--secondary-foreground': '0 0% 100%', '--muted': '228 79% 17%', '--muted-foreground': '220 14% 71%', '--accent': '228 79% 22%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '0 0% 100%', '--border': '228 79% 25%', '--input': '228 79% 17%', '--ring': '223 100% 62%' }},
  { name: 'Scent', cssUrl: '/themes/Scent/Scent.css', isDark: false, previewColors: ['hsl(344, 43%, 89%)', 'hsl(343, 62%, 57%)', 'hsl(344, 100%, 96%)', 'hsl(345, 41%, 23%)'], variables: { '--background': '344 43% 89%', '--foreground': '345 41% 23%', '--card': '344 100% 96%', '--card-foreground': '345 41% 23%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '343 62% 57%', '--primary-foreground': '0 0% 100%', '--secondary': '345 41% 23%', '--secondary-foreground': '0 0% 100%', '--muted': '344 100% 96%', '--muted-foreground': '345 41% 23%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '345 41% 23%', '--input': '344 100% 91%', '--ring': '343 62% 57%' }},
  { name: 'St. Patrick', cssUrl: '/themes/StPatrick/StPatrick.css', isDark: true, backgroundUrl: '/images/chat_background/spGpot.jpg', previewColors: ['hsl(120, 100%, 5%)', 'hsl(118, 100%, 35%)', 'hsl(120, 100%, 8%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '120 100% 5%', '--foreground': '0 0% 100%', '--card': '120 100% 8%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '118 100% 35%', '--primary-foreground': '0 0% 100%', '--secondary': '120 100% 14%', '--secondary-foreground': '0 0% 100%', '--muted': '120 100% 7%', '--muted-foreground': '0 0% 100%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '118 100% 16%', '--input': '120 100% 7%', '--ring': '118 100% 35%' }},
  { name: 'Venetian Red', cssUrl: '/themes/Venetian_Red/Venetian_Red.css', isDark: true, backgroundUrl: '/images/chat_background/red.jpg', previewColors: ['hsl(230, 59%, 8%)', 'hsl(0, 68%, 57%)', 'hsl(0, 48%, 15%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '230 59% 8%', '--foreground': '0 0% 100%', '--card': '0 48% 15%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '0 68% 57%', '--primary-foreground': '0 0% 100%', '--secondary': '0 53% 24%', '--secondary-foreground': '0 0% 100%', '--muted': '0 46% 16%', '--muted-foreground': '0 0% 100%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '0 50% 12%', '--input': '0 46% 16%', '--ring': '0 68% 57%' }},
  { name: 'Whatsapp', cssUrl: '/themes/Whatsapp/Whatsapp.css', isDark: true, backgroundUrl: '/images/chat_background/whatsapp.jpg', previewColors: ['hsl(200, 26%, 8%)', 'hsl(166, 100%, 33%)', 'hsl(203, 23%, 17%)', 'hsl(210, 17%, 95%)'], variables: { '--background': '200 26% 8%', '--foreground': '210 17% 95%', '--card': '203 23% 17%', '--card-foreground': '210 17% 95%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '166 100% 33%', '--primary-foreground': '166 100% 12%', '--secondary': '210 17% 95%', '--secondary-foreground': '0 0% 100%', '--muted': '203 23% 17%', '--muted-foreground': '210 17% 95%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '206 17% 20%', '--input': '204 18% 16%', '--ring': '166 100% 33%' }},
  { name: 'Yankees Blue', cssUrl: '/themes/Yankees_Blue/Yankees_Blue.css', isDark: true, backgroundUrl: '/images/chat_background/yankees_decor.png', previewColors: ['hsl(230, 59%, 8%)', 'hsl(218, 69%, 53%)', 'hsl(227, 43%, 12%)', 'hsl(0, 0%, 100%)'], variables: { '--background': '230 59% 8%', '--foreground': '0 0% 100%', '--card': '227 43% 12%', '--card-foreground': '0 0% 100%', '--popover': '29 88% 12%', '--popover-foreground': '0 0% 100%', '--primary': '218 69% 53%', '--primary-foreground': '0 0% 100%', '--secondary': '224 45% 22%', '--secondary-foreground': '0 0% 100%', '--muted': '227 43% 16%', '--muted-foreground': '0 0% 100%', '--accent': '22 100% 59%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '210 40% 98%', '--border': '227 50% 10%', '--input': '227 43% 16%', '--ring': '218 69% 53%' }},
  { name: 'Cyberpunk', cssUrl: '', isDark: true, previewColors: ['hsl(230, 20%, 9%)', 'hsl(320, 100%, 50%)', 'hsl(180, 100%, 50%)', 'hsl(0, 0%, 98%)'], variables: { '--background': '230 20% 9%', '--foreground': '0 0% 98%', '--card': '230 20% 12%', '--card-foreground': '0 0% 98%', '--popover': '230 20% 12%', '--popover-foreground': '0 0% 98%', '--primary': '320 100% 50%', '--primary-foreground': '0 0% 100%', '--secondary': '230 20% 17%', '--secondary-foreground': '0 0% 98%', '--muted': '230 20% 17%', '--muted-foreground': '220 14% 71%', '--accent': '180 100% 50%', '--accent-foreground': '0 0% 0%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '0 0% 98%', '--border': '230 20% 20%', '--input': '230 20% 17%', '--ring': '320 100% 50%' }},
  { name: 'Minimalist', cssUrl: '', isDark: false, previewColors: ['hsl(0, 0%, 100%)', 'hsl(0, 0%, 13%)', 'hsl(0, 0%, 96%)', 'hsl(0, 0%, 13%)'], variables: { '--background': '0 0% 100%', '--foreground': '0 0% 13%', '--card': '0 0% 100%', '--card-foreground': '0 0% 13%', '--popover': '0 0% 100%', '--popover-foreground': '0 0% 13%', '--primary': '0 0% 13%', '--primary-foreground': '0 0% 100%', '--secondary': '0 0% 96%', '--secondary-foreground': '0 0% 20%', '--muted': '0 0% 96%', '--muted-foreground': '0 0% 40%', '--accent': '0 0% 96%', '--accent-foreground': '0 0% 20%', '--destructive': '0 84.2% 60.2%', '--destructive-foreground': '0 0% 98%', '--border': '0 0% 89%', '--input': '0 0% 100%', '--ring': '0 0% 13%' }},
  { name: 'Midnight', cssUrl: '', isDark: true, previewColors: ['hsl(240, 10%, 4%)', 'hsl(260, 80%, 65%)', 'hsl(240, 10%, 10%)', 'hsl(0, 0%, 98%)'], variables: { '--background': '240 10% 4%', '--foreground': '240 5% 95%', '--card': '240 10% 10%', '--card-foreground': '240 5% 95%', '--popover': '240 10% 10%', '--popover-foreground': '240 5% 95%', '--primary': '260 80% 65%', '--primary-foreground': '0 0% 100%', '--secondary': '240 10% 15%', '--secondary-foreground': '240 5% 95%', '--muted': '240 10% 15%', '--muted-foreground': '240 5% 65%', '--accent': '260 80% 70%', '--accent-foreground': '0 0% 100%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '0 0% 98%', '--border': '240 10% 12%', '--input': '240 10% 15%', '--ring': '260 80% 65%' }},
  { name: 'Summer', cssUrl: '', isDark: false, previewColors: ['hsl(45, 100%, 97%)', 'hsl(35, 90%, 55%)', 'hsl(50, 100%, 90%)', 'hsl(25, 50%, 30%)'], variables: { '--background': '45 100% 97%', '--foreground': '25 50% 30%', '--card': '0 0% 100%', '--card-foreground': '25 50% 30%', '--popover': '0 0% 100%', '--popover-foreground': '25 50% 30%', '--primary': '35 90% 55%', '--primary-foreground': '0 0% 100%', '--secondary': '50 100% 90%', '--secondary-foreground': '25 50% 30%', '--muted': '50 100% 90%', '--muted-foreground': '25 50% 50%', '--accent': '35 90% 65%', '--accent-foreground': '25 50% 30%', '--destructive': '0 84.2% 60.2%', '--destructive-foreground': '0 0% 98%', '--border': '40 80% 85%', '--input': '0 0% 100%', '--ring': '35 90% 55%' }},
  { name: 'Rainy Day', cssUrl: '', isDark: true, previewColors: ['hsl(215, 28%, 17%)', 'hsl(210, 40%, 60%)', 'hsl(215, 28%, 25%)', 'hsl(210, 20%, 90%)'], variables: { '--background': '215 28% 17%', '--foreground': '210 20% 90%', '--card': '215 28% 22%', '--card-foreground': '210 20% 90%', '--popover': '215 28% 22%', '--popover-foreground': '210 20% 90%', '--primary': '210 40% 60%', '--primary-foreground': '0 0% 100%', '--secondary': '215 28% 27%', '--secondary-foreground': '210 20% 90%', '--muted': '215 28% 27%', '--muted-foreground': '210 20% 70%', '--accent': '210 40% 70%', '--accent-foreground': '0 0% 0%', '--destructive': '0 62.8% 30.6%', '--destructive-foreground': '0 0% 98%', '--border': '215 28% 25%', '--input': '215 28% 27%', '--ring': '210 40% 60%' }},
];

const backgroundOptions = [
    { id: 'default', name: 'Default', url: '' },
    { id: 'arc_new', name: 'Arc', url: '/images/chat_background/arc.png' },
    { id: 'blue_new', name: 'Blue', url: '/images/chat_background/blue.png' },
    { id: 'remix_new', name: 'Remix', url: '/images/chat_background/remix.jpeg' },
    { id: 'bg1', name: 'WhatsApp 1', url: '/images/chat_background/whatsapp.jpg' },
    { id: 'bg3', name: 'WhatsApp 3', url: '/images/chat_background/whatsapp3.webp' },
    { id: 'bg4', name: 'WhatsApp 4', url: '/images/chat_background/whatsapp4.jpg' },
    { id: 'bg5', name: 'WhatsApp 5', url: '/images/chat_background/whatsapp5.jpg' },
    { id: 'bg6', name: 'WhatsApp 6', url: '/images/chat_background/whatsapp6.jpg' },
    { id: 'grey', name: 'Grey', url: '/images/chat_background/grey.jpg' },
    { id: 'pink', name: 'Pink', url: '/images/chat_background/Pink.jpg' },
    { id: 'hallow', name: 'Hallow', url: '/images/chat_background/Hallow.jpg' },
    { id: 'halloween1', name: 'Halloween 1', url: '/images/chat_background/haloween1.avif' },
    { id: 'halloween2', name: 'Halloween 2', url: '/images/chat_background/halloween2.jpg' },
    { id: 'halloween2webp', name: 'Halloween 2 Webp', url: '/images/chat_background/haloween2.webp' },
    { id: 'eerie', name: 'Eerie', url: '/images/chat_background/eerie.jpg' },
    { id: 'horror', name: 'Horror', url: '/images/chat_background/horror.jpg' },
    { id: 'red', name: 'Red', url: '/images/chat_background/red.jpg' },
];

const decorationOptions = [
    { id: 'none', name: 'None', url: '' },
    { id: 'flower_1', name: 'Flower 1', url: '/images/chat_background/flower.png' },
    { id: 'flower_2', name: 'Flower 2', url: '/images/chat_background/flower2.png' },
    { id: 'weendecoration', name: 'Ween Decor', url: '/images/chat_background/weendecoration.png' },
    { id: 'decoration2', name: 'Decoration 2', url: '/images/chat_background/decoration2.png' },
    { id: 'decoration', name: 'Decoration 1', url: '/images/chat_background/decoration.png' },
    { id: 'blue_decor', name: 'Blue Decor', url: '/images/chat_background/blue_decor.png' },
    { id: 'yankees_decor', name: 'Yankees', url: '/images/chat_background/yankees_decor.png' },
    { id: 'spGpot', name: 'Pot of Gold', url: '/images/chat_background/spGpot.jpg' },
    { id: 'purple_decor', name: 'Purple', url: '/images/chat_background/purple_decor.png' },
    { id: 'girl', name: 'Girl', url: '/images/chat_background/Girl.png' },
    { id: 'tom_jerry', name: 'Tom & Jerry', url: '/images/chat_background/Tom&Jerry.png' },
    { id: 'roses', name: 'Roses', url: '/images/chat_background/Roses.png' },
    { id: 'anime', name: 'Anime', url: '/images/chat_background/Anime.png' },
    { id: 'skeleton_man', name: 'Skeleton Man', url: '/images/chat_background/skeletonMan.png' },
];

const decorationPositionOptions = [
    { id: 'bottom right', name: 'Bottom Right' },
    { id: 'bottom left', name: 'Bottom Left' },
    { id: 'top right', name: 'Top Right' },
    { id: 'top left', name: 'Top Left' },
    { id: 'center', name: 'Center' },
];

const announcementTemplates = [
    { label: "Welcome New Users", value: "Welcome new members! We're so glad to have you here. Introduce yourself in one of our Squares!" },
    { label: "Community Guidelines", value: "Community Guideline Reminder: Please be respectful and kind to one another. Let's keep our community positive!" },
    { label: "Feedback Request", value: "Have feedback or a great idea? Let our staff know! We're always looking to improve." },
    { label: "Square Spotlight", value: "Spotlight on a great Square: Check out \"{Square Name}\" for some awesome conversations!" },
    { label: "Invite Friends", value: "Let's grow our community! Invite your friends to join the fun at Azurewave." },
    { label: "New Feature: Chat Bubbles", value: "New Feature Alert! You can now customize your chat bubbles. Check it out in your profile settings!" },
    { label: "New Feature: DJ Rooms", value: "DJ Rooms are LIVE! Take over the music in your favorite Square or just listen in." },
    { label: "New Feature: Feed Wall", value: "Introducing the User Feed Wall! Share your thoughts and photos with the community. Find it in the sidebar." },
    { label: "New Feature: Games", value: "Game on! We've added new games. Challenge your friends and win some gold!" },
    { label: "New Feature: Paint It", value: "Feeling creative? The new \"Paint It\" feature lets you draw and share your art in chat." },
    { label: "New Feature: Username Styles", value: "Express yourself! New username styles and fonts are now available in the profile editor." },
    { label: "New Feature: DMs", value: "Private messaging has been enhanced! Enjoy smoother and more reliable DMs with your friends." },
    { label: "New Feature: Badges", value: "Level up your profile! We've added new badges to unlock. Can you collect them all?" },
    { label: "New Feature: Voice Messages", value: "Voice messaging is here! Send short audio clips in any Square. Just tap the mic icon." },
    { label: "New Feature: Smart Moderation", value: "Smart Moderation is active. Our system will now automatically handle spam and inappropriate language to keep things clean." },
    { label: "Event: Quiz Night", value: "Get ready for Quiz Night! Join us in the \"{Square Name}\" Square this Friday at 8 PM EST for a chance to win big prizes." },
    { label: "Event: Profile Contest", value: "Announcing our first-ever Profile Decoration Contest! The best-looking profile wins 1000 rubies." },
    { label: "Event: Double XP Weekend", value: "Double XP Weekend is here! All messages sent this weekend will earn you twice the experience points." },
    { label: "Event: Happy Hour", value: "Happy Hour! All gifts sent in the next hour will give the receiver double XP." },
    { label: "Event: DJ Battle", value: "DJ Battle happening now in the Arena! Come vote for your favorite DJ." },
    { label: "Event: Game Night", value: "Community Game Night! Join us for Truth or Dare in the 'Games' Square tonight." },
    { label: "Event: Joke Contest", value: "We're hosting a \"Best Joke\" competition. Post your best joke in the Comedy Square, and the most-liked one wins!" },
    { label: "Event: Theme Day", value: "Theme of the Day: {Theme}. Let's see your best posts and profile customizations related to the theme!" },
    { label: "Store: Gold Sale", value: "Limited Time Offer! Get 20% bonus Gold on all purchases this weekend only." },
    { label: "Store: New Gifts", value: "New arrivals in the Gift Shop! Check out the new premium gifts you can send." },
    { label: "Store: Flash Sale", value: "Flash Sale! For the next hour, all VIP gifts are 50% off." },
    { label: "Store: VIP Feature", value: "Become a VIP to unlock exclusive features, gifts, and chat styles!" },
    { label: "Store: Seasonal Gift", value: "A new seasonal gift has been added to the store for a limited time!" },
    { label: "Maintenance: Scheduled", value: "Scheduled Maintenance: The app will be briefly unavailable on {Date} at {Time} for scheduled updates." },
    { label: "Maintenance: Issues", value: "We are currently experiencing some technical difficulties. Our team is working on it, thank you for your patience." },
    { label: "Maintenance: Resolved", value: "The recent server issues have been resolved. We appreciate your understanding." },
    { label: "Maintenance: Complete", value: "Update complete! The app is back online. Enjoy the new improvements." },
    { label: "Moderation: Reminder", value: "A friendly reminder to keep conversations civil and follow our community rules." },
    { label: "Moderation: Hiring", value: "We're looking for new moderators! If you're an active and helpful member, apply today." },
    { label: "Moderation: New Staff", value: "Please welcome our new staff member, {Username}!" },
    { label: "Moderation: Rule Update", value: "Rule Update: Please review the updated community guidelines in the main menu." },
    { label: "Moderation: Safety", value: "Do not share personal information in public Squares. Stay safe online!" },
    { label: "Holiday: Halloween", value: "Happy Halloween! Spooky themes and gifts are now available for a limited time." },
    { label: "Holiday: General", value: "Happy Holidays from the Azurewave team! Enjoy a special XP boost all week." },
    { label: "Holiday: New Year", value: "Wishing you all a Happy New Year! Let's make it a great one." },
    { label: "Seasonal: Summer", value: "It's summertime! Check out our new summer-themed profile banners and backgrounds." },
    { label: "Seasonal: Valentine's", value: "Feeling the love? Valentine's Day gifts are now in the shop!" },
    { label: "Seasonal: St. Patrick's", value: "Luck of the Irish! St. Patrick's day themes and events are now live." },
    { label: "Fun: Fun Fact", value: "Fun Fact of the Day: {Fun Fact}. What do you think?" },
    { label: "Fun: QOTD", value: "Question of the Day: {Question}? Discuss in your favorite Square!" },
    { label: "Fun: Icebreakers", value: "Did you know? You can use `/wouldyourather` or `/icebreaker` to start a conversation in any room." },
    { label: "Fun: Help Bot", value: "Feeling lost? Type `.hi <your question>\` to ask our Superbot for help!" },
    { label: "Fun: Leaderboards", value: "Have you checked out the leaderboards today? See who's on top!" },
    { label: "Fun: Rate Profiles", value: "Don't forget to rate the profiles of users you enjoy chatting with!" },
    { label: "Fun: DJ Shoutout", value: "The DJ in {Square Name} is on fire! Go check out the tunes." },
    { label: "Fun: Top User", value: "Shoutout to {Username} for being our top chatter this week!" },
    { label: "Fun: Feed Wall", value: "The Feed Wall is buzzing! Go see what your friends are up to." },
];

function BotManagementCard({ users, squares, isLoading }: { users: User[] | null, squares: Square[] | null, isLoading: boolean }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const bots = useMemo(() => {
        if (!users) return [];
        const botIds = new Set(['superbot', 'gemma', 'quizbot', 'qbot']);
        return users.filter(u => u.role === 'Bot' || botIds.has(u.id));
    }, [users]);

    const [botSettings, setBotSettings] = useState<{ [botId: string]: { quizInterval: number, quizPointsWin: number } }>({});

    useEffect(() => {
        if (bots) {
            const initialSettings: { [botId: string]: any } = {};
            bots.forEach(bot => {
                if (bot.id === 'quizbot' || bot.id === 'qbot') {
                    initialSettings[bot.id] = {
                        quizInterval: bot.quizInterval || 10,
                        quizPointsWin: bot.quizPointsWin || 50,
                    };
                }
            });
            setBotSettings(initialSettings);
        }
    }, [bots]);

    const handleSettingsChange = (botId: string, field: 'quizInterval' | 'quizPointsWin', value: string) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            setBotSettings(prev => ({
                ...prev,
                [botId]: {
                    ...prev[botId],
                    [field]: numValue
                }
            }));
        }
    };
    
    const handleSaveSettings = (botId: string) => {
        const settings = botSettings[botId];
        if (settings) {
            updateDocumentNonBlocking(doc(firestore, 'users', botId), {
                quizInterval: settings.quizInterval,
                quizPointsWin: settings.quizPointsWin,
            });
            toast({ title: 'Bot Settings Saved' });
        }
    };

    const handleToggleBot = (botId: string, isEnabled: boolean) => {
        const botRef = doc(firestore, 'users', botId);
        updateDocumentNonBlocking(botRef, { isEnabled });
        toast({
            title: `Bot ${isEnabled ? 'Enabled' : 'Disabled'}`,
        });
    };

    const handleAssignRoom = (botId: string, squareId: string) => {
        const botRef = doc(firestore, 'users', botId);
        const newAssignedRoomId = squareId === 'none' ? '' : squareId;
        
        updateDocumentNonBlocking(botRef, { assignedRoomId: newAssignedRoomId });
        toast({
            title: `Bot Reassigned`,
        });
    };

    const handleSeedBots = async () => {
        const botsToSeed = [
            { id: 'superbot', displayName: 'Superbot', username: 'superbot', avatarUrl: '/interface_icons/superbot.svg', role: 'Bot', status: 'online', isEnabled: true, about: 'I am the CineNeon Superbot! I can answer questions and help with moderation.' },
            { id: 'gemma', displayName: 'Gemma', username: 'gemma', avatarUrl: '/interface_icons/gemma.svg', role: 'Bot', status: 'online', isEnabled: true, about: 'The Rizz Master herself. Charisma and witty advice at your service.' },
            { id: 'quizbot', displayName: 'Quizbot', username: 'quizbot', avatarUrl: '/interface_icons/quizbot.svg', role: 'Bot', status: 'online', isEnabled: true, about: 'Trivia, scrambles, and games! Join me in a Square to play.' }
        ];

        try {
            for (const bot of botsToSeed) {
                const botRef = doc(firestore, 'users', bot.id);
                await setDocumentNonBlocking(botRef, {
                    ...bot,
                    createdAt: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    messageCount: 0,
                    gold: 0,
                    rubies: 0,
                    level: 1,
                    xp: 0
                }, { merge: true });
            }
            toast({ title: 'System Bots Synchronized' });
        } catch (error) {
            console.error("Seeding bots error:", error);
            toast({ variant: 'destructive', title: 'Error Seeding Bots' });
        }
    };

    if (isLoading) {
        return <Card className="col-span-full"><CardHeader><CardTitle>Bot Management</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
    }

    return (
        <Card className="col-span-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle>Bot Management</CardTitle>
                    <CardDescription>Enable, disable, and assign bots to specific squares.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleSeedBots}>
                   Seed System Bots
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                {bots.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                        {bots.map(bot => {
                            const isQuizBot = bot.id === 'quizbot' || bot.id === 'qbot';
                            return (
                                <div key={bot.id} className="flex flex-col rounded-lg border p-4 space-y-4 bg-card-foreground/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <UserAvatar user={bot} className="h-12 w-12" />
                                            <div>
                                                <h3 className="text-lg font-semibold font-brand">{bot.displayName}</h3>
                                                {bot.about && <p className="text-xs text-muted-foreground line-clamp-2">{bot.about}</p>}
                                            </div>
                                        </div>
                                        <Switch
                                            id={`enable-bot-${bot.id}`}
                                            checked={bot.isEnabled ?? false}
                                            onCheckedChange={(checked) => handleToggleBot(bot.id, checked)}
                                        />
                                    </div>
                                    
                                    {isQuizBot && (
                                        <div className="space-y-4 pt-4 border-t">
                                            <div className="space-y-2">
                                                <Label htmlFor={`assign-room-${bot.id}`}>Assign to Square</Label>
                                                <Select
                                                    defaultValue={bot.assignedRoomId || 'none'}
                                                    onValueChange={(value) => handleAssignRoom(bot.id, value)}
                                                    disabled={!(bot.isEnabled ?? false)}
                                                >
                                                    <SelectTrigger id={`assign-room-${bot.id}`}>
                                                        <SelectValue placeholder="Select a square" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">None (Disabled)</SelectItem>
                                                        {squares?.map(square => (
                                                            <SelectItem key={square.id} value={square.id}>{square.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor={`quiz-interval-${bot.id}`}>Interval (min)</Label>
                                                    <Input
                                                        id={`quiz-interval-${bot.id}`}
                                                        type="number"
                                                        value={botSettings[bot.id]?.quizInterval || ''}
                                                        onChange={(e) => handleSettingsChange(bot.id, 'quizInterval', e.target.value)}
                                                        placeholder="e.g., 10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor={`quiz-points-${bot.id}`}>Points Win</Label>
                                                    <Input
                                                        id={`quiz-points-${bot.id}`}
                                                        type="number"
                                                        value={botSettings[bot.id]?.quizPointsWin || ''}
                                                        onChange={(e) => handleSettingsChange(bot.id, 'quizPointsWin', e.target.value)}
                                                        placeholder="e.g., 50"
                                                    />
                                                </div>
                                            </div>
                                            <Button onClick={() => handleSaveSettings(bot.id)} size="sm" className="w-full">Save Bot Settings</Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">No bots found in the system.</p>
                )}
            </CardContent>
        </Card>
    );
}


function RegistrationSettingsCard() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsRef = useMemoFirebase(() => doc(firestore, 'app_settings', 'theme'), [firestore]);
    const { data: settings, isLoading } = useDoc<ThemeSettings>(settingsRef);

    const [defaultRole, setDefaultRole] = useState('User');
    const [welcomeMessage, setWelcomeMessage] = useState('Welcome, {username}! Enjoy your stay.');
    const [initialGold, setInitialGold] = useState(0);
    const [initialRubies, setInitialRubies] = useState(0);
    const [muteNewUsersDuration, setMuteNewUsersDuration] = useState(0);
    const [disableRegistration, setDisableRegistration] = useState(false);

    useEffect(() => {
        if (settings) {
            setDefaultRole(settings.defaultRole || 'User');
            setWelcomeMessage(settings.welcomeMessage || 'Welcome, {username}! Enjoy your stay.');
            setInitialGold(settings.initialGold || 0);
            setInitialRubies(settings.initialRubies || 0);
            setMuteNewUsersDuration(settings.muteNewUsersDuration || 0);
            setDisableRegistration(settings.disableRegistration || false);
        }
    }, [settings]);

    const handleSave = () => {
        const updates = {
            defaultRole,
            welcomeMessage,
            initialGold: Number(initialGold) || 0,
            initialRubies: Number(initialRubies) || 0,
            muteNewUsersDuration: Number(muteNewUsersDuration) || 0,
            disableRegistration,
        };
        updateDocumentNonBlocking(settingsRef, updates);
        toast({
            title: "Registration Settings Saved!",
        });
    };

    if (isLoading) {
        return <Card className="col-span-full"><CardHeader><CardTitle>New User Registration</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
    }

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>New User Registration</CardTitle>
                <CardDescription>Configure actions and defaults for new user sign-ups.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="default-role">Default Role</Label>
                        <Select value={defaultRole} onValueChange={setDefaultRole}>
                            <SelectTrigger id="default-role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {['Owner', 'Co-Owner', 'Super Admin', 'Admin', 'Moderator', 'Super VIP', 'VIP', 'User', 'Guest'].map(role => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">The role automatically assigned to new users.</p>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="welcome-message">Welcome Message</Label>
                        <Textarea
                            id="welcome-message"
                            placeholder="Welcome, {username}! ..."
                            value={welcomeMessage}
                            onChange={(e) => setWelcomeMessage(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Use {'{username}'} as a placeholder for the user's name.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="initial-gold">Initial Gold</Label>
                        <Input
                            id="initial-gold"
                            type="number"
                            value={initialGold}
                            onChange={(e) => setInitialGold(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">Amount of gold to give new users.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="initial-rubies">Initial Rubies</Label>
                        <Input
                            id="initial-rubies"
                            type="number"
                            value={initialRubies}
                            onChange={(e) => setInitialRubies(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">Amount of rubies to give new users.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mute-new-users">
                            Mute New Users (minutes)
                        </Label>
                        <Input
                            id="mute-new-users"
                            type="number"
                            placeholder="0 for off"
                            value={muteNewUsersDuration}
                            onChange={(e) => setMuteNewUsersDuration(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">Automatically mute new users for a set duration. 0 to disable.</p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="disable-registration" className="text-base">Disable Registration</Label>
                            <p className="text-xs text-muted-foreground">
                                Prevent new users from signing up.
                            </p>
                        </div>
                        <Switch
                            id="disable-registration"
                            checked={disableRegistration}
                            onCheckedChange={setDisableRegistration}
                        />
                    </div>
                </div>
                 <div className="flex justify-end">
                    <Button onClick={handleSave}>Save Registration Settings</Button>
                </div>
            </CardContent>
        </Card>
    );
}

function ThemeCustomizer() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const themeSettingsRef = useMemoFirebase(() => doc(firestore, 'app_settings', 'theme'), [firestore]);
  const { data: activeThemeData, isLoading: isThemeLoading } = useDoc<ThemeSettings>(themeSettingsRef);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  
  const [selectedThemeName, setSelectedThemeName] = useState('Default');

  useEffect(() => {
    if (activeThemeData?.name) {
      setSelectedThemeName(activeThemeData.name);
    }
  }, [activeThemeData]);

  const handleApplyTheme = () => {
    const theme = THEMES.find(t => t.name === selectedThemeName);
    if (!theme) return;

    const { name, isDark, variables, backgroundUrl } = theme as any;
    const themeUpdate: Partial<ThemeSettings> = {
        name,
        isDark,
        variables,
    };
    
    if (typeof backgroundUrl !== 'undefined') {
        themeUpdate.defaultBackgroundUrl = backgroundUrl;
    }

    setDocumentNonBlocking(themeSettingsRef, themeUpdate, { merge: true });

    const root = document.documentElement;
    if ((theme as any).isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    Object.entries((theme as any).variables).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });

    toast({
      title: "Theme Applied!",
      description: (theme as any).backgroundUrl ? "The default background has also been updated." : "Theme colors have been updated.",
    });
  }
  
  const currentThemeIsSelected = activeThemeData?.name === selectedThemeName;

  const handleResetAllUserThemes = async () => {
    setIsResetting(true);
    try {
        const usersCollectionRef = collection(firestore, 'users');
        const userDocsSnapshot = await getDocs(usersCollectionRef);

        const batch = writeBatch(firestore);
        userDocsSnapshot.forEach(userDoc => {
            const userRef = doc(firestore, 'users', userDoc.id);
            // This will remove the fields from the document
            batch.update(userRef, {
                themeName: null,
                chatBackgroundUrl: null,
                chatDecorationUrl: null,
            });
        });

        await batch.commit();
        toast({ title: 'Success', description: 'All user themes have been reset.' });
    } catch (error) {
        console.error("Error resetting user themes:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not reset user themes.' });
    } finally {
        setIsResetting(false);
        setIsResetConfirmOpen(false);
    }
  };

  return (
    <>
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Theme Customizer</CardTitle>
        <CardDescription>Select and apply a new theme for the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isThemeLoading ? <div className="text-center">Loading themes...</div> : (
            <ScrollArea className="h-96 rounded-lg border border-black/50 bg-black/20 p-4 shadow-inner">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {THEMES.map(theme => (
                    <div key={theme.name}>
                        <button
                        className={`w-full border-2 rounded-lg p-2 ${selectedThemeName === theme.name ? 'border-primary' : 'border-border'}`}
                        onClick={() => setSelectedThemeName(theme.name)}
                        >
                        <div className="flex gap-2 mb-2">
                            {theme.previewColors.map((color, i) => (
                            <div key={i} className="h-8 w-full rounded" style={{ backgroundColor: color }} />
                            ))}
                        </div>
                        <span className="font-semibold text-sm">{theme.name}</span>
                        </button>
                    </div>
                    ))}
                </div>
            </ScrollArea>
        )}
        <div className="flex justify-end">
            <Button onClick={handleApplyTheme} disabled={isThemeLoading || currentThemeIsSelected}>Apply Theme</Button>
        </div>
      </CardContent>
    </Card>
    <Card className="col-span-full">
        <CardHeader>
            <CardTitle>Reset User Themes</CardTitle>
            <CardDescription>
                This will reset all individual user theme, background, and decoration choices to the site-wide default.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
                Reset All User Themes
            </Button>
        </CardContent>
    </Card>
     <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                        This will permanently remove all custom theme settings for all users. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsResetConfirmOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleResetAllUserThemes}
                        disabled={isResetting}
                        variant="destructive"
                    >
                        {isResetting ? 'Resetting...' : 'Yes, reset themes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}

function DefaultChatAppearanceCustomizer() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const themeSettingsRef = useMemoFirebase(() => doc(firestore, 'app_settings', 'theme'), [firestore]);
  const { data: themeSettings, isLoading } = useDoc<ThemeSettings>(themeSettingsRef);
  
  const [selectedBackground, setSelectedBackground] = useState('');
  const [selectedDecoration, setSelectedDecoration] = useState('');
  const [selectedDecorationPosition, setSelectedDecorationPosition] = useState('bottom right');

  useEffect(() => {
    if (themeSettings) {
      setSelectedBackground(themeSettings.defaultBackgroundUrl || '');
      setSelectedDecoration(themeSettings.defaultDecorationUrl || '');
      setSelectedDecorationPosition(themeSettings.defaultDecorationPosition || 'bottom right');
    }
  }, [themeSettings]);

  const handleSave = () => {
    const updates = {
      defaultBackgroundUrl: selectedBackground,
      defaultDecorationUrl: selectedDecoration,
      defaultDecorationPosition: selectedDecorationPosition,
    };
    updateDocumentNonBlocking(themeSettingsRef, updates);
    toast({
      title: "Default Appearance Saved!",
    });
  }

  const isUnchanged = (!themeSettings && selectedBackground === '' && selectedDecoration === '' && selectedDecorationPosition === 'bottom right') || (themeSettings?.defaultBackgroundUrl === selectedBackground && themeSettings?.defaultDecorationUrl === selectedDecoration && themeSettings?.defaultDecorationPosition === selectedDecorationPosition);
  
  if (isLoading) {
    return <Card><CardHeader><CardTitle>Default Chat Appearance</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Default Chat Appearance</CardTitle>
        <CardDescription>Set the default background and decoration for all chat rooms.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
            <Label className="text-base font-semibold">Default Background</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {backgroundOptions.map(bg => (
                    <button
                        key={bg.id}
                        className={`w-full border-2 rounded-lg p-2 ${selectedBackground === bg.url ? 'border-primary' : 'border-border'}`}
                        onClick={() => setSelectedBackground(bg.url)}
                    >
                        {bg.url ? <Image src={bg.url} alt={bg.name} width={150} height={100} className="w-full h-20 object-cover rounded-md" /> : <div className="h-20 w-full bg-secondary rounded-md flex items-center justify-center text-sm text-secondary-foreground">Default</div>}
                        <span className="font-semibold text-sm mt-2 block">{bg.name}</span>
                    </button>
                ))}
            </div>
        </div>
        <div>
            <Label className="text-base font-semibold">Default Decoration</Label>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {decorationOptions.map(deco => (
                  <button
                      key={deco.id}
                      className={`w-full border-2 rounded-lg p-2 ${selectedDecoration === deco.url ? 'border-primary' : 'border-border'}`}
                      onClick={() => setSelectedDecoration(deco.url)}
                  >
                      <div className="h-20 w-full bg-secondary rounded-md flex items-center justify-center">
                          {deco.url ? <Image src={deco.url} alt={deco.name} width={80} height={80} style={{objectFit: 'contain', padding: '0.25rem'}} /> : <span className="text-sm text-secondary-foreground">None</span>}
                      </div>
                      <span className="font-semibold text-sm mt-2 block">{deco.name}</span>
                  </button>
                ))}
            </div>
        </div>
        <div>
            <Label className="text-base font-semibold">Default Decoration Position</Label>
            <Select value={selectedDecorationPosition} onValueChange={setSelectedDecorationPosition}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {decorationPositionOptions.map(pos => (
                        <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isUnchanged}>Save Defaults</Button>
        </div>
      </CardContent>
    </Card>
  );
}


function GlobalAnnouncementCard() {
    const firestore = useFirestore();
    const { profile } = useEffectiveUserProfile();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<'important' | 'normal'>('normal');

    const handleSendAnnouncement = () => {
        if (!message.trim() || !profile) return;

        const announcementsCollection = collection(firestore, 'announcements');
        const announcementData: Omit<Announcement, 'id'> = {
            message: message.trim(),
            createdAt: new Date().toISOString(),
            createdBy: profile.displayName,
            category: category,
        };
        
        addDocumentNonBlocking(announcementsCollection, announcementData);

        toast({
            title: 'Announcement Sent!',
        });
        setMessage('');
        setCategory('normal');
    };

    const handleTemplateSelect = (templateValue: string) => {
        setMessage(templateValue);
    };

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Global Announcement</CardTitle>
                <CardDescription>Send a message to all users. It will appear as a banner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="announcement-template">Templates</Label>
                    <Select onValueChange={handleTemplateSelect}>
                        <SelectTrigger id="announcement-template">
                            <SelectValue placeholder="Select a template..." />
                        </SelectTrigger>
                        <SelectContent>
                            {announcementTemplates.map((template, index) => (
                                <SelectItem key={index} value={template.value}>{template.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Textarea
                    placeholder="Type your announcement here or select a template..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                />
                <div className="space-y-2">
                  <Label>Category</Label>
                  <RadioGroup defaultValue="normal" value={category} onValueChange={(value) => setCategory(value as 'important' | 'normal')}>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="normal" id="r-normal" />
                          <Label htmlFor="r-normal">Normal</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="important" id="r-important" />
                          <Label htmlFor="r-important">Important</Label>
                      </div>
                  </RadioGroup>
                </div>
                <Button onClick={handleSendAnnouncement} disabled={!message.trim()}>
                    Send Announcement
                </Button>
            </CardContent>
        </Card>
    );
}

function FeaturePermissionsManagement() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const permissionsRef = useMemoFirebase(() => doc(firestore, 'featurePermissions', 'config'), [firestore]);
    const { data: permissionsData, isLoading } = useDoc<FeaturePermissions>(permissionsRef);
    const [localPermissions, setLocalPermissions] = useState<Omit<FeaturePermissions, 'id'> | null>(null);

    useEffect(() => {
        if (!isLoading && !permissionsData) {
            const initialPermissions: Omit<FeaturePermissions, 'id'> = {
                usernameStyle: 'Owner',
                chatTextStyle: 'Owner',
                profileAvatar: 'Owner',
                profileBanner: 'Owner',
                chatBackground: 'Owner',
                sendGift: 'User',
                shareCurrency: 'User',
                useDjBooth: 'VIP',
                createPost: 'User',
                commentOnPost: 'User',
                reactToPost: 'User',
                privateMessaging: 'User',
                mentionUser: 'User',
                quoteMessage: 'User',
                useGhostMode: 'VIP',
            };
            setLocalPermissions(initialPermissions);
            setDocumentNonBlocking(permissionsRef, { id: 'config', ...initialPermissions }, {});
        } else if (permissionsData) {
            const { id, ...rest } = permissionsData;
            setLocalPermissions(rest);
        }
    }, [permissionsData, isLoading, permissionsRef]);

    const handlePermissionChange = (feature: keyof Omit<FeaturePermissions, 'id'>, rank: UserRank) => {
        setLocalPermissions(prev => {
            if (!prev) return null;
            return { ...prev, [feature]: rank };
        });
    };

    const handleSaveChanges = () => {
        if (localPermissions) {
            updateDocumentNonBlocking(permissionsRef, localPermissions);
            toast({ title: 'Feature Permissions Saved' });
        }
    };
    
    if (isLoading || !localPermissions) {
        return (
             <Card className="col-span-full">
                <CardHeader>
                    <CardTitle>Feature Permissions</CardTitle>
                    <CardDescription>Manage which user rank is required to access customization features.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Loading...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Feature Permissions</CardTitle>
                <CardDescription>Manage which user rank is required to access customization features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {CUSTOMIZATION_FEATURES.map(feature => (
                    <div key={feature.id} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <Label>{feature.label}</Label>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                        <Select
                            value={localPermissions[feature.id]}
                            onValueChange={(value: UserRank) => handlePermissionChange(feature.id, value)}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {USER_RANKS.map(rank => (
                                    <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
                <div className="flex justify-end mt-6">
                    <Button onClick={handleSaveChanges}>Save Permissions</Button>
                </div>
            </CardContent>
        </Card>
    )
}


function StaffPermissionsManagement() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const permissionsRef = useMemoFirebase(() => doc(firestore, 'staffPermissions', 'config'), [firestore]);
    const { data: permissionsData, isLoading } = useDoc<StaffPermissions>(permissionsRef);
    const [localPermissions, setLocalPermissions] = useState<StaffPermissions['roles'] | null>(null);

    useEffect(() => {
        if (!isLoading && !permissionsData) {
            const initialPermissions: StaffPermissions['roles'] = {};
            MANAGEABLE_ROLES.forEach(role => {
                initialPermissions[role] = [];
            });
            setLocalPermissions(initialPermissions);
            setDocumentNonBlocking(permissionsRef, { id: 'config', roles: initialPermissions }, {});
        } else if (permissionsData) {
            setLocalPermissions(permissionsData.roles);
        }
    }, [permissionsData, isLoading, permissionsRef]);

    const handlePermissionChange = (role: string, permissionId: Permission, isChecked: boolean) => {
        setLocalPermissions(prev => {
            if (!prev) return null;
            const updatedRoles = { ...prev };
            const currentPermissions = updatedRoles[role] || [];
            if (isChecked) {
                if (!currentPermissions.includes(permissionId)) {
                    updatedRoles[role] = [...currentPermissions, permissionId];
                }
            } else {
                updatedRoles[role] = currentPermissions.filter(p => p !== permissionId);
            }
            return updatedRoles;
        });
    };

    const handleSaveChanges = () => {
        if (localPermissions) {
            updateDocumentNonBlocking(permissionsRef, { roles: localPermissions });
            toast({ title: 'Permissions Saved' });
        }
    };
    
    if (isLoading || !localPermissions) {
        return (
             <Card className="col-span-full">
                <CardHeader>
                    <CardTitle>Staff Permissions</CardTitle>
                    <CardDescription>Manage what different staff roles can do across the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Loading...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Staff Permissions</CardTitle>
                <CardDescription>Manage what different staff roles can do across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue={MANAGEABLE_ROLES[0]}>
                    <TabsList>
                        {MANAGEABLE_ROLES.map(role => (
                            <TabsTrigger key={role} value={role}>{role}</TabsTrigger>
                        ))}
                    </TabsList>
                    {MANAGEABLE_ROLES.map(role => (
                        <TabsContent key={role} value={role} className="mt-4 space-y-4">
                            {PERMISSIONS_CONFIG.map(permission => (
                                <div key={permission.id} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <Label htmlFor={`${role}-${permission.id}`}>{permission.label}</Label>
                                        <p className="text-xs text-muted-foreground">
                                            {permission.description}
                                        </p>
                                    </div>
                                    <Switch
                                        id={`${role}-${permission.id}`}
                                        checked={localPermissions[role]?.includes(permission.id)}
                                        onCheckedChange={(checked) => handlePermissionChange(role, permission.id, checked)}
                                    />
                                </div>
                            ))}
                        </TabsContent>
                    ))}
                </Tabs>
                <div className="flex justify-end mt-6">
                    <Button onClick={handleSaveChanges}>Save Permissions</Button>
                </div>
            </CardContent>
        </Card>
    )
}

function UserManagementTable({ users, isLoading }: { users: User[] | null, isLoading: boolean }) {
    const [filter, setFilter] = useState('');

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user =>
            (user.displayName && user.displayName.toLowerCase().includes(filter.toLowerCase())) ||
            (user.email && user.email.toLowerCase().includes(filter.toLowerCase()))
        );
    }, [users, filter]);

    if (isLoading) {
        return <Card><CardHeader><CardTitle>User Management</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and search for users across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Input
                        placeholder="Filter by name or email..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Level</TableHead>
                                    <TableHead>Messages</TableHead>
                                    <TableHead>Joined</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={user} className="h-9 w-9" />
                                                    <div>
                                                        <div className="font-medium">{getEffectiveDisplayName(user)}</div>
                                                        <div className="text-muted-foreground text-sm">{user.email || 'No Email'}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getEffectiveUserRole(user, '')}</TableCell>
                                            <TableCell>{user.level || 1}</TableCell>
                                            <TableCell>{user.messageCount || 0}</TableCell>
                                            <TableCell>{user.createdAt ? format(new Date(user.createdAt), 'PP') : 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function SquareManagementTable({ squares, users, isLoading }: { squares: Square[] | null, users: User[] | null, isLoading: boolean }) {
    const [filter, setFilter] = useState('');

    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(user => [user.id, user]));
    }, [users]);

    const filteredSquares = useMemo(() => {
        if (!squares) return [];
        return squares.filter(square =>
            square.name.toLowerCase().includes(filter.toLowerCase()) ||
            (square.description && square.description.toLowerCase().includes(filter.toLowerCase()))
        );
    }, [squares, filter]);

    if (isLoading) {
        return <Card><CardHeader><CardTitle>Square Management</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Square Management</CardTitle>
                <CardDescription>View and manage all squares on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Input
                        placeholder="Filter by name or description..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="max-w-sm"
                    />
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Square</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Creator</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSquares.length > 0 ? (
                                    filteredSquares.map(square => {
                                        const creator = usersMap.get(square.creatorId);
                                        return (
                                        <TableRow key={square.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={{displayName: square.name, avatarUrl: square.avatarUrl, id: square.id} as User} className="h-9 w-9 rounded-md" isSquare />
                                                    <div>
                                                        <div className="font-medium">{square.name}</div>
                                                        <div className="text-muted-foreground text-sm line-clamp-1">{square.description}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{square.type}</TableCell>
                                            <TableCell>{creator ? getEffectiveDisplayName(creator) : square.creatorId}</TableCell>
                                        </TableRow>
                                    )})
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No squares found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function GeneralSettingsCard() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsRef = useMemoFirebase(() => doc(firestore, 'app_settings', 'theme'), [firestore]);
    const { data: settings, isLoading } = useDoc<ThemeSettings>(settingsRef);
    const [localSettings, setLocalSettings] = useState<Partial<ThemeSettings>>({});

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const handleSettingChange = (key: keyof ThemeSettings, value: any) => {
        setLocalSettings(prev => ({...prev, [key]: value}));
    }

    const handleSave = () => {
        updateDocumentNonBlocking(settingsRef, localSettings);
        toast({ title: "General Settings Saved" });
    };

    if (isLoading) {
        return <Card><CardHeader><CardTitle>General Settings</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Manage general settings for the entire platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <Label>Maintenance Mode</Label>
                        <p className="text-xs text-muted-foreground">Only Owners can access the site.</p>
                    </div>
                    <Switch checked={localSettings.isMaintenanceMode ?? false} onCheckedChange={(v) => handleSettingChange('isMaintenanceMode', v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <Label>Guest Access</Label>
                        <p className="text-xs text-muted-foreground">Allow users to join as guests.</p>
                    </div>
                    <Switch checked={localSettings.guestAccessEnabled ?? false} onCheckedChange={(v) => handleSettingChange('guestAccessEnabled', v)} />
                </div>
                <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor="log-retention">Log Retention (days)</Label>
                    <Input id="log-retention" type="number" value={localSettings.logRetentionDays ?? ''} onChange={(e) => handleSettingChange('logRetentionDays', Number(e.target.value))} />
                    <p className="text-xs text-muted-foreground">How long to keep moderation and system logs.</p>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} className="ml-auto">Save General Settings</Button>
            </CardFooter>
        </Card>
    )
}

function ChatFeaturesCard() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsRef = useMemoFirebase(() => doc(firestore, 'app_settings', 'theme'), [firestore]);
    const { data: settings, isLoading } = useDoc<ThemeSettings>(settingsRef);
    const [localSettings, setLocalSettings] = useState<Partial<ThemeSettings>>({});

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const handleSettingChange = (key: keyof ThemeSettings, value: any) => {
        setLocalSettings(prev => ({...prev, [key]: value}));
    }

    const handleSave = () => {
        updateDocumentNonBlocking(settingsRef, localSettings);
        toast({ title: "Chat Features Saved" });
    };

    const chatFeatures: {id: keyof ThemeSettings, label: string}[] = [
        {id: 'chatImageEnabled', label: 'Share Images'},
        {id: 'chatVideoEnabled', label: 'Share Videos'},
        {id: 'chatAudioEnabled', label: 'Send Audio Messages'},
        {id: 'chatFileEnabled', label: 'Share Files'},
        {id: 'gamesEnabled', label: 'Enable Games'},
        {id: 'youtubeEmbedsEnabled', label: 'YouTube Embeds'},
        {id: 'drawingCanvasEnabled', label: 'Drawing Canvas (PaintIt)'},
        {id: 'richTextFormattingEnabled', label: 'Rich Text Formatting'},
    ];

    if (isLoading) {
        return <Card><CardHeader><CardTitle>Chat Features</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Chat Features</CardTitle>
                <CardDescription>Enable or disable specific features in chat rooms.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {chatFeatures.map(feature => (
                    <div key={feature.id} className="flex items-center justify-between rounded-lg border p-4">
                        <Label>{feature.label}</Label>
                        <Switch checked={!!localSettings[feature.id]} onCheckedChange={(v) => handleSettingChange(feature.id, v)} />
                    </div>
                ))}
            </CardContent>
             <CardFooter>
                 <Button onClick={handleSave} className="ml-auto">Save Chat Features</Button>
            </CardFooter>
        </Card>
    );
}

function ContentModerationCard() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsRef = useMemoFirebase(() => doc(firestore, 'app_settings', 'theme'), [firestore]);
    const { data: settings, isLoading } = useDoc<ThemeSettings>(settingsRef);
    const [localSettings, setLocalSettings] = useState<Partial<ThemeSettings>>({});

    useEffect(() => {
        if (settings) {
            setLocalSettings({
                forbiddenWords: settings.forbiddenWords || '',
                chatSpeedLimit: settings.chatSpeedLimit || 0,
                maxMessageLength: settings.maxMessageLength || 500,
                profanityFilterEnabled: settings.profanityFilterEnabled ?? false,
                nameChangeCooldown: settings.nameChangeCooldown || 0,
            });
        }
    }, [settings]);
    
    const handleSettingChange = (key: keyof ThemeSettings, value: any) => {
        setLocalSettings(prev => ({...prev, [key]: value}));
    }

    const handleSave = () => {
        updateDocumentNonBlocking(settingsRef, localSettings);
        toast({ title: "Content & Moderation Settings Saved" });
    };
    
    if (isLoading) {
        return <Card><CardHeader><CardTitle>Content & Moderation</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Content & Moderation</CardTitle>
                <CardDescription>Manage content filtering and other moderation tools.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <Label>Profanity Filter</Label>
                    <Switch checked={!!localSettings.profanityFilterEnabled} onCheckedChange={(v) => handleSettingChange('profanityFilterEnabled', v)} />
                </div>
                 <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor="forbidden-words">Forbidden Words</Label>
                    <Textarea id="forbidden-words" value={localSettings.forbiddenWords ?? ''} onChange={(e) => handleSettingChange('forbiddenWords', e.target.value)} placeholder="Enter comma-separated words..." />
                    <p className="text-xs text-muted-foreground mt-2">Comma-separated list of words to automatically filter from chat.</p>
                </div>
                 <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor="chat-speed-limit">Chat Speed Limit (seconds)</Label>
                    <Input id="chat-speed-limit" type="number" value={localSettings.chatSpeedLimit ?? ''} onChange={(e) => handleSettingChange('chatSpeedLimit', Number(e.target.value))} placeholder="0 for off" />
                    <p className="text-xs text-muted-foreground mt-2">Delay between user messages (slow mode).</p>
                </div>
                 <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor="max-message-length">Max Message Length</Label>
                    <Input id="max-message-length" type="number" value={localSettings.maxMessageLength ?? ''} onChange={(e) => handleSettingChange('maxMessageLength', Number(e.target.value))} placeholder="e.g. 500" />
                    <p className="text-xs text-muted-foreground mt-2">Maximum characters per message.</p>
                </div>
                 <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor="name-change-cooldown">Name Change Cooldown (hours)</Label>
                    <Input id="name-change-cooldown" type="number" value={localSettings.nameChangeCooldown ?? ''} onChange={(e) => handleSettingChange('nameChangeCooldown', Number(e.target.value))} placeholder="0 for no cooldown" />
                    <p className="text-xs text-muted-foreground mt-2">Time a user must wait before changing their name again.</p>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} className="ml-auto">Save Moderation Settings</Button>
            </CardFooter>
        </Card>
    );
}

function SecurityCard() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsRef = useMemoFirebase(() => doc(firestore, 'app_settings', 'theme'), [firestore]);
    const { data: settings, isLoading } = useDoc<ThemeSettings>(settingsRef);
    const [localSettings, setLocalSettings] = useState<Partial<ThemeSettings>>({});

    useEffect(() => {
        if (settings) {
            setLocalSettings({
                linkHandling: settings.linkHandling || 'new_tab',
                domainWhitelist: settings.domainWhitelist || '',
                antiSpamBotEnabled: settings.antiSpamBotEnabled ?? false,
            });
        }
    }, [settings]);

    const handleSettingChange = (key: keyof ThemeSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        updateDocumentNonBlocking(settingsRef, localSettings);
        toast({ title: "Security Settings Saved" });
    };

    if (isLoading) {
        return <Card><CardHeader><CardTitle>Security</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage security settings for the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor="link-handling">Link Handling</Label>
                    <Select value={localSettings.linkHandling ?? 'new_tab'} onValueChange={(v) => handleSettingChange('linkHandling', v)}>
                        <SelectTrigger id="link-handling">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new_tab">Open in new tab</SelectItem>
                            <SelectItem value="same_tab">Open in same tab</SelectItem>
                            <SelectItem value="warning">Show warning before opening</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">How to handle external links posted in chat.</p>
                </div>
                <div className="space-y-2 rounded-lg border p-4">
                    <Label htmlFor="domain-whitelist">Domain Whitelist</Label>
                    <Textarea id="domain-whitelist" value={localSettings.domainWhitelist ?? ''} onChange={(e) => handleSettingChange('domainWhitelist', e.target.value)} placeholder="e.g., youtube.com, twitch.tv" />
                    <p className="text-xs text-muted-foreground">Comma-separated list of allowed domains for links.</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <Label>Anti-Spam Bot</Label>
                    <Switch checked={!!localSettings.antiSpamBotEnabled} onCheckedChange={(v) => handleSettingChange('antiSpamBotEnabled', v)} />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} className="ml-auto">Save Security Settings</Button>
            </CardFooter>
        </Card>
    );
}

function ModerationLogCard({ moderationActions, users, isLoading }: { moderationActions: ModerationAction[] | null, users: User[] | null, isLoading: boolean }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isClearLogConfirmOpen, setIsClearLogConfirmOpen] = useState(false);
    
    const usersMap = useMemo(() => {
        if (!users) return new Map();
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const handleClearLog = async () => {
        const moderationActionsCollection = collection(firestore, 'moderationActions');
        try {
            const snapshot = await getDocs(moderationActionsCollection);
            if (snapshot.empty) {
                toast({ title: "Log is already empty" });
                return;
            }
            const batch = writeBatch(firestore);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            toast({ title: "Moderation Log Cleared" });
        } catch (error) {
            console.error("Error clearing moderation log:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not clear moderation log." });
        } finally {
            setIsClearLogConfirmOpen(false);
        }
    };
    
    if (isLoading) {
        return <Card><CardHeader><CardTitle>Moderation Log</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
    }
    
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Moderation Log</CardTitle>
                    <CardDescription>A log of all moderation actions taken on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Moderator</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {moderationActions && moderationActions.length > 0 ? (
                                    moderationActions.map(action => {
                                        const user = usersMap.get(action.userId);
                                        const moderator = usersMap.get(action.moderatorId);
                                        return (
                                            <TableRow key={action.id}>
                                                <TableCell>{user ? getEffectiveDisplayName(user) : action.userId}</TableCell>
                                                <TableCell>{action.actionType}</TableCell>
                                                <TableCell>{moderator ? getEffectiveDisplayName(moderator) : action.moderatorId}</TableCell>
                                                <TableCell>{format(new Date(action.createdAt), 'PPp')}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No moderation actions found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                <CardFooter>
                    <Button variant="destructive" onClick={() => setIsClearLogConfirmOpen(true)} className="ml-auto" disabled={!moderationActions || moderationActions.length === 0}>
                        Clear Log
                    </Button>
                </CardFooter>
            </Card>
            <Dialog open={isClearLogConfirmOpen} onOpenChange={setIsClearLogConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the entire moderation log. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsClearLogConfirmOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleClearLog}
                            variant="destructive"
                        >
                            Yes, clear log
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

function AdminPageContent() {
  const { profile: userProfile, isLoading: isProfileLoading } = useEffectiveUserProfile();
  const router = useRouter();
  const firestore = useFirestore();
  const { hasPermission } = useChat();

  useEffect(() => {
    if (!isProfileLoading && (!userProfile || !['Owner', 'Co-Owner', 'Super Admin', 'Admin'].includes(userProfile.role || ''))) {
      router.replace('/squares');
    }
  }, [isProfileLoading, userProfile, router]);
  
  // Data fetching
  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersCollectionRef);

  const squaresCollectionRef = useMemoFirebase(() => collection(firestore, 'squares'), [firestore]);
  const { data: allSquares, isLoading: areSquaresLoading } = useCollection<Square>(squaresCollectionRef);

  const userSquaresCollectionRef = useMemoFirebase(() => collection(firestore, 'userSquares'), [firestore]);
  const { data: userSquares, isLoading: areUserSquaresLoading } = useCollection<UserSquare>(userSquaresCollectionRef);

  const recentUsersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), orderBy('createdAt', 'desc'), limit(5)), [firestore]);
  const { data: recentUsers, isLoading: areRecentUsersLoading } = useCollection<User>(recentUsersQuery);
  
  const moderationActionsCollectionRef = useMemoFirebase(() => query(collection(firestore, 'moderationActions'), orderBy('createdAt', 'desc')), [firestore]);
  const { data: allModerationActions, isLoading: areModerationActionsLoading } = useCollection<ModerationAction>(moderationActionsCollectionRef);

  const signupChartData = useMemo(() => {
    if (!allUsers) return [];
    const data: { [key: string]: number } = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const formattedDate = format(date, 'MMM d');
        data[formattedDate] = 0;
    }

    allUsers.forEach(user => {
        if (user.createdAt) {
            const signupDate = new Date(user.createdAt);
            if (signupDate >= subDays(today, 6)) {
                const formattedDate = format(signupDate, 'MMM d');
                if (data[formattedDate] !== undefined) {
                    data[formattedDate]++;
                }
            }
        }
    });

    return Object.keys(data).map(date => ({ date, signups: data[date] }));
  }, [allUsers]);

  const chartConfig = {
    signups: {
      label: "Signups",
      color: "hsl(var(--chart-1))",
    },
  };

  const stats = useMemo(() => {
    const onlineUserIds = new Set(userSquares?.map(ucr => ucr.userId));
    const totalMessages = allUsers?.reduce((sum, user) => sum + (user.messageCount || 0), 0) || 0;
    return {
      totalUsers: allUsers?.length || 0,
      totalSquares: allSquares?.length || 0,
      onlineUsers: onlineUserIds.size || 0,
      totalMessages: totalMessages,
    };
  }, [allUsers, allSquares, userSquares]);

  const { popularSquares, topUsers } = useMemo(() => {
    if (!allUsers || !allSquares || !userSquares) return { popularSquares: [], topUsers: [] };

    // Popular Squares
    const squareUserCounts: { [squareId: string]: number } = {};
    for (const userSquare of userSquares) {
        squareUserCounts[userSquare.squareId] = (squareUserCounts[userSquare.squareId] || 0) + 1;
    }
    const sortedSquares = [...allSquares]
        .map(s => ({ ...s, onlineCount: squareUserCounts[s.id] || 0 }))
        .sort((a, b) => b.onlineCount - a.onlineCount)
        .slice(0, 5);

    // Top Users
    const sortedUsers = [...allUsers]
        .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
        .slice(0, 5);
        
    return { popularSquares: sortedSquares, topUsers: sortedUsers };
  }, [allUsers, allSquares, userSquares]);


  if (isProfileLoading || !userProfile || !['Owner', 'Co-Owner', 'Super Admin', 'Admin'].includes(userProfile.role || '')) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const isLoading = areUsersLoading || areSquaresLoading || areUserSquaresLoading || areRecentUsersLoading || areModerationActionsLoading;
  
  const canViewAnalytics = hasPermission(userProfile, 'viewAnalytics');
  const canManagePermissions = hasPermission(userProfile, 'managePermissions');
  const canSendAnnouncements = hasPermission(userProfile, 'sendGlobalAnnouncements');
  const canManageUsers = hasPermission(userProfile, 'manageUsers');
  const canManageTheme = hasPermission(userProfile, 'manageTheme');
  const canManageBots = hasPermission(userProfile, 'manageBotsInAnySquare');
  const canManageRegistration = hasPermission(userProfile, 'manageRegistration');
  const canManageSystem = userProfile.role === 'Owner';
  
  const TABS_CONFIG = [
    { value: 'dashboard', label: 'Dashboard', condition: canViewAnalytics },
    { value: 'users', label: 'Users', condition: canManageUsers },
    { value: 'squares', label: 'Squares', condition: canManageUsers },
    { value: 'bots', label: 'Bots', condition: canManageBots },
    { value: 'permissions', label: 'Permissions', condition: canManagePermissions },
    { value: 'theme', label: 'Theme', condition: canManageTheme },
    { value: 'registration', label: 'Registration', condition: canManageRegistration },
    { value: 'announcements', label: 'Announcements', condition: canSendAnnouncements },
    { value: 'system', label: 'System', condition: canManageSystem },
  ];
  
  const availableTabs = TABS_CONFIG.filter(tab => tab.condition);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 overflow-y-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
      </div>

      {availableTabs.length > 0 ? (
        <Tabs defaultValue={availableTabs[0].value} className="w-full">
            <TabsList className="flex flex-wrap h-auto">
                {availableTabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} className="flex-grow m-1">{tab.label}</TabsTrigger>
                ))}
            </TabsList>
            
            {canViewAnalytics && (
                <TabsContent value="dashboard" className="mt-6">
                    <div className="space-y-4">
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                                <FontAwesomeIcon icon={faComments} className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{isLoading ? '...' : stats.totalMessages.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">Total messages sent</p>
                            </CardContent>
                            </Card>
                            <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                <FontAwesomeIcon icon={faUsers} className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{isLoading ? '...' : stats.totalUsers}</div>
                                <p className="text-xs text-muted-foreground">+10 from last week</p>
                            </CardContent>
                            </Card>
                            <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Squares</CardTitle>
                                <FontAwesomeIcon icon={faDoorOpen} className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{isLoading ? '...' : stats.totalSquares}</div>
                                <p className="text-xs text-muted-foreground">+2 since last week</p>
                            </CardContent>
                            </Card>
                            <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Online Now</CardTitle>
                                <FontAwesomeIcon icon={faSignal} className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{isLoading ? '...' : stats.onlineUsers}</div>
                                <p className="text-xs text-muted-foreground">Live count of users</p>
                            </CardContent>
                            </Card>
                        </div>
                        <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
                            <Card className="col-span-1 lg:col-span-4"><CardHeader><CardTitle>Signups Overview</CardTitle><CardDescription>New users in the last 7 days.</CardDescription></CardHeader><CardContent className="pl-2"><ChartContainer config={chartConfig} className="h-[350px] w-full"><LineChart data={signupChartData}><CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} /><ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} /><Line dataKey="signups" type="natural" stroke="var(--color-signups)" strokeWidth={2} dot={false} /></LineChart></ChartContainer></CardContent></Card>
                            <Card className="col-span-1 lg:col-span-3">
                                <CardHeader>
                                    <CardTitle>Recent Signups</CardTitle>
                                    <CardDescription>Newest members of the community.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {areRecentUsersLoading ? (
                                            <p>Loading...</p>
                                        ) : recentUsers && recentUsers.length > 0 ? (
                                            recentUsers.map(user => (
                                                <div className="flex items-center" key={user.id}>
                                                    <UserAvatar user={user} className="h-9 w-9" />
                                                    <div className="ml-4 space-y-1">
                                                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                                                        <p className="text-sm text-muted-foreground">{user.email || 'Guest'}</p>
                                                    </div>
                                                    <div className="ml-auto font-medium text-sm">
                                                        {user.createdAt ? format(new Date(user.createdAt), 'MMM d') : ''}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center">No recent signups.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                            <Card><CardHeader><CardTitle>Popular Squares</CardTitle><CardDescription>Top 5 squares with the most users online.</CardDescription></CardHeader><CardContent>{isLoading ? ( <p>Loading...</p> ) : ( <Table><TableHeader><TableRow><TableHead>Square</TableHead><TableHead className="text-right">Online</TableHead></TableRow></TableHeader><TableBody>{popularSquares.map(square => ( <TableRow key={square.id}><TableCell><div className="flex items-center gap-3"><UserAvatar user={{displayName: square.name, avatarUrl: square.avatarUrl, id: square.id} as User} className="h-9 w-9 rounded-md" isSquare /><div className="min-w-0"><div className="font-medium truncate">{square.name}</div><div className="text-muted-foreground text-sm line-clamp-1">{square.description}</div></div></div></TableCell><TableCell className="text-right font-medium">{square.onlineCount}</TableCell></TableRow> ))}</TableBody></Table> )}</CardContent></Card>
                            <Card><CardHeader><CardTitle>Top Users</CardTitle><CardDescription>Top 5 users by message count.</CardDescription></CardHeader><CardContent>{isLoading ? ( <p>Loading...</p> ) : ( <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead className="text-right">Messages</TableHead></TableRow></TableHeader><TableBody>{topUsers.map(user => ( <TableRow key={user.id}><TableCell><div className="flex items-center gap-3"><UserAvatar user={user} className="h-9 w-9" /><div><div className="font-medium">{getEffectiveDisplayName(user)}</div><div className="text-muted-foreground text-sm">{user.email || 'No Email'}</div></div></div></TableCell><TableCell className="text-right font-medium">{(user.messageCount || 0).toLocaleString()}</TableCell></TableRow> ))}</TableBody></Table> )}</CardContent></Card>
                        </div>
                    </div>
                </TabsContent>
            )}

            {canManageUsers && (
                <TabsContent value="users" className="mt-6">
                    <UserManagementTable users={allUsers} isLoading={areUsersLoading} />
                </TabsContent>
            )}

            {canManageUsers && (
                <TabsContent value="squares" className="mt-6">
                    <SquareManagementTable squares={allSquares} users={allUsers} isLoading={areSquaresLoading || areUsersLoading} />
                </TabsContent>
            )}
            
            {canManageBots && (
                 <TabsContent value="bots" className="mt-6">
                    <BotManagementCard users={allUsers} squares={allSquares} isLoading={areUsersLoading || areSquaresLoading} />
                 </TabsContent>
            )}

            {canManagePermissions && (
                 <TabsContent value="permissions" className="mt-6">
                    <div className="space-y-4">
                        <StaffPermissionsManagement />
                        <FeaturePermissionsManagement />
                    </div>
                 </TabsContent>
            )}

            {canManageTheme && (
                 <TabsContent value="theme" className="mt-6">
                    <div className="space-y-4">
                        <ThemeCustomizer />
                        <DefaultChatAppearanceCustomizer />
                    </div>
                 </TabsContent>
            )}
            
            {canManageRegistration && (
                <TabsContent value="registration" className="mt-6">
                    <RegistrationSettingsCard />
                </TabsContent>
            )}

            {canSendAnnouncements && (
                <TabsContent value="announcements" className="mt-6">
                    <GlobalAnnouncementCard />
                </TabsContent>
            )}

            {canManageSystem && (
                <TabsContent value="system" className="mt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-6">
                            <GeneralSettingsCard />
                            <ChatFeaturesCard />
                            <ContentModerationCard />
                            <SecurityCard />
                        </div>
                        <ModerationLogCard moderationActions={allModerationActions} users={allUsers} isLoading={areModerationActionsLoading || areUsersLoading} />
                    </div>
                </TabsContent>
            )}
        </Tabs>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl font-bold tracking-tight">
                No Permissions
              </h3>
              <p className="text-sm text-muted-foreground">
                You do not have permissions to view any admin sections.
              </p>
            </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage({ handleSetTheme, activeTheme, soundState, setSoundState }: any) {
    return (
        <AppLayout
            soundState={soundState}
            setSoundState={setSoundState}
        >
            <AdminPageContent />
        </AppLayout>
    );
}

    

