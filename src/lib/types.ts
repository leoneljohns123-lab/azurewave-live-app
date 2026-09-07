

import { BadgeDefinition } from './badge-definitions';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type EarnedBadge = {
  id: string; // The ID of the badge from badge-definitions.ts
  timestamp: string;
};

export type UserBadge = EarnedBadge & BadgeDefinition;

export type Gift = {
  id: string;
  name: string;
  price: number;
  currency: 'gold' | 'rubies';
  icon: string;
  category: 'regular' | 'vip' | 'premium';
};

export type Report = {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
};

export type WarningRecord = {
  moderatorId: string;
  reason: string;
  createdAt: string;
};

export type Permission =
  | 'createSquare'
  | 'featureSquare'
  | 'verifySquare'
  | 'setGlobalRole'
  | 'loginAsUser'
  | 'deleteAnySquare'
  | 'clearAnyChat'
  | 'manageBotsInAnySquare'
  | 'viewAnalytics'
  | 'managePermissions'
  | 'sendGlobalAnnouncements'
  | 'manageUsers'
  | 'manageTheme'
  | 'manageCustomCss'
  | 'warnUser'
  | 'kickUser'
  | 'muteUser'
  | 'banUser'
  | 'gagUser'
  | 'setTempNick'
  | 'makeAnonymous'
  | 'summonUser'
  | 'undoModeration'
  | 'manageRegistration'
  | 'managePosts'
  | 'pinPosts'
  | 'viewReports'
  | 'viewWhois'
  | 'forceSpeak';

export type StaffPermissions = {
  id: 'config';
  roles: {
    [role: string]: Permission[];
  };
};

export type UserRank = 'Owner' | 'Super Admin' | 'Admin' | 'Moderator' | 'Super VIP' | 'VIP' | 'User';

export type FeaturePermission =
  | 'usernameStyle'
  | 'chatTextStyle'
  | 'profileAvatar'
  | 'profileBanner'
  | 'chatBackground'
  | 'sendGift'
  | 'shareCurrency'
  | 'useDjBooth'
  | 'createPost'
  | 'commentOnPost'
  | 'reactToPost'
  | 'privateMessaging'
  | 'mentionUser'
  | 'quoteMessage'
  | 'useGhostMode';

export type FeaturePermissions = {
  id: 'config';
  usernameStyle: UserRank;
  chatTextStyle: UserRank;
  profileAvatar: UserRank;
  profileBanner: UserRank;
  chatBackground: UserRank;
  sendGift: UserRank;
  shareCurrency: UserRank;
  useDjBooth: UserRank;
  createPost: UserRank;
  commentOnPost: UserRank;
  reactToPost: UserRank;
  privateMessaging: UserRank;
  mentionUser: UserRank;
  quoteMessage: UserRank;
  useGhostMode: UserRank;
};

export type User = {
  id: string;
  displayName: string;
  username: string;
  lowercaseUsername?: string;
  avatarUrl: string;
  email: string | null;
  role?: string;
  gender?: 'male' | 'female' | 'other' | 'private';
  country?: string;
  status?: 'online' | 'away' | 'busy' | 'invisible' | 'working' | 'angry' | 'birthday' | 'friendly' | 'happy' | 'listening_to_music' | 'sad' | 'watching';
  mood?: string;
  level?: number;
  xp?: number;
  quizPoints?: number;
  quizInterval?: number; // How often bot posts a question, in minutes
  quizPointsWin?: number; // Points awarded for winning
  mutedUntil?: string;
  kickedUntil?: string;
  gaggedUntil?: string;
  temporaryNickname?: string;
  tempNickUntil?: string;
  anonymousUntil?: string;
  averageRating?: number;
  ratingCount?: number;
  createdAt?: string;
  lastSeen?: string;
  messageCount?: number;
  badges?: EarnedBadge[];
  gold?: number;
  rubies?: number;
  about?: string;
  squareRoles?: { [squareId: string]: string };
  bannedFromSquares?: {
    [squareId: string]: {
      until: string; // ISO string. '9999-...' for permanent.
      reason: string;
    }
  };
  isGhost?: boolean;
  isEnabled?: boolean;
  assignedRoomId?: string;
  gifts?: {
    sent: { total: number; unique: number; inventory?: { [key: string]: number } };
    received: { total: number; unique: number; inventory?: { [key: string]: number } };
  };
  profileLikes?: number;
  warnings?: WarningRecord[];


  // New fields for edit profile dialog
  age?: number;
  banner?: string;
  instagram?: string;
  tiktok?: string;
  snapchat?: string;
  profileEdits?: number;
  isVerified?: boolean;
  displayBadgeId?: string | null;
  pinnedSquares?: string[];
  nameColor?: string;
  nameFont?: string;
  nameStyle?: 'color' | 'neon' | 'gradient';
  chatTextColor?: string;
  chatTextStyle?: 'color' | 'neon' | 'gradient';
  chatTextFont?: string;
  chatTextFontStyle?: string;
  chatBubbleShape?: string;
  chatBubbleFill?: string;
  chatBackgroundUrl?: string;
  chatDecorationUrl?: string;
  chatDecorationPosition?: string;
  aboutStyle?: 'color' | 'neon' | 'gradient';
  aboutFont?: string;
  aboutColor?: string;

  // Badge-related properties
  goldSpent?: number;
  rubiesSpent?: number;
  friendsCount?: number;
  contestWins?: number;

  // Store related
  purchasedItems?: string[];
  drawingCanvasEnabled?: boolean;

  // Whois related
  lastLoginIpHash?: string;
  registrationIpHash?: string;
  lastLoginLocation?: string;
  previousUsernames?: string[];

  // Security Correlation
  isBot?: boolean;
  securityFingerprint?: string;
};

export type Message = {
  id:string;
  squareId: string;
  senderId: string;
  originalSenderId?: string;
  content: string;
  timestamp: string;
  isSpotlighted?: boolean;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  documentUrl?: string;
  documentName?: string;
  youtubeVideoId?: string;
  youtubeTitle?: string;
  messageType?: 'user' | 'join_log' | 'clear_log' | 'moderation_log' | 'quiz_question' | 'quiz_answer' | 'quiz_hint' | 'quiz_winner' | 'qbot_question' | 'qbot_winner' | 'qbot_hint' | 'qbot_answer' | 'gift_log' | 'image' | 'audio' | 'video' | 'document' | 'confession';
  quote?: {
    messageId: string;
    content: string;
    senderId: string;
    senderName: string;
  };
  forcedBy?: {
    id: string;
    displayName: string;
  };
  quiz?: {
    quizId?: string;
    question?: string;
    options?: string[];
    correctAnswer?: string;
    wordCount?: number;
    hint?: string;
    quizType?: 'trivia' | 'scramble';
    winnerInfo?: {
      userId: string;
      displayName: string;
      answer: string;
      pointsWon: number;
      totalPoints: number;
    };
  };
  qbotQuiz?: {
    id?: string;
    question?: string;
    correctAnswer?: string;
    category?: string;
    hint?: string;
    wordCount?: number;
    winnerInfo?: {
        userId: string;
        displayName: string;
        answer: string;
        pointsWon: number;
        totalPoints: number;
    };
  };
  gift?: {
    senderName: string;
    receiverName: string;
    giftName: string;
    giftIcon: string;
  }
};

export type NowPlaying = {
  youtubeId: string;
  title: string;
  isPlaying: boolean;
  startedAt: string; // ISO string
};

export type Square = {
  id:string;
  name: string;
  description: string;
  creatorId: string;
  type: 'public' | 'private';
  password?: string;
  avatarUrl?: string;
  memberIds?: string[];
  djId?: string;
  nowPlaying?: NowPlaying;
  djPanelBackground?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  isVipOnly?: boolean;
  isAdminOnly?: boolean;
  isStaffOnly?: boolean;
  isMembersOnly?: boolean;
  backgroundUrl?: string;
  isCallEnabled?: boolean;
  lastMessage?: {
    content: string;
    timestamp: string;
    senderName: string;
  };
  call?: {
    isActive: boolean;
    participants: string[];
    layout?: number;
    pinnedUserId?: string;
  };
  slowModeDelay?: number; // Delay in seconds between messages
  muteNewUsersDuration?: number; // Mute new users for X minutes
  requiredLevelToChat?: number; // Minimum level required for users to send messages
  isQuizEnabled?: boolean;
  isQbotEnabled?: boolean;
  maxMessageLength?: number;
};

export type UserSquare = {
  id: string;
  userId: string;
  squareId: string;
  joinTime: string;
};

export type FriendRequest = {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

export type PrivateMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  participants: string[];
};

export type Notification = {
  id: string;
  userId: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
  type: 'moderation' | 'mention' | 'default' | 'friend_request_accepted' | 'profile_liked' | 'badge_earned' | 'system' | 'profile_rated' | 'summon' | 'gift_received' | 'rank_to_vip' | 'level_up' | 'ruby_received' | 'post_comment' | 'post_liked' | 'post_loved' | 'post_funny' | 'post_disliked' | 'post_added' | 'gold_received' | 'bookmark' | 'announcement_added' | 'call_started' | 'dj_live' | 'reported';
  action?: ModerationAction;
  summonDetails?: {
    roomId: string;
    roomName: string;
    summonerName: string;
  };
  context?: {
    postId?: string;
    postContent?: string;
    announcementId?: string;
    squareId?: string;
  };
};

export type RoleIcon = {
    icon?: any;
    imageUrl?: string;
    color?: string;
    label: string;
};

export type ModerationAction = {
    id: string;
    moderatorId: string;
    userId: string;
    actionType: 'warn' | 'kick' | 'mute' | 'ban' | 'gag' | 'ungag' | 'set_temp_nick' | 'remove_temp_nick' | 'go_anonymous' | 'remove_anonymous' | 'summon' | 'room_ban';
    reason: string;
    duration?: number;
    createdAt: string;
};
    
export type UserRating = {
  id: string;
  raterId: string;
  ratedUserId: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type PlaylistItem = {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  addedBy: string; // User ID
  addedAt: string; // ISO String
};

export type SongRequest = {
  id: string;
  squareId: string;
  requesterId: string;
  requesterName: string;
  songName: string;
  timestamp: string;
  status: 'pending' | 'played' | 'skipped';
};

export type Announcement = {
  id: string;
  message: string;
  createdAt: string;
  createdBy: string;
  category?: 'important' | 'normal';
};

export type ThemeSettings = {
  name: string;
  isDark: boolean;
  variables: { [key: string]: string };
  defaultBackgroundUrl?: string;
  defaultDecorationUrl?: string;
  defaultDecorationPosition?: string;
  isMaintenanceMode?: boolean;
  defaultRole?: string;
  welcomeMessage?: string;
  initialGold?: number;
  initialRubies?: number;
  muteNewUsersDuration?: number;
  disableRegistration?: boolean;
  guestAccessEnabled?: boolean;
  logRetentionDays?: number;
  chatImageEnabled?: boolean;
  chatVideoEnabled?: boolean;
  chatAudioEnabled?: boolean;
  chatFileEnabled?: boolean;
  gamesEnabled?: boolean;
  forbiddenWords?: string;
  // Security
  linkHandling?: 'new_tab' | 'same_tab' | 'warning';
  domainWhitelist?: string;
  antiSpamBotEnabled?: boolean;
  // Content & Moderation
  chatSpeedLimit?: number;
  maxMessageLength?: number;
  profanityFilterEnabled?: boolean;
  nameChangeCooldown?: number; // hours
  // Chat Features
  youtubeEmbedsEnabled?: boolean;
  drawingCanvasEnabled?: boolean;
  richTextFormattingEnabled?: boolean;
};

export type ProfileNote = {
  id: string;
  authorId: string;
  authorName: string;
  note: string;
  createdAt: string;
};

export type Post = {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  likes?: string[];
  loves?: string[];
  funnies?: string[];
  dislikes?: string[];
  likeCount?: number;
  loveCount?: number;
  funnyCount?: number;
  dislikeCount?: number;
  commentCount: number;
  createdAt: string;
  isPinned?: boolean;
};


export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
};

// Types for the store
export type StoreCategory = 'Bots' | 'Themes' | 'Add-ons' | 'Games' | 'Currency' | 'regular' | 'vip' | 'premium';

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

export type UsernameHistory = {
  userId: string;
  username: string;
  changedAt: string;
}

export type RateLimit = {
  count: number;
  windowStart: string;
}

export type AuditLog = {
  staffId: string;
  staffName: string;
  targetUserId: string;
  action: string;
  reason: string;
  ipUsed: string;
  createdAt: string;
}
