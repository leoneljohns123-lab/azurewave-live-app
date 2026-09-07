'use client';

import React from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import type { Message, User, Square, EarnedBadge, ModerationAction, ThemeSettings } from '@/lib/types';
import { cn, getYoutubeVideoId } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faQuoteLeft, faTimes, faTrash, faBullhorn, faStar, faCog, faMusic, faQuestion, faTrophy, faPuzzlePiece, faGift, faPhone, faPhoneSlash, faUsers, faSmile, faPaperclip, faMicrophone, faStop, faFileAlt, faPlay } from '@fortawesome/free-solid-svg-icons';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { UserListSheet, UserListContent } from '@/components/user-list';
import { UserProfilePopover } from '@/components/user-profile-popover';
import {
  useFirestore,
  useUser,
  useDoc,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc, collection, query, orderBy, getDocs, writeBatch, deleteField, arrayUnion, arrayRemove, getDoc, setDoc, limit, where, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getNewBadges } from '@/lib/badge-helpers';
import { ChatPrisonView } from '@/components/chat-prison-view';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getEffectiveDisplayName, isUserGagged, scrambleText, getEffectiveUserRole } from '@/lib/user-helpers';
import { DjPanelDialog } from '@/components/dj-panel-dialog';
import { askSuperbot } from '@/ai/flows/superbot-flow';
import { askGemma } from '@/ai/flows/gemma-rizz-flow';
import { askQuizbot } from '@/ai/flows/quizbot-flow';
import { getQuizQuestions, type QuizQuestion } from '@/ai/flows/get-quiz-questions-flow';
import { askQbotQuizQuestion, type QbotQuizQuestion } from '@/ai/flows/qbot-flow';
import { useChat } from '@/context/chat-context';
import { giftDefinitions } from '@/lib/gift-definitions';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { roleIcons } from '@/lib/data';
import { badgeDefinitions } from '@/lib/badge-definitions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { PaintDialog } from '@/components/paint-dialog';
import { MediaViewerDialog } from '@/components/media-viewer-dialog';
import { YouTubeSearchDialog } from '@/components/youtube-search-dialog';
import { GiphySearchDialog } from '@/components/giphy-search-dialog';
import { FloatingDjControls } from '@/components/FloatingDjControls';
import { FloatingCallButton } from '@/components/FloatingCallButton';

const badWordsDefault = ['examplebadword', 'anotherone']; // A simple list of forbidden words

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function UserChatMessage({ message, onQuote, allUsers, currentUserProfile, onUsernameClick, square, onDeleteMessage, onSpotlightMessage, squareId, isQuizSquare, isQbotActive, onMediaClick }: { message: Message, onQuote: (message: Message, user: User) => void, allUsers: User[] | null, currentUserProfile: User | null, onUsernameClick: (username: string) => void, square: Square | null, onDeleteMessage: (messageId: string) => void, onSpotlightMessage: (messageId: string) => void, squareId: string, isQuizSquare?: boolean, isQbotActive?: boolean, onMediaClick: (type: 'image' | 'video', src: string) => void }) {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const { hasPermission } = useChat();

  const userProfileRef = useMemoFirebase(
    () => (message.senderId ? doc(firestore, 'users', message.senderId) : null),
    [firestore, message.senderId]
  );
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userProfileRef);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const isCurrentUser = user?.id === currentUserProfile?.id;
  const effectiveDisplayName = getEffectiveDisplayName(user);
  const isGagged = user ? isUserGagged(user) : false;

  const alignRight = !isQuizSquare && isCurrentUser;

  const getFontWeight = (fontStyle?: string) => {
    if (!fontStyle) return 400;
    if (fontStyle.includes('Heavy')) return 900;
    if (fontStyle.includes('Bold')) return 700;
    return 400;
  }

  const getFontStyle = (fontStyle?: string) => {
    if (!fontStyle) return 'normal';
    return fontStyle.includes('Italic') ? 'italic' : 'normal';
  }

  const getChatTextStyle = () => {
    if (!user) return {};
    const style: React.CSSProperties = {
      fontFamily: user.chatTextFont ? `'${user.chatTextFont}', sans-serif` : undefined,
      fontWeight: getFontWeight(user.chatTextStyle),
      fontStyle: getFontStyle(user.chatTextStyle),
    };

    const chatStyle = user.chatTextStyle || 'color';
    const color = user.chatTextColor || (alignRight ? '#FFFFFF' : 'hsl(var(--foreground))');

    if (chatStyle === 'color') {
      style.color = color;
    } else if (chatStyle === 'neon') {
      style.color = '#fff';
      style.textShadow = `0 0 4px #fff, 0 0 8px ${color}, 0 0 12px ${color}`;
    } else if (chatStyle === 'gradient') {
      style.background = `linear-gradient(to right, ${color}, #FFC107)`;
      style.WebkitBackgroundClip = 'text';
      style.backgroundClip = 'text';
      style.color = 'transparent';
    }
    return style;
  }

  const highlightMentions = (content: string, useRightAlignStyles: boolean): React.ReactNode[] => {
    if (!allUsers || !currentUserProfile || !content) return [content];

    // Create a regex that finds @ followed by any known user's display name
    const userNamesRegex = allUsers
      .map(u => getEffectiveDisplayName(u))
      .filter(name => name.trim().length > 0) // Filter out empty names
      .sort((a, b) => b.length - a.length) // Sort by length to match longer names first
      .map(name => escapeRegExp(name))
      .join('|');

    if (!userNamesRegex) return [content]; // No users to mention

    const mentionRegex = new RegExp(`@(${userNamesRegex})\\b`, 'g');

    const parts = content.split(mentionRegex);
    const result: React.ReactNode[] = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // It's a non-mention part
        result.push(parts[i]);
      } else {
        // It's a mentioned username
        const username = parts[i];
        const isMentioningCurrentUser = getEffectiveDisplayName(currentUserProfile) === username;

        if (isMentioningCurrentUser) {
          result.push(
            <strong key={`mention-${i}`} className="bg-gradient-to-r from-yellow-300 to-amber-400 text-black rounded-lg px-2 py-0.5 mx-0.5 font-bold shadow">
              {username}
            </strong>
          );
        } else {
          result.push(
            <strong key={`mention-${i}`} className={cn("font-bold rounded-lg px-2 py-0.5 mx-0.5",
              useRightAlignStyles
                ? "bg-gradient-to-r from-white/20 to-white/30 text-white"
                : "bg-gradient-to-r from-primary/10 to-primary/20 text-primary dark:text-primary-foreground/90"
            )}>
              {username}
            </strong>
          );
        }
      }
    }
    return result;
  };


  if (isUserLoading || !user || !currentUser) {
    return null;
  }

  const canDelete = isCurrentUser || hasPermission(currentUserProfile, 'deleteAnySquare') || (square && currentUserProfile && square.creatorId === currentUserProfile.id);
  const isSpotlighted = message.isSpotlighted;
  const canSpotlight = hasPermission(currentUserProfile, 'deleteAnySquare');

  const effectiveCurrentUserRole = currentUserProfile ? getEffectiveUserRole(currentUserProfile, squareId) : null;
  const canSeeForceSpeakIcon = effectiveCurrentUserRole === 'Owner' || effectiveCurrentUserRole === 'Room Owner';

  const effectiveRole = getEffectiveUserRole(user, squareId);
  const roleInfo = roleIcons[effectiveRole];
  const displayBadgeDef = user.displayBadgeId ? badgeDefinitions.find(b => b.id === user.displayBadgeId) : null;

  const nameStyle: React.CSSProperties = {};
  if (user.nameFont) {
    nameStyle.fontFamily = `'${user.nameFont}', sans-serif`;
  }
  if (user.nameStyle === 'color' && user.nameColor) {
    nameStyle.color = user.nameColor;
  } else if (user.nameStyle === 'neon' && user.nameColor) {
    nameStyle.color = '#fff';
    nameStyle.textShadow = `0 0 4px #fff, 0 0 8px ${user.nameColor}, 0 0 12px ${user.nameColor}`;
  } else if (user.nameStyle === 'gradient' && user.nameColor) {
    nameStyle.background = `linear-gradient(to right, ${user.nameColor}, #FFC107)`;
    nameStyle.WebkitBackgroundClip = 'text';
    nameStyle.backgroundClip = 'text';
    nameStyle.color = 'transparent';
  }

  const bubbleShape = user?.chatBubbleShape || 'default';
  const bubbleFill = user?.chatBubbleFill;

  // Base classes for all bubbles
  const baseClasses = 'flex flex-col px-4 py-2 max-w-xs md:max-w-md shadow-md';

  // Shape classes
  const shapeClasses = bubbleShape.startsWith('bubble-')
    ? bubbleShape
    : cn(
      'backdrop-blur-sm border border-white/10 rounded-2xl',
      alignRight && !isQbotActive && 'rounded-br-none',
      !alignRight && !isQbotActive && 'rounded-bl-none'
    );

  // Fill classes
  const fillClasses = bubbleFill
    ? bubbleFill
    : (isQbotActive
      ? 'bg-[hsl(var(--card)/0.7)] text-card-foreground'
      : (alignRight
        ? 'bg-[hsl(var(--primary)/0.7)] text-primary-foreground'
        : 'bg-[hsl(var(--card)/0.7)] text-card-foreground'));

  return (
    <div className={cn("group flex items-start gap-3 animate-message-in", alignRight && "flex-row-reverse")}>
      <UserProfilePopover user={user} roomId={squareId}>
        <div className="cursor-pointer">
          <UserAvatar user={user} className="w-10 w-10" />
        </div>
      </UserProfilePopover>
      <div className={cn("flex-1 flex flex-col", alignRight ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2 mb-1">
          {roleInfo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  {roleInfo.imageUrl ? (
                    <Image src={roleInfo.imageUrl} alt={roleInfo.label} width={16} height={16} className="w-4 h-4 object-contain" />
                  ) : (
                    <FontAwesomeIcon icon={roleInfo.icon} className={cn('w-4 h-4', roleInfo.color)} />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{roleInfo.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {displayBadgeDef && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <FontAwesomeIcon icon={displayBadgeDef.icon} className="h-4 w-4 text-yellow-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold">{displayBadgeDef.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <p className={cn("font-bold text-sm", !isCurrentUser && "cursor-pointer hover:underline text-primary")} style={nameStyle} onClick={() => !isCurrentUser && onUsernameClick(effectiveDisplayName)}>{effectiveDisplayName}</p>
          {message.forcedBy && canSeeForceSpeakIcon && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <FontAwesomeIcon icon={faBullhorn} className="h-3 w-3 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sent by {message.forcedBy.displayName} on behalf of {effectiveDisplayName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div
          className={cn(
            baseClasses,
            isSpotlighted && "shadow-[0_0_15px_3px] shadow-yellow-400 border-yellow-400",
            shapeClasses,
            fillClasses
          )}
        >
          {message.quote && (
            <div className={cn("p-2 mb-1 rounded-md text-sm border-l-4",
              alignRight && !isQbotActive
                ? "bg-black/20 border-white/50"
                : "bg-black/10 backdrop-blur-sm border-slate-300 dark:border-slate-600"
            )}>
              <p className={cn("font-bold", alignRight && !isQbotActive ? "text-white/90" : "text-primary")}>{message.quote.senderName}</p>
              <p className={cn("truncate", alignRight && !isQbotActive ? "text-primary-foreground/70" : "text-muted-foreground")}>{message.quote.content}</p>
            </div>
          )}

          {message.youtubeVideoId ? (
            <>
              {message.content && <p className="text-sm whitespace-pre-wrap break-words mb-2">{isGagged ? scrambleText(message.content) : highlightMentions(message.content, alignRight)}</p>}
              <div className="aspect-video w-full">
                <iframe
                  className="w-full h-full rounded-b-lg"
                  src={`https://www.youtube.com/embed/${message.youtubeVideoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </>
          ) : message.imageUrl ? (
            <div className="mt-2 relative w-full max-w-xs cursor-pointer group bg-black/20 rounded-lg overflow-hidden aspect-video" onClick={() => onMediaClick('image', message.imageUrl!)}>
              <Image src={message.imageUrl} alt="User drawing" layout="fill" className="object-cover" unoptimized={message.imageUrl?.includes('giphy.com')} />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                <p className="text-white font-bold text-lg drop-shadow-md">View Full Size</p>
              </div>
            </div>
          ) : message.videoUrl ? (
            <div className="mt-2 relative w-full max-w-xs cursor-pointer group bg-black rounded-lg aspect-video" onClick={() => onMediaClick('video', message.videoUrl!)}>
              <video src={message.videoUrl} className="w-full h-full rounded-md object-contain" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
                <FontAwesomeIcon icon={faPlay} className="h-12 w-12 text-white/80 drop-shadow-lg" />
              </div>
            </div>
          ) : message.audioUrl ? (
            <a href={message.audioUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block w-16 h-16 relative" onClick={(e) => { e.preventDefault(); playSound(message.audioUrl!); }}>
              <Image src="/interface_icons/voice.svg" alt="Audio attachment" layout="fill" />
            </a>
          ) : message.documentUrl ? (
            <a href={message.documentUrl} download={message.documentName} className="mt-2 block w-16 h-16 relative">
              <Image src="/interface_icons/file.svg" alt="Document attachment" layout="fill" />
            </a>
          ) : message.content && (
            <p className="text-sm whitespace-pre-wrap break-words" style={getChatTextStyle()}>{isGagged ? scrambleText(message.content) : highlightMentions(message.content, alignRight)}</p>
          )}

          {isClient && (
            <time
              className={cn(
                'text-xs opacity-70 mt-1 self-end',
                alignRight && !isQbotActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground'
              )}
              title={format(new Date(message.timestamp), 'PPP p')}
            >
              {formatDistanceToNow(new Date(message.timestamp), {
                addSuffix: true,
              })}
            </time>
          )}
        </div>
      </div>
      <div className={cn("self-end flex items-center mb-2")}>
        {canSpotlight && !isSpotlighted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-yellow-500"
            onClick={() => onSpotlightMessage(message.id)}
            aria-label="Spotlight message"
          >
            <FontAwesomeIcon icon={faStar} />
          </Button>
        )}
        {!isCurrentUser && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onQuote(message, user)}
            aria-label="Quote message"
          >
            <FontAwesomeIcon icon={faQuoteLeft} />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
            onClick={() => onDeleteMessage(message.id)}
            aria-label="Delete message"
          >
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        )}
      </div>
    </div>
  );
}

function ChatMessage({ message, onQuote, allUsers, currentUserProfile, onUsernameClick, square, onDeleteMessage, onSpotlightMessage, squareId, isQuizSquare, isQbotActive, onMediaClick }: { message: Message, onQuote: (message: Message, user: User) => void, allUsers: User[] | null, currentUserProfile: User | null, onUsernameClick: (username: string) => void, square: Square | null, onDeleteMessage: (messageId: string) => void, onSpotlightMessage: (messageId: string) => void, squareId: string, isQuizSquare?: boolean, isQbotActive?: boolean, onMediaClick: (type: 'image' | 'video', src: string) => void }) {
  const { hasPermission } = useChat();

  if (message.messageType === 'join_log' || message.messageType === 'clear_log' || message.messageType === 'moderation_log') {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm my-2 animate-message-in">
        <Image src="/images/default_system.png" alt="system" width={16} height={16} className="rounded-full" />
        <span className="italic">{message.content}</span>
      </div>
    );
  }

  if (message.messageType === 'confession') {
    const anonymousUser: User = {
      id: 'anonymous',
      displayName: 'Anonymous',
      username: 'Anonymous',
      avatarUrl: '', // Will use fallback
      email: null,
      role: 'Guest',
      gender: 'private'
    };

    return (
      <div className={cn("group flex items-start gap-3 animate-message-in")}>
        <div className="cursor-pointer">
          <UserAvatar user={anonymousUser} className="w-10 w-10" />
        </div>
        <div className={cn("flex-1 flex flex-col items-start")}>
          <p className={cn("font-bold text-sm mb-1 text-muted-foreground")}>{anonymousUser.displayName}</p>
          <div
            className={cn(
              'flex flex-col px-4 py-2 max-w-xs md:max-w-md shadow-md',
              'rounded-2xl rounded-bl-none',
              'bg-slate-700 text-slate-200'
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            <time
              className={cn(
                'text-xs opacity-70 mt-1 self-end',
                'text-muted-foreground'
              )}
              title={format(new Date(message.timestamp), 'PPP p')}
            >
              {formatDistanceToNow(new Date(message.timestamp), {
                addSuffix: true,
              })}
            </time>
          </div>
        </div>
        {(currentUserProfile?.id === message.originalSenderId || hasPermission(currentUserProfile, 'deleteAnySquare')) && (
          <div className="self-end flex items-center mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
              onClick={() => onDeleteMessage(message.id)}
              aria-label="Delete message"
            >
              <FontAwesomeIcon icon={faTrash} />
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (message.messageType === 'gift_log' && message.gift) {
    const giftIconSrc = message.gift.giftIcon;
    const isSvg = giftIconSrc && (giftIconSrc.startsWith('/') || giftIconSrc.startsWith('http'));

    return (
      <div className="text-center text-muted-foreground text-sm my-4 animate-message-in flex justify-center items-center gap-2 italic">
        <FontAwesomeIcon icon={faGift} className="text-pink-400" />
        <span className="font-bold not-italic">{message.gift.senderName}</span>
        <span>sent a</span>
        {isSvg && <Image src={giftIconSrc} alt={message.gift.giftName} width={20} height={20} className="h-5 w-5 mx-1" />}
        <span className="font-bold not-italic">{message.gift.giftName}</span>
        <span>to</span>
        <span className="font-bold not-italic">{message.gift.receiverName}!</span>
      </div>
    );
  }

  const isQuizMessage = message.messageType && ['quiz_question', 'quiz_winner', 'quiz_hint', 'quiz_answer'].includes(message.messageType);
  const isQbotMessage = message.senderId === 'qbot';

  if (isQbotMessage) {
    const qbotUser = allUsers?.find(u => u.id === 'qbot');
    if (!qbotUser) {
      return null;
    }

    let qbotContent;

    if (message.messageType === 'qbot_question' && message.qbotQuiz) {
      const { question, category, wordCount } = message.qbotQuiz;
      qbotContent = (
        <div className="quiz_text quiz_question">
          <span className="flex items-center flex-wrap">
            <span className="bg-black/20 rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0">
              <FontAwesomeIcon icon={faQuestion} className="h-3 w-3 text-white" />
            </span>
            <span className="text-black mr-1">category:</span>
            <span className="text-white mr-1">{category}: {question}</span>
            <span className="text-black">{`: ${wordCount} word(s)`}</span>
          </span>
        </div>
      );
    } else if (message.messageType === 'qbot_winner' && message.qbotQuiz?.winnerInfo) {
      const { displayName, answer, pointsWon, totalPoints } = message.qbotQuiz.winnerInfo;
      qbotContent = (
        <div className="quiz_text quiz_good flex items-center justify-center flex-wrap p-1">
          <span className="text-black mr-1 flex items-center">
            <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 mr-2" />
            Congratulations
          </span>
          <strong className="text-white mr-1">{displayName}</strong>
          <span className="text-black mr-1">found the answer:</span>
          <strong className="text-white mr-1">{answer}</strong>
          <span className="text-black mr-1">and won</span>
          <strong className="text-white mr-1">{pointsWon}</strong>
          <span className="text-black mr-1">points, for a total of</span>
          <strong className="text-white mr-1">{totalPoints}</strong>
          <span className="text-black">points.</span>
        </div>
      );
    } else if (message.messageType === 'qbot_hint' && message.qbotQuiz?.hint) {
      qbotContent = (
        <div className="quiz_text quiz_hint">
          <span className="flex items-center">
            <div className="bg-black/20 rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0">
              <FontAwesomeIcon icon={faStar} className="h-3 w-3 text-white" />
            </div>
            <span className="text-black">hint : </span>
            <span className="text-white">{message.qbotQuiz.hint}</span>
          </span>
        </div>
      );
    } else if (message.messageType === 'qbot_answer' && message.qbotQuiz?.correctAnswer) {
      qbotContent = (
        <div className="quiz_text quiz_bad">
          Sorry nobody found the answer : <span className="text-white">{message.qbotQuiz.correctAnswer}</span> ... good luck for next question.
        </div>
      );
    } else {
      return <UserChatMessage {...{ message, onQuote, allUsers, currentUserProfile, onUsernameClick, square, onDeleteMessage, onSpotlightMessage, squareId, isQuizSquare, isQbotActive, onMediaClick }} />;
    }

    return (
      <div className="group flex items-start gap-3 animate-message-in">
        <UserProfilePopover user={qbotUser} roomId={squareId}>
          <div className="cursor-pointer">
            <UserAvatar user={qbotUser} className="w-10 w-10" />
          </div>
        </UserProfilePopover>
        <div className="flex flex-col items-start">
          <p className="font-bold text-sm mb-1 text-primary">{getEffectiveDisplayName(qbotUser)}</p>
          {qbotContent}
        </div>
      </div>
    );
  }

  if (isQuizMessage) {
    const quizBotUser = allUsers?.find(u => u.id === 'quizbot');

    if (!quizBotUser) {
      return null;
    }

    let quizContent;

    if (message.messageType === 'quiz_question' && message.quiz) {
      const { question, wordCount, quizType } = message.quiz;

      if (quizType === 'scramble') {
        quizContent = (
          <div className="quiz_text quiz_question">
            <span className="flex items-center">
              <span className="bg-black/20 rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0">
                <FontAwesomeIcon icon={faPuzzlePiece} className="h-3 w-3 text-white" />
              </span>
              <span>
                <span className="text-black">Scramble : </span>
                <span className="text-white font-bold">{question}</span>
              </span>
            </span>
          </div>
        );
      } else {
        quizContent = (
          <div className="quiz_text quiz_question">
            <span className="flex items-center flex-wrap">
              <span className="bg-black/20 rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0">
                <FontAwesomeIcon icon={faQuestion} className="h-3 w-3 text-white" />
              </span>
              <span className="text-white">{question}</span>
              <span className="text-black font-bold">{`: ${wordCount} word(s)`}</span>
            </span>
          </div>
        );
      }
    } else if (message.messageType === 'quiz_winner' && message.quiz?.winnerInfo) {
      const { displayName, answer, pointsWon, totalPoints } = message.quiz.winnerInfo;
      quizContent = (
        <div className="quiz_text quiz_good flex items-center justify-center flex-wrap p-1">
          <span className="text-black mr-1 flex items-center">
            <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 mr-2" />
            Congratulation
          </span>
          <strong className="text-white mr-1">{displayName}</strong>
          <span className="text-black mr-1">found the answer:</span>
          <strong className="text-white mr-1">{answer}</strong>
          <span className="text-black mr-1">and win</span>
          <strong className="text-white mr-1">{pointsWon}</strong>
          <span className="text-black mr-1">points, for a total of</span>
          <strong className="text-white mr-1">{totalPoints}</strong>
          <span className="text-black">points.</span>
        </div>
      );
    } else if (message.messageType === 'quiz_hint' && message.content) {
      quizContent = (
        <div className="quiz_text quiz_hint">
          <span className="flex items-center">
            <div className="bg-black/20 rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0">
              <FontAwesomeIcon icon={faStar} className="h-3 w-3 text-white" />
            </div>
            <span className="text-black">hint : </span>
            <span className="text-white">{message.quiz?.hint}</span>
          </span>
        </div>
      );
    } else if (message.messageType === 'quiz_answer' && message.quiz?.correctAnswer) {
      quizContent = (
        <div className="quiz_text quiz_bad">
          Sorry nobody found the answer : <span className="text-white">{message.quiz.correctAnswer}</span> ... good luck for next question.
        </div>
      );
    } else {
      // Fallback for regular bot messages that aren't part of the quiz flow
      return <UserChatMessage {...{ message, onQuote, allUsers, currentUserProfile, onUsernameClick, square, onDeleteMessage, onSpotlightMessage, squareId, isQuizSquare, isQbotActive, onMediaClick }} />;
    }

    return (
      <div className="group flex items-start gap-3 animate-message-in">
        <UserProfilePopover user={quizBotUser} roomId={squareId}>
          <div className="cursor-pointer">
            <UserAvatar user={quizBotUser} className="w-10 w-10" />
          </div>
        </UserProfilePopover>
        <div className="flex flex-col items-start">
          <p className="font-bold text-sm mb-1 text-primary">{getEffectiveDisplayName(quizBotUser)}</p>
          {quizContent}
        </div>
      </div>
    );
  }


  return <UserChatMessage {...{ message, onQuote, allUsers, currentUserProfile, onUsernameClick, square, onDeleteMessage, onSpotlightMessage, squareId, isQuizSquare, isQbotActive, onMediaClick }} />;
}

const playSound = (src: string) => {
  const audio = new Audio(src);
  audio.currentTime = 0;
  audio.play().catch(error => {
    console.warn(`Could not play sound ${src}. User interaction may be required.`, error);
  });
};

function SquarePageContent({ soundState: soundStateProp, setSoundState: setSoundStateProp }: { soundState?: any, setSoundState?: any }) {
  const soundState = soundStateProp || {
    chatSounds: true,
    privateSounds: true,
    notificationSounds: true,
    usernameSounds: true,
  };
  const params = useParams();
  const router = useRouter();
  const squareId = params.id as string;
  const { profile: userProfile, isLoading: isUserProfileLoading, realAuthUser } = useEffectiveUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = useChat();
  const { showNotification } = useNotifications();

  const [isUserListOpen, setIsUserListOpen] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [muteMessage, setMuteMessage] = useState<string | null>(null);
  const [isGloballyBanned, setIsGloballyBanned] = useState(false);
  const [globalBanReason, setGlobalBanReason] = useState<string | undefined>();
  const [isSquareBanned, setIsSquareBanned] = useState(false);
  const [squareBanReason, setSquareBanReason] = useState<string | undefined>(undefined);
  const [isKicked, setIsKicked] = useState(false);
  const [kickTimeLeft, setKickTimeLeft] = useState(0);
  const [kickReason, setKickReason] = useState<string | undefined>(undefined);
  const [isDjPanelOpen, setIsDjPanelOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isPaintDialogOpen, setIsPaintDialogOpen] = useState(false);
  const [imageToSend, setImageToSend] = useState<string | null>(null);
  const [mediaViewerState, setMediaViewerState] = useState<{ type: 'image' | 'video', src: string } | null>(null);
  const [isYouTubeSearchOpen, setIsYouTubeSearchOpen] = useState(false);
  const [isGiphySearchOpen, setIsGiphySearchOpen] = useState(false);


  const [isRecording, setIsRecording] = useState(false);
  const [audioToSend, setAudioToSend] = useState<string | null>(null);
  const [videoToSend, setVideoToSend] = useState<string | null>(null);
  const [documentToSend, setDocumentToSend] = useState<{ url: string | null, name: string | null }>({ url: null, name: null });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);


  const [quizSession, setQuizSession] = useState<{
    questions: QuizQuestion[];
    currentIndex: number;
    isActive: boolean;
  }>({ questions: [], currentIndex: 0, isActive: false });
  const quizTimeoutsRef = useRef<{ hint: NodeJS.Timeout | null, answer: NodeJS.Timeout | null }>({ hint: null, answer: null });
  const quizSessionRef = useRef(quizSession);
  quizSessionRef.current = quizSession;
  const violationTrackerRef = useRef<{ [userId: string]: { lastMessageTime: number, violationCount: number, lastXpTimestamp?: number } }>({});

  const icebreakers = [
    "If you could have any superpower, what would it be and why?",
    "What's the most interesting place you've ever visited?",
    "If you could have dinner with any three people, dead or alive, who would they be?",
    "What's a skill you'd love to learn?",
    "What's your favorite thing about your hometown?",
    "If you were an animal, what would you be?",
    "What's the best piece of advice you've ever received?",
    "What's a small thing that makes you happy?"
  ];

  const wouldYouRatherQuestions = [
    "Would you rather have the ability to fly or to be invisible?",
    "Would you rather live in a world without music or a world without movies?",
    "Would you rather travel to the past or to the future?",
    "Would you rather have more time or more money?",
    "Would you rather be able to talk to animals or speak all human languages?",
    "Would you rather live in a house in the mountains or on the beach?",
    "Would you rather give up your favorite food or your favorite TV show forever?",
    "Would you rather be an amazing singer or an amazing dancer?"
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      if (file.type.startsWith('image/')) {
        setImageToSend(dataUrl);
        setVideoToSend(null);
        setAudioToSend(null);
        setDocumentToSend({ url: null, name: null });
      } else if (file.type.startsWith('video/')) {
        setImageToSend(null);
        setVideoToSend(dataUrl);
        setAudioToSend(null);
        setDocumentToSend({ url: null, name: null });
      } else if (file.type.startsWith('audio/')) {
        setImageToSend(null);
        setVideoToSend(null);
        setAudioToSend(dataUrl);
        setDocumentToSend({ url: null, name: null });
      } else {
        setImageToSend(null);
        setVideoToSend(null);
        setAudioToSend(null);
        setDocumentToSend({ url: dataUrl, name: file.name });
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVoiceMessage = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            setAudioToSend(base64Audio);
            setImageToSend(null);
            setVideoToSend(null);
          };
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          toast({ title: 'Recording stopped.' });
        };

        mediaRecorder.start();
        setIsRecording(true);
        toast({ title: 'Recording started...' });

      } catch (error) {
        console.error("Error accessing microphone:", error);
        toast({ variant: 'destructive', title: 'Microphone Error' });
      }
    }
  };




  const clearQuizTimeouts = useCallback(() => {
    if (quizTimeoutsRef.current.hint) clearTimeout(quizTimeoutsRef.current.hint);
    if (quizTimeoutsRef.current.answer) clearTimeout(quizTimeoutsRef.current.answer);
    quizTimeoutsRef.current = { hint: null, answer: null };
  }, []);

  const goToNextQuestion = useCallback(() => {
    const session = quizSessionRef.current;
    if (!session.isActive) return;

    const nextIndex = session.currentIndex + 1;

    // Use a timeout for a small delay between questions
    setTimeout(() => {
      if (nextIndex < session.questions.length) {
        setQuizSession(prev => ({ ...prev, currentIndex: nextIndex }));
      } else {
        // End of round
        const messagesCollection = collection(firestore, 'squares', squareId, 'messages');
        addDocumentNonBlocking(messagesCollection, {
          squareId: squareId,
          senderId: 'quizbot',
          content: "🏁 End of round! Re-shuffling for a new round...",
          timestamp: new Date().toISOString(),
          messageType: 'user',
        });

        getQuizQuestions().then(newQuestions => {
          if (newQuestions && newQuestions.length > 0) {
            setQuizSession({ questions: newQuestions, currentIndex: 0, isActive: true });
          } else {
            setQuizSession({ questions: [], currentIndex: 0, isActive: false });
          }
        }).catch(error => {
          console.error("Error fetching new quiz questions:", error);
          setQuizSession({ questions: [], currentIndex: 0, isActive: false });
        });
      }
    }, 2000);

  }, [firestore, squareId]);

  const postQuizQuestion = useCallback((questionData: QuizQuestion) => {
    if (!squareId || !firestore) return;

    clearQuizTimeouts();

    const messagesCollection = collection(firestore, 'squares', squareId, 'messages');
    const questionTimestamp = new Date().toISOString();

    const questionMessageData: Omit<Message, 'id'> = {
      squareId: squareId,
      senderId: 'quizbot',
      content: 'A new quiz question has arrived!',
      timestamp: questionTimestamp,
      messageType: 'quiz_question',
      quiz: { ...questionData, quizId: questionTimestamp },
    };
    addDocumentNonBlocking(messagesCollection, questionMessageData);

    // Hint timeout
    const hintTimeoutId = setTimeout(() => {
      const checkWinnerAndPostHint = async () => {
        const q = query(collection(firestore, 'squares', squareId, 'messages'), where('quiz.quizId', '==', questionTimestamp), where('messageType', '==', 'quiz_winner'));
        const winnerSnapshot = await getDocs(q);
        if (winnerSnapshot.empty) {
          const hintMessageData: Omit<Message, 'id'> = {
            squareId: squareId,
            senderId: 'quizbot',
            content: 'Here is a hint!',
            timestamp: new Date().toISOString(),
            messageType: 'quiz_hint',
            quiz: { hint: questionData.hint, quizId: questionTimestamp }
          };
          addDocumentNonBlocking(messagesCollection, hintMessageData);
        }
      };
      checkWinnerAndPostHint();
    }, 30000);

    // Answer timeout
    const answerTimeoutId = setTimeout(() => {
      const checkWinnerAndPostAnswer = async () => {
        const q = query(collection(firestore, 'squares', squareId, 'messages'), where('quiz.quizId', '==', questionTimestamp), where('messageType', '==', 'quiz_winner'));
        const winnerSnapshot = await getDocs(q);
        if (winnerSnapshot.empty) {
          const primaryAnswer = questionData.correctAnswer.split('|')[0];
          const answerMessageData: Omit<Message, 'id'> = {
            squareId: squareId,
            senderId: 'quizbot',
            content: `Time's up! The correct answer was: ${primaryAnswer}`,
            timestamp: new Date().toISOString(),
            messageType: 'quiz_answer',
            quiz: { correctAnswer: primaryAnswer, quizId: questionTimestamp }
          };
          await addDocumentNonBlocking(messagesCollection, answerMessageData);
          goToNextQuestion();
        }
      };
      checkWinnerAndPostAnswer();
    }, 60000);

    quizTimeoutsRef.current = { hint: hintTimeoutId, answer: answerTimeoutId };

  }, [squareId, firestore, clearQuizTimeouts, goToNextQuestion]);

  useEffect(() => {
    // This effect is responsible for posting a question whenever the session/index changes.
    if (quizSession.isActive && quizSession.questions.length > quizSession.currentIndex) {
      postQuizQuestion(quizSession.questions[quizSession.currentIndex]);
    }
  }, [quizSession.isActive, quizSession.currentIndex, quizSession.questions, postQuizQuestion]);


  useEffect(() => {
    const checkGlobalSanctions = async () => {
      if (!userProfile) return;

      if (userProfile.role === 'Owner') {
        setIsMuted(false);
        setMuteMessage(null);
        setIsGloballyBanned(false);
        setGlobalBanReason(undefined);
        return;
      }

      if (!userProfile?.mutedUntil) {
        setIsMuted(false);
        setMuteMessage(null);
        setIsGloballyBanned(false);
        setGlobalBanReason(undefined);
        return;
      }

      if (userProfile.mutedUntil.startsWith('9999')) {
        setIsGloballyBanned(true);
        setIsMuted(false);

        const modActionsRef = collection(firestore, 'moderationActions');
        const q = query(
          modActionsRef,
          where('userId', '==', userProfile.id),
          where('actionType', '==', 'ban'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const latestBanAction = querySnapshot.docs[0].data() as ModerationAction;
          setGlobalBanReason(latestBanAction.reason);
        } else {
          setGlobalBanReason('Repeated violations.');
        }
        return;
      }

      setIsGloballyBanned(false);
      const expiresAt = new Date(userProfile.mutedUntil).getTime();

      const intervalId = setInterval(() => {
        const now = Date.now();
        const distance = expiresAt - now;

        if (distance < 0) {
          clearInterval(intervalId);
          setIsMuted(false);
          setMuteMessage(null);
          if (userProfile?.id) {
            const userProfileRef = doc(firestore, 'users', userProfile.id);
            updateDocumentNonBlocking(userProfileRef, { mutedUntil: deleteField() });
          }
        } else {
          setIsMuted(true);
          const minutes = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
          const seconds = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
          setMuteMessage(`You are muted. Time remaining: ${minutes}:${seconds}`);
        }
      }, 1000);

      return () => clearInterval(intervalId);
    };
    checkGlobalSanctions();
  }, [userProfile, firestore]);

  useEffect(() => {
    if (!userProfile || !squareId) {
      setIsSquareBanned(false);
      setSquareBanReason(undefined);
      return;
    }

    if (userProfile.role === 'Owner') {
      setIsSquareBanned(false);
      setSquareBanReason(undefined);
      return;
    }

    const banInfo = userProfile.bannedFromSquares?.[squareId];
    if (banInfo && new Date(banInfo.until).getTime() > Date.now()) {
      setIsSquareBanned(true);
      setSquareBanReason(banInfo.reason || 'No reason provided.');
    } else {
      setIsSquareBanned(false);
      setSquareBanReason(undefined);
    }
  }, [userProfile, squareId]);

  useEffect(() => {
    if (!userProfile?.id || !userProfile.kickedUntil || userProfile.role === 'Owner') {
      setIsKicked(false);
      return;
    }

    const expiresAt = new Date(userProfile.kickedUntil).getTime();

    if (expiresAt <= Date.now()) {
      setIsKicked(false);
      return;
    }

    setIsKicked(true);

    const fetchKickReason = async () => {
      const modActionsRef = collection(firestore, 'moderationActions');
      const q = query(
        modActionsRef,
        where('userId', '==', userProfile.id),
        where('actionType', '==', 'kick'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const latestKickAction = querySnapshot.docs[0].data() as ModerationAction;
        setKickReason(latestKickAction.reason);
      }
    };
    fetchKickReason();

    const intervalId = setInterval(() => {
      const now = Date.now();
      const distance = expiresAt - now;
      if (distance < 0) {
        clearInterval(intervalId);
        setIsKicked(false);
        setKickTimeLeft(0);
        const userProfileRef = doc(firestore, 'users', userProfile.id);
        updateDocumentNonBlocking(userProfileRef, { kickedUntil: deleteField() });
      } else {
        setKickTimeLeft(Math.floor(distance / 1000));
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [userProfile, firestore]);


  const squareRef = useMemoFirebase(
    () => (squareId ? doc(firestore, 'squares', squareId) : null),
    [firestore, squareId]
  );
  const { data: square, isLoading: isSquareLoading } = useDoc<Square>(squareRef);

  const themeSettingsRef = useMemoFirebase(() => doc(firestore, 'app_settings', 'theme'), [firestore]);
  const { data: themeSettings, isLoading: isThemeSettingsLoading } = useDoc<ThemeSettings>(themeSettingsRef);

  const messagesRef = useMemoFirebase(
    () =>
      squareId
        ? query(
          collection(firestore, 'squares', squareId, 'messages'),
          orderBy('timestamp', 'asc')
        )
        : null,
    [firestore, squareId]
  );

  const [newMessage, setNewMessage] = useState('');
  const [quotedMessage, setQuotedMessage] = useState<{ message: Message; user: User } | null>(null);
  const [isMentioning, setIsMentioning] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastProcessedTimestampRef = useRef('');


  const onMessagesChange = useCallback((messagesData: Message[]) => {
    if (!messagesData || !realAuthUser || !soundState || !userProfile || isUserProfileLoading) {
      return;
    }

    const lastKnownTimestamp = lastProcessedTimestampRef.current;

    // On initial load (when lastKnownTimestamp is falsy), just set the timestamp from the last message and exit.
    if (!lastKnownTimestamp) {
      if (messagesData.length > 0) {
        lastProcessedTimestampRef.current = messagesData[messagesData.length - 1].timestamp;
      }
      return;
    }

    // Filter for messages that are newer than the last one we've processed.
    const newMessages = messagesData.filter(
      (msg) => msg.timestamp > lastKnownTimestamp
    );

    if (newMessages.length > 0) {
      // Process quiz logic and sounds for new messages.
      if (quizSessionRef.current.isActive) {
        const winnerMessage = newMessages.find(m => m.messageType === 'quiz_winner');
        if (winnerMessage) {
          const lastQuestionInChat = [...messagesData].reverse().find(m => m.messageType === 'quiz_question');
          if (lastQuestionInChat && lastQuestionInChat.quiz?.quizId === winnerMessage.quiz?.quizId) {
            clearQuizTimeouts();
            goToNextQuestion();
          }
        }
      }

      newMessages.forEach(message => {
        const isOwnMessage = message.senderId === userProfile.id;
        
        // Log types that SHOULD play sound even for the sender
        const isLogMessage = message.messageType && ['clear_log', 'join_log', 'leave_log'].includes(message.messageType as any);

        const escapedDisplayName = escapeRegExp(getEffectiveDisplayName(userProfile) as string);
        const mentionRegex = new RegExp(`@${escapedDisplayName}\\b`);

        if (!isOwnMessage || isLogMessage) {
            const isMention = message.content && mentionRegex.test(message.content);
            const sender = allUsers?.find(u => u.id === message.senderId);
            const senderName = sender ? getEffectiveDisplayName(sender) : 'Someone';

            if (!isOwnMessage) {
                showNotification(`New message in ${square?.name || 'Square'}`, {
                    body: `${senderName}: ${message.content}`,
                    tag: `chat-${squareId}`,
                });
            } else if (isMention) {
                showNotification(`You were mentioned in ${square?.name || 'Square'}`, {
                    body: `${senderName}: ${message.content}`,
                    tag: `mention-${squareId}`,
                });
            }
        }

        if (isOwnMessage && !isLogMessage) return;

        if (message.messageType === 'clear_log') {
          if (soundState.chatSounds) playSound('/sounds/clear.mp3');
        } else if (message.messageType === 'join_log') {
          if (soundState.chatSounds) playSound('/sounds/join.mp3');
        } else if (message.content && mentionRegex.test(message.content)) {
          if (soundState.usernameSounds) playSound('/sounds/username.mp3');
        } else if (message.quote && message.quote.senderId === userProfile.id) {
          if (soundState.notificationSounds) playSound('/sounds/quote.mp3');
        } else if (soundState.chatSounds && !isOwnMessage) {
          playSound('/sounds/new_messages.mp3');
        }
      });

      const latestTimestampInBatch = newMessages[newMessages.length - 1].timestamp;
      lastProcessedTimestampRef.current = latestTimestampInBatch;
    }
  }, [realAuthUser, soundState, userProfile, isUserProfileLoading, goToNextQuestion, clearQuizTimeouts]);

  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: allUsers, isLoading: areAllUsersLoading } = useCollection<User>(usersCollectionRef);

  const isQuizSquare = useMemo(() => {
    if (!allUsers || !squareId) return false;
    const quizBot = allUsers.find(u => u.id === 'quizbot');
    return quizBot?.assignedRoomId === squareId;
  }, [allUsers, squareId]);

  const {
    data: messages,
    isLoading: areMessagesLoading,
  } = useCollection<Message>(messagesRef, onMessagesChange);

  const startQuizBot = useCallback(async () => {
    // Check if a quiz is already active in the chat messages
    const lastQuestionMessage = messages && [...messages].reverse().find(m => m.messageType === 'quiz_question');
    if (lastQuestionMessage && lastQuestionMessage.quiz?.quizId) {
      const isQuestionAnswered = messages.filter(m =>
        (m.messageType === 'quiz_winner' || m.messageType === 'quiz_answer') &&
        m.quiz?.quizId === lastQuestionMessage.quiz?.quizId
      ).length > 0;
      if (!isQuestionAnswered) {
        // Quiz already in progress
        return;
      }
    }

    toast({ title: 'Starting Quiz!' });

    getQuizQuestions().then(questions => {
      if (questions && questions.length > 0) {
        setQuizSession({ questions, currentIndex: 0, isActive: true });
      } else {
        toast({ variant: 'destructive', title: 'Quiz Error' });
      }
    }).catch(error => {
      console.error("Quiz start error:", error);
      toast({ variant: 'destructive', title: 'Quiz Error' });
    });
  }, [messages, squareId, toast]);

  // Automated Quiz Start on First User Joining
  useEffect(() => {
    if (!isQuizSquare || areMessagesLoading || !firestore || !squareId) return;

    const checkOccupancyAndStart = async () => {
      const userSquaresQuery = query(collection(firestore, 'userSquares'), where('squareId', '==', squareId));
      const snapshot = await getDocs(userSquaresQuery);
      const userCount = snapshot.size;

      if (userCount === 1) {
        // First person in the room (ignoring bots)
        if (!quizSessionRef.current.isActive) {
          startQuizBot();
        }
      }
    };

    checkOccupancyAndStart();
    // We trigger this when messages change (someone joins) or allUsers/isQuizSquare changes
  }, [isQuizSquare, messages?.length, firestore, squareId, areMessagesLoading, startQuizBot]);

  const djUser = useMemo(() => {
    if (!allUsers || !square || !square.djId) return null;
    return allUsers.find(u => u.id === square.djId);
  }, [allUsers, square]);


  useEffect(() => {
    if (scrollAreaViewportRef.current) {
      const viewport = scrollAreaViewportRef.current;
      const timer = setTimeout(() => {
        viewport.scrollTop = viewport.scrollHeight;
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Effect to handle Room Presence (Joining and Leaving)
  useEffect(() => {
    if (!realAuthUser || !squareId || !firestore) return;

    const joinRoom = async () => {
      const userSquaresRef = collection(firestore, 'userSquares');
      const q = query(userSquaresRef, where('userId', '==', realAuthUser.uid));

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(firestore);

      let wasInAnotherRoom = false;
      let alreadyInThisRoom = false;

      querySnapshot.forEach((doc) => {
        if (doc.data().squareId !== squareId) {
          batch.delete(doc.ref);
          wasInAnotherRoom = true;
        } else {
          alreadyInThisRoom = true;
        }
      });

      if (!alreadyInThisRoom) {
        const userSquareDocId = `${realAuthUser.uid}_${squareId}`;
        const newUserSquareRef = doc(firestore, 'userSquares', userSquareDocId);
        batch.set(newUserSquareRef, {
          id: userSquareDocId,
          userId: realAuthUser.uid,
          squareId: squareId,
          joinTime: new Date().toISOString(),
        });
      }

      const squareDocRef = doc(firestore, 'squares', squareId);
      batch.update(squareDocRef, {
        memberIds: arrayUnion(realAuthUser.uid)
      });

      await batch.commit();

      if (!alreadyInThisRoom || wasInAnotherRoom) {
        const userDoc = await getDoc(doc(firestore, 'users', realAuthUser.uid));
        const up = userDoc.data() as User;
        if (up && !up.isGhost) {
          const messagesCollection = collection(firestore, 'squares', squareId, 'messages');
          addDocumentNonBlocking(messagesCollection, {
            squareId: squareId,
            senderId: up.id,
            content: `${getEffectiveDisplayName(up)} has joined the Square`,
            timestamp: new Date().toISOString(),
            messageType: 'join_log',
          });
        }
      }
    };

    joinRoom();

    return () => {
      if (realAuthUser) {
        const userSquareDocId = `${realAuthUser.uid}_${squareId}`;
        const userSquareRef = doc(firestore, 'userSquares', userSquareDocId);
        deleteDocumentNonBlocking(userSquareRef);
      }
    };
  }, [realAuthUser?.uid, squareId, firestore]);

  // Effect to handle Room Occupancy Notifications
  useEffect(() => {
    if (!squareId || !firestore || !square) return;

    const checkAndNotify = async () => {
      const userSquaresQuery = query(collection(firestore, 'userSquares'), where('squareId', '==', squareId));
      const snapshot = await getDocs(userSquaresQuery);
      const userCount = snapshot.size;

      if (userCount === 3 || userCount === 5 || userCount === 10) {
        const allUsersQuery = query(collection(firestore, 'users'), where('pinnedSquares', 'array-contains', squareId));
        const bookmarkedUsersSnapshot = await getDocs(allUsersQuery);

        const batch = writeBatch(firestore);
        bookmarkedUsersSnapshot.forEach(userDoc => {
          const userToNotify = userDoc.data() as User;
          // Don't notify users who are already in the room
          if (!snapshot.docs.some(d => d.data().userId === userToNotify.id)) {
            const notificationRef = doc(collection(firestore, 'users', userToNotify.id, 'notifications'));
            batch.set(notificationRef, {
              userId: userToNotify.id,
              senderId: 'system',
              text: `${userCount} people are active in ${square.name}.`,
              timestamp: new Date().toISOString(),
              read: false,
              type: 'default',
              context: { squareId }
            });
          }
        });
        await batch.commit();
      }
    };
    checkAndNotify();
  }, [squareId, firestore, square?.name]);


  const messagesCollection = useMemoFirebase(
    () => (squareId ? collection(firestore, 'squares', squareId, 'messages') : null),
    [firestore, squareId]
  );

  const handleIcebreaker = (type: 'icebreaker' | 'wyr') => {
    if (!messagesCollection) return;
    setNewMessage('');
    const questions = type === 'wyr' ? wouldYouRatherQuestions : icebreakers;
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    const prefix = type === 'wyr' ? '🤔 **Would you rather...?**' : '🧊 **Icebreaker:**';

    const messageData: Omit<Message, 'id'> = {
      squareId: squareId,
      senderId: 'superbot',
      content: `${prefix}\n${randomQuestion}`,
      timestamp: new Date().toISOString(),
      messageType: 'user',
    };
    addDocumentNonBlocking(messagesCollection, messageData);
  };

  const handleClearChat = async () => {
    if (!firestore || !squareId || !userProfile || !square) return;

    if (userProfile.id !== square.creatorId && !hasPermission(userProfile, 'clearAnyChat')) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
      });
      return;
    }

    const messagesCollection = collection(
      firestore,
      'squares',
      squareId,
      'messages'
    );
    try {
      const messagesSnapshot = await getDocs(messagesCollection);
      if (messagesSnapshot.empty) {
        toast({
          title: 'Chat is already empty',
        });
        return;
      }
      const batch = writeBatch(firestore);
      messagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      addDocumentNonBlocking(messagesCollection, {
        squareId: squareId,
        senderId: userProfile.id,
        content: `${getEffectiveDisplayName(userProfile)} cleared the chat.`,
        timestamp: new Date().toISOString(),
        messageType: 'clear_log',
      });

      toast({
        title: 'Chat Cleared',
      });
    } catch (error) {
      console.error("Error clearing chat: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
      });
    }
  };

  const handleClearLogs = async () => {
    if (!firestore || !squareId || !userProfile || !square) return;

    if (userProfile.id !== square.creatorId && !hasPermission(userProfile, 'clearAnyChat')) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: "You don't have permission to clear logs.",
      });
      return;
    }

    const messagesCollection = collection(
      firestore,
      'squares',
      squareId,
      'messages'
    );
    try {
      const logTypes = ['join_log', 'clear_log', 'moderation_log', 'gift_log'];
      const q = query(messagesCollection, where('messageType', 'in', logTypes));
      const messagesSnapshot = await getDocs(q);

      if (messagesSnapshot.empty) {
        toast({
          title: 'No logs to clear',
        });
        return;
      }

      const batch = writeBatch(firestore);
      messagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      toast({
        title: 'Logs Cleared',
        description: 'All log messages have been removed from the chat.',
      });
    } catch (error) {
      console.error("Error clearing logs: ", error);
      toast({
        variant: 'destructive',
        title: 'Error Clearing Logs',
        description: 'An error occurred while trying to clear the logs.',
      });
    }
  };

  const handleStopQuiz = async () => {
    if (!userProfile || !squareId || !firestore) return;

    const effectiveRole = getEffectiveUserRole(userProfile, squareId);
    if (!['Owner', 'Super Admin', 'Admin', 'Moderator', 'Room Owner'].includes(effectiveRole)) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
      });
      return;
    }

    clearQuizTimeouts();
    setQuizSession(prev => ({ ...prev, isActive: false }));

    const lastQuestion = [...(messages || [])].reverse().find(m => m.messageType === 'quiz_question');
    const isResolved = lastQuestion && messages?.some(m =>
      (m.messageType === 'quiz_winner' || m.messageType === 'quiz_answer') &&
      m.quiz?.quizId === lastQuestion.quiz?.quizId
    );

    const messagesCollection = collection(firestore, 'squares', squareId, 'messages');

    if (lastQuestion && !isResolved && lastQuestion.quiz?.correctAnswer) {
      const primaryAnswer = lastQuestion.quiz.correctAnswer.split('|')[0];
      const answerMessageData: Omit<Message, 'id'> = {
        squareId: squareId,
        senderId: 'quizbot',
        content: `The quiz was stopped by a moderator. The answer was: ${primaryAnswer}`,
        timestamp: new Date().toISOString(),
        messageType: 'quiz_answer',
        quiz: {
          quizId: lastQuestion.quiz?.quizId,
          correctAnswer: primaryAnswer,
        }
      };
      addDocumentNonBlocking(messagesCollection, answerMessageData);
      toast({ title: 'Quiz Stopped' });
    } else {
      toast({ title: 'No Active Quiz' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imageToSend && !videoToSend && !audioToSend && !documentToSend.url) || !userProfile || !squareId || isMuted || isSquareBanned || isKicked || isGloballyBanned) return;

    let messageTrimmed = newMessage.trim();
    let messageTrimmedLower = messageTrimmed.toLowerCase();

    const superbotUser = allUsers?.find(u => u.id === 'superbot');
    const superbotDisplayName = superbotUser ? getEffectiveDisplayName(superbotUser) : 'Superbot';
    const mentionRegex = new RegExp(`@${escapeRegExp(superbotDisplayName)}\\b`, 'i');

    const gemmaUser = allUsers?.find(u => u.id === 'gemma');
    const gemmaDisplayName = gemmaUser ? getEffectiveDisplayName(gemmaUser) : 'Gemma';
    const gemmaMentionRegex = new RegExp(`@${escapeRegExp(gemmaDisplayName)}\\b`, 'i');

    const quizbotUser = allUsers?.find(u => u.id === 'quizbot');
    const quizbotDisplayName = quizbotUser ? getEffectiveDisplayName(quizbotUser) : 'Quizbot';
    const quizbotMentionRegex = new RegExp(`@${escapeRegExp(quizbotDisplayName)}\\b`, 'i');

    const isMentioningSuperbot = mentionRegex.test(messageTrimmed);
    const isMentioningGemma = gemmaMentionRegex.test(messageTrimmed);
    const isMentioningQuizbot = quizbotMentionRegex.test(messageTrimmed);
    const isHiCommand = messageTrimmed.toLowerCase().startsWith('.hi');
    const isQuizCommand = messageTrimmed.toLowerCase().startsWith('.quiz');

    // --- Violation Check Logic ---
    const now = Date.now();
    const userId = userProfile.id;

    if (!violationTrackerRef.current[userId]) {
      violationTrackerRef.current[userId] = { lastMessageTime: 0, violationCount: 0 };
    }

    const userData = violationTrackerRef.current[userId];
    const timeDiff = now - userData.lastMessageTime;
    let isViolation = false;
    let reason = '';

    // Chat speed limit
    const speedLimitSeconds = square?.slowModeDelay || themeSettings?.chatSpeedLimit || 0;
    if (speedLimitSeconds > 0 && timeDiff < speedLimitSeconds * 1000) {
      toast({
        variant: 'destructive',
        title: `You are sending messages too quickly. Please wait ${speedLimitSeconds} seconds.`,
      });
      return;
    }

    // Bad word check
    const badWords = (themeSettings?.forbiddenWords || '').split(',').filter(Boolean);
    const lowercaseMessage = newMessage.trim().toLowerCase();
    if (badWords.some(word => lowercaseMessage.includes(word.trim().toLowerCase()))) {
      isViolation = true;
      reason = 'using inappropriate language';
    }

    if (isViolation) {
      userData.violationCount++;
      if (userData.violationCount >= 3) {
        const kickDurationMinutes = 1;
        const kickExpiresAt = new Date(Date.now() + kickDurationMinutes * 60 * 1000).toISOString();
        const userToUpdateRef = doc(firestore, 'users', userId);

        updateDocumentNonBlocking(userToUpdateRef, { kickedUntil: kickExpiresAt });

        const moderationActionData: Omit<ModerationAction, 'id'> = {
          moderatorId: 'system',
          userId: userId,
          actionType: 'kick',
          reason: `Automatic kick for ${reason}.`,
          duration: kickDurationMinutes,
          createdAt: new Date().toISOString(),
        };

        const moderationActionsCollection = collection(firestore, 'moderationActions');
        addDocumentNonBlocking(moderationActionsCollection, moderationActionData)
          .then(moderationActionRef => {
            if (!moderationActionRef) return;

            const messagesCollection = collection(firestore, 'squares', squareId, 'messages');
            addDocumentNonBlocking(messagesCollection, {
              squareId: squareId,
              senderId: 'system',
              content: `${getEffectiveDisplayName(userProfile)} was automatically kicked for ${reason}.`,
              timestamp: new Date().toISOString(),
              messageType: 'moderation_log',
            });

            const notificationsCollection = collection(firestore, 'users', userId, 'notifications');
            addDocumentNonBlocking(notificationsCollection, {
              userId: userId,
              senderId: 'system',
              text: `You have been automatically kicked for ${reason} for ${kickDurationMinutes} minute.`,
              timestamp: new Date().toISOString(),
              read: false,
              type: 'moderation',
              action: { ...moderationActionData, id: moderationActionRef.id }
            });
          });

        toast({
          variant: 'destructive',
          title: 'Auto-Kicked',
        });

        userData.violationCount = 0; // Reset after kick
        setNewMessage('');
        return;
      } else {
        toast({
          variant: 'destructive',
          title: 'Warning!',
        });
        setNewMessage(''); // Don't send the violating message
        return;
      }
    }

    userData.lastMessageTime = now;

    if (!messagesCollection) return;
    // messageTrimmed already declared at top

    // Max message length
    const maxLength = square?.maxMessageLength || themeSettings?.maxMessageLength || 500;
    if (messageTrimmed.length > maxLength) {
      toast({
        variant: 'destructive',
        title: `Message is too long (max ${maxLength} characters).`,
      });
      return;
    }

    // Profanity Filter
    if (themeSettings?.profanityFilterEnabled) {
      const forbiddenWords = (themeSettings.forbiddenWords || '').split(',').map(w => w.trim()).filter(Boolean);
      if (forbiddenWords.length > 0) {
        const regex = new RegExp(forbiddenWords.join('|'), 'gi');
        messageTrimmed = messageTrimmed.replace(regex, '***');
      }
    }

    const videoId = getYoutubeVideoId(messageTrimmed);
    if (themeSettings?.youtubeEmbedsEnabled && videoId) {
      const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]{11})/g;
      const textContent = messageTrimmed.replace(urlRegex, '').trim();

      const messageData: Omit<Message, 'id'> = {
        squareId: squareId,
        senderId: userProfile.id,
        content: textContent,
        timestamp: new Date().toISOString(),
        messageType: 'user',
        youtubeVideoId: videoId,
      };

      if (quotedMessage) {
        messageData.quote = {
          messageId: quotedMessage.message.id,
          senderId: quotedMessage.message.senderId,
          senderName: getEffectiveDisplayName(quotedMessage.user),
          content: quotedMessage.message.content,
        };
      }

      addDocumentNonBlocking(messagesCollection, messageData);

      if (squareRef) {
        updateDocumentNonBlocking(squareRef, {
          lastMessage: {
            content: textContent || `[Video]`,
            timestamp: messageData.timestamp,
            senderName: getEffectiveDisplayName(userProfile),
          }
        });
      }

      const userProfileRef = doc(firestore, 'users', userProfile.id);
      updateDocumentNonBlocking(userProfileRef, { messageCount: increment(1) });

      setNewMessage('');
      setQuotedMessage(null);
      return;
    }

    // ... rest of the send logic

    // messageTrimmedLower already declared at top

    if (messageTrimmedLower === '/logs') {
      setNewMessage('');
      await handleClearLogs();
      return;
    }

    if (messageTrimmedLower === '/icebreaker') {
      handleIcebreaker('icebreaker');
      return;
    }

    if (messageTrimmedLower === '/wouldyourather') {
      handleIcebreaker('wyr');
      return;
    }

    if (messageTrimmedLower.startsWith('/confess')) {
      const confessionContent = messageTrimmed.slice('/confess'.length).trim();
      if (confessionContent) {
        const messageData: Omit<Message, 'id'> = {
          squareId: squareId,
          senderId: 'anonymous',
          originalSenderId: userProfile.id,
          content: confessionContent,
          timestamp: new Date().toISOString(),
          messageType: 'confession',
        };
        addDocumentNonBlocking(messagesCollection, messageData);

        if (squareRef) {
          updateDocumentNonBlocking(squareRef, {
            lastMessage: {
              content: '[Anonymous confession]',
              timestamp: messageData.timestamp,
              senderName: 'Anonymous',
            }
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Confession cannot be empty.',
        });
      }
      setNewMessage('');
      return;
    }

    let messageData: any = {
      squareId: squareId,
      senderId: userProfile.id,
      content: messageTrimmed,
      timestamp: new Date().toISOString(),
      messageType: 'user',
    };

    if (imageToSend || videoToSend || audioToSend || documentToSend.url) {
      if (imageToSend) {
        messageData.imageUrl = imageToSend;
        messageData.messageType = 'image';
      } else if (videoToSend) {
        messageData.videoUrl = videoToSend;
        messageData.messageType = 'video';
      } else if (audioToSend) {
        messageData.audioUrl = audioToSend;
        messageData.messageType = 'audio';
      } else if (documentToSend.url) {
        messageData.documentUrl = documentToSend.url;
        messageData.documentName = documentToSend.name;
        messageData.messageType = 'document';
      }

      if (quotedMessage) {
        messageData.quote = {
          messageId: quotedMessage.message.id,
          senderId: quotedMessage.message.senderId,
          senderName: getEffectiveDisplayName(quotedMessage.user),
          content: quotedMessage.message.content,
        };
      }

      addDocumentNonBlocking(messagesCollection, messageData);

      if (squareRef) {
        let lastMessageContent = messageData.content;
        if (imageToSend) lastMessageContent = '[Image]';
        if (videoToSend) lastMessageContent = '[Video]';
        if (audioToSend) lastMessageContent = '[Audio]';
        if (documentToSend.url) lastMessageContent = `[Document: ${documentToSend.name}]`;
        if (!lastMessageContent && (imageToSend || videoToSend || audioToSend || documentToSend.url)) {
          lastMessageContent = 'Sent an attachment.';
        }


        updateDocumentNonBlocking(squareRef, {
          lastMessage: {
            content: lastMessageContent,
            timestamp: messageData.timestamp,
            senderName: getEffectiveDisplayName(userProfile),
          }
        });
      }

      const userProfileRef = doc(firestore, 'users', userProfile.id);
      const updates: any = { messageCount: increment(1) };
      updateDocumentNonBlocking(userProfileRef, updates);

      setImageToSend(null);
      setVideoToSend(null);
      setAudioToSend(null);
      setDocumentToSend({ url: null, name: null });
      setNewMessage('');
      setQuotedMessage(null);
      return;
    }



    if (messageTrimmedLower === '/clear') {
      setNewMessage('');
      await handleClearChat();
      return;
    }

    if (messageTrimmedLower === '/stop') {
      setNewMessage('');
      await handleStopQuiz();
      return;
    }

    if (messageTrimmedLower === '/go' || messageTrimmedLower === '.quiz' || isMentioningQuizbot) {
      if (!userProfile) return;

      const quizbotUser = allUsers?.find(u => u.id === 'quizbot');

      if (quizbotUser && quizbotUser.isEnabled === false) {
        addDocumentNonBlocking(messagesCollection, {
          squareId: squareId,
          senderId: 'quizbot',
          content: 'Quizbot is currently disabled by the owner.',
          timestamp: new Date().toISOString(),
          messageType: 'user',
        });
        setNewMessage('');
        return;
      }

      if (!quizbotUser?.assignedRoomId) {
        addDocumentNonBlocking(messagesCollection, {
          squareId: squareId,
          senderId: 'quizbot',
          content: 'I have not been assigned to a Square yet. An Owner needs to assign me to one from my profile.',
          timestamp: new Date().toISOString(),
          messageType: 'user',
        });
        setNewMessage('');
        return;
      }

      if (quizbotUser.assignedRoomId !== squareId) {
        const activeRoomRef = doc(firestore, 'squares', quizbotUser.assignedRoomId);
        const activeRoomSnap = await getDoc(activeRoomRef);
        const activeRoomName = activeRoomSnap.exists() ? activeRoomSnap.data().name : 'another Square';

        addDocumentNonBlocking(messagesCollection, {
          squareId: squareId,
          senderId: 'quizbot',
          content: `I am currently active in the "${activeRoomName}" Square. You can use /go there.`,
          timestamp: new Date().toISOString(),
          messageType: 'user',
        });
        setNewMessage('');
        return;
      }

      await startQuizBot();
      setNewMessage('');
      return;
    }

    // Quiz Answer Check
    if (messages && userProfile) {
      const lastQuestionMessage = [...messages].reverse().find(m => m.messageType === 'quiz_question' && m.quiz);

      if (lastQuestionMessage && lastQuestionMessage.quiz) {
        const quizData = lastQuestionMessage.quiz;
        const qId = quizData.quizId;

        if (qId) {
          const isQuestionAnswered = messages.some(m =>
            (m.messageType === 'quiz_winner' || m.messageType === 'quiz_answer') && m.quiz?.quizId === qId
          );

          if (!isQuestionAnswered && quizData.correctAnswer) {
            const userMessage = messageTrimmed.toLowerCase();
            const possibleAnswers = quizData.correctAnswer.toLowerCase().split('|');

            if (possibleAnswers.includes(userMessage)) {
              clearQuizTimeouts();

              const hintPosted = messages.some(m =>
                m.quiz?.quizId === qId && m.messageType === 'quiz_hint'
              );
              let pointsWon = hintPosted ? Math.floor(Math.random() * 41) + 10 : Math.floor(Math.random() * 50) + 51;
              const newQuizPoints = (userProfile.quizPoints || 0) + pointsWon;

              const userRef = doc(firestore, 'users', userProfile.id);
              updateDocumentNonBlocking(userRef, { quizPoints: newQuizPoints });

              const winnerMessageData: Omit<Message, 'id'> = {
                squareId: squareId,
                senderId: 'quizbot',
                content: `Winner!`,
                timestamp: new Date().toISOString(),
                messageType: 'quiz_winner',
                quiz: {
                  quizId: qId,
                  winnerInfo: {
                    userId: userProfile.id,
                    displayName: getEffectiveDisplayName(userProfile),
                    answer: messageTrimmed,
                    pointsWon: pointsWon,
                    totalPoints: newQuizPoints,
                  }
                }
              };

              addDocumentNonBlocking(messagesCollection, winnerMessageData);
              goToNextQuestion();
              setNewMessage('');
              return;
            }
          }
        }
      }
    }

    // Bot checks moved to top

    if (quotedMessage) {
      messageData.quote = {
        messageId: quotedMessage.message.id,
        senderId: quotedMessage.message.senderId,
        senderName: getEffectiveDisplayName(quotedMessage.user),
        content: quotedMessage.message.content,
      };
    }

    addDocumentNonBlocking(messagesCollection, messageData);

    let botTriggered = false;
    let prompt = '';

    if (isMentioningSuperbot || isMentioningGemma || isHiCommand) {
      botTriggered = true;
      if (isMentioningSuperbot) {
        prompt = messageTrimmed.replace(mentionRegex, '').trim();
      } else if (isMentioningGemma) {
        prompt = messageTrimmed.replace(gemmaMentionRegex, '').trim();
      } else if (isHiCommand) {
        prompt = messageTrimmed.substring(3).trim();
      }
    }

    if (botTriggered) {
      setTimeout(() => {
        if (isMentioningGemma) {
          if (gemmaUser && gemmaUser.isEnabled === false) {
            addDocumentNonBlocking(messagesCollection, {
              squareId: squareId,
              senderId: 'gemma',
              content: 'Gemma is currently incognito (disabled by the owner).',
              timestamp: new Date().toISOString(),
              messageType: 'user',
            });
            return;
          }

          if (!prompt) {
            addDocumentNonBlocking(messagesCollection, {
              squareId: squareId,
              senderId: 'gemma',
              content: "You called the Rizz Master? What's on your mind?",
              timestamp: new Date().toISOString(),
              messageType: 'user',
            });
            return;
          }

          const botMessagePromise = addDocumentNonBlocking(messagesCollection, {
            squareId: squareId,
            senderId: 'gemma',
            content: "Checking the vibe...",
            timestamp: new Date().toISOString(),
            messageType: 'user',
          });

          askGemma({ prompt }).then(async botResponse => {
            const botMessageRef = await botMessagePromise;
            if (botMessageRef) {
              updateDocumentNonBlocking(botMessageRef, { content: botResponse });
            }
          }).catch(async (error) => {
            console.error("Gemma flow error:", error);
            const botMessageRef = await botMessagePromise;
            if (botMessageRef) {
              updateDocumentNonBlocking(botMessageRef, { content: "Lost the rizz for a second. Try again!" });
            }
          });
        } else {
          // Default Superbot logic
          const botUser = allUsers?.find(u => u.id === 'superbot');
          if (botUser && botUser.isEnabled === false) {
            addDocumentNonBlocking(messagesCollection, {
              squareId: squareId,
              senderId: 'superbot',
              content: 'Superbot is currently disabled by the owner.',
              timestamp: new Date().toISOString(),
              messageType: 'user',
            });
            return;
          }

          if (!prompt && (isMentioningSuperbot || isHiCommand)) {
            addDocumentNonBlocking(messagesCollection, {
              squareId: squareId,
              senderId: 'superbot',
              content: "You called? How can I help you?",
              timestamp: new Date().toISOString(),
              messageType: 'user',
            });
            return;
          }

          if (prompt) {
            const botMessagePromise = addDocumentNonBlocking(messagesCollection, {
              squareId: squareId,
              senderId: 'superbot',
              content: "Thinking...",
              timestamp: new Date().toISOString(),
              messageType: 'user',
            });

            askSuperbot({ prompt }).then(async botResponse => {
              const botMessageRef = await botMessagePromise;
              if (botMessageRef) {
                updateDocumentNonBlocking(botMessageRef, { content: botResponse });
              }
            }).catch(async (error) => {
              console.error("Superbot flow error:", error);
              const botMessageRef = await botMessagePromise;
              if (botMessageRef) {
                updateDocumentNonBlocking(botMessageRef, { content: "Sorry, I had a problem thinking. Please try again." });
              }
            });
          }
        }
      }, 500);
    }

    if (squareRef) {
      updateDocumentNonBlocking(squareRef, {
        lastMessage: {
          content: messageData.content,
          timestamp: messageData.timestamp,
          senderName: getEffectiveDisplayName(userProfile),
        }
      });
    }

    const userProfileRef = doc(firestore, 'users', userProfile.id);
    const updates: { [key: string]: any } = { messageCount: increment(1) };

    const nowForXp = Date.now();
    if (!violationTrackerRef.current[userProfile.id]) {
      violationTrackerRef.current[userProfile.id] = { lastMessageTime: 0, violationCount: 0 };
    }
    const lastXpTime = violationTrackerRef.current[userProfile.id].lastXpTimestamp || 0;
    const xpCooldown = 30000; // 30 seconds

    if (nowForXp - lastXpTime > xpCooldown) {
      violationTrackerRef.current[userProfile.id].lastXpTimestamp = nowForXp;

      const xpGained = Math.floor(Math.random() * 11) + 5; // 5 to 15 XP
      const goldForChatting = Math.floor(Math.random() * 5) + 1; // 1 to 5 Gold
      const currentLevel = userProfile.level || 1;
      const currentXp = userProfile.xp || 0;
      const xpForNextLevel = currentLevel * 100;

      let newXp = currentXp + xpGained;
      let newLevel = currentLevel;

      let finalGoldGained = goldForChatting;
      let finalRubyGained = 0;

      if (newXp >= xpForNextLevel) {
        newLevel += 1;
        newXp -= xpForNextLevel;

        const goldRewardOnLevelUp = 100 * (newLevel - 1);
        finalGoldGained += goldRewardOnLevelUp;

        let toastDescription = `You've reached level ${newLevel}! You earned ${goldRewardOnLevelUp} gold`;

        if (newLevel % 5 === 0) {
          finalRubyGained = 10;
          toastDescription += ` and ${finalRubyGained} rubies`;
        }

        toastDescription += `!`;

        if (soundState.notificationSounds) playSound('/sounds/levelup.mp3');
        toast({
          title: "Level Up!",
        });
      }

      updates.xp = newXp;
      updates.level = newLevel;
      if (finalGoldGained > 0) {
        updates.gold = increment(finalGoldGained);
      }
      if (finalRubyGained > 0) {
        updates.rubies = increment(finalRubyGained);
      }

      const provisionalUser = {
        ...userProfile,
        level: newLevel,
        xp: newXp,
        messageCount: (userProfile.messageCount || 0) + 1,
      };

      const newBadgesResult = getNewBadges(provisionalUser);

      if (newBadgesResult.length > 0) {
        if (soundState.notificationSounds) playSound('/sounds/badge.mp3');

        const newEarnedBadges: EarnedBadge[] = [];
        newBadgesResult.forEach(result => {
          for (let i = 0; i < result.times; i++) {
            newEarnedBadges.push({
              id: result.definition.id,
              timestamp: new Date().toISOString(),
            });
          }
        });

        if (newEarnedBadges.length > 0) {
          updates.badges = [...(userProfile.badges || []), ...newEarnedBadges];
        }

        const notificationsCollection = collection(firestore, 'users', userProfile.id, 'notifications');
        newBadgesResult.forEach(result => {
          const badgeDef = result.definition;
          const message = result.times > 1
            ? `You've earned the "${badgeDef.name}" badge ${result.times} times!`
            : `You've earned the "${badgeDef.name}" badge!`;

          addDocumentNonBlocking(notificationsCollection, {
            userId: userProfile.id,
            senderId: 'system',
            text: message,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'badge_earned',
          });
          toast({
            title: "Badge Earned!",
          });
        });
      }
    }

    if (Object.keys(updates).length > 0) {
      updateDocumentNonBlocking(userProfileRef, updates);
    }

    setNewMessage('');
    setQuotedMessage(null);
  };

  const handleSelectYouTubeVideo = ({ id, title }: { id: string; title: string }) => {
    if (!userProfile || !squareId || !messagesCollection) return;

    const messageData: Omit<Message, 'id'> = {
      squareId: squareId,
      senderId: userProfile.id,
      content: `Shared a video: ${title}`,
      timestamp: new Date().toISOString(),
      messageType: 'user',
      youtubeVideoId: id,
      youtubeTitle: title,
    };

    addDocumentNonBlocking(messagesCollection, messageData);

    if (squareRef) {
      updateDocumentNonBlocking(squareRef, {
        lastMessage: {
          content: `[Video] ${title}`,
          timestamp: messageData.timestamp,
          senderName: getEffectiveDisplayName(userProfile),
        }
      });
    }

    setNewMessage('');
    setQuotedMessage(null);
  };

  const handleSelectGif = (gifUrl: string) => {
    if (!userProfile || !squareId || !messagesCollection) return;

    const messageData: Omit<Message, 'id'> = {
      squareId: squareId,
      senderId: userProfile.id,
      content: 'Shared a GIF',
      timestamp: new Date().toISOString(),
      messageType: 'image',
      imageUrl: gifUrl,
    };

    addDocumentNonBlocking(messagesCollection, messageData);
    
    if (squareRef) {
        updateDocumentNonBlocking(squareRef, {
          lastMessage: {
            content: `[GIF]`,
            timestamp: messageData.timestamp,
            senderName: getEffectiveDisplayName(userProfile),
          }
        });
      }
  
      setNewMessage('');
      setQuotedMessage(null);
  };

  const handleQuote = (message: Message, user: User) => {
    setQuotedMessage({ message, user });
    textareaRef.current?.focus();
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!squareId) return;
    const messageRef = doc(firestore, 'squares', squareId, 'messages', messageId);
    deleteDocumentNonBlocking(messageRef);
    toast({
      title: 'Message Deleted',
    });
  };

  const handleSpotlightMessage = (messageId: string) => {
    if (!squareId) return;
    const messageRef = doc(firestore, 'squares', squareId, 'messages', messageId);
    updateDocumentNonBlocking(messageRef, { isSpotlighted: true });
    toast({
      title: 'Message Spotlighted!',
    });
    setTimeout(() => {
      updateDocumentNonBlocking(messageRef, { isSpotlighted: false });
    }, 10000); // Spotlight for 10 seconds
  };

  const handleNewMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewMessage(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([\w\s-]*)$/);


    if (atMatch) {
      setIsMentioning(true);
      setMentionQuery(atMatch[1]);
    } else {
      setIsMentioning(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    const currentTextarea = textareaRef.current;
    if (!currentTextarea) return;

    const text = newMessage;
    const cursorPos = currentTextarea.selectionStart;

    // Replace the partial @mention with the full one
    const textBefore = text.substring(0, cursorPos).replace(/@([\w\s-]*)$/, `@${username} `);
    const textAfter = text.substring(cursorPos);
    const newText = textBefore + textAfter;

    setNewMessage(newText);
    setIsMentioning(false);

    setTimeout(() => {
      currentTextarea.focus();
      currentTextarea.selectionStart = currentTextarea.selectionEnd = textBefore.length;
    }, 0);
  };

  const handleUserSelectForMention = (username: string) => {
    // Append the mention to the current message
    setNewMessage(prev => `${prev ? prev.trim() + ' ' : ''}@${username} `);
    // Focus the textarea
    textareaRef.current?.focus();
  };

  const handleUsernameClick = (username: string) => {
    setNewMessage(prev => `${prev ? prev.trim() + ' ' : ''}@${username} `);
    textareaRef.current?.focus();
  };

  const isRoomOwner = square && userProfile && (userProfile.id === square.creatorId || userProfile.role === 'Owner');
  const isDJ = userProfile && square && square.djId === userProfile.id;
  const canManageDJ = isDJ || isRoomOwner;

  const onEmojiClick = (emojiData: EmojiClickData, event: MouseEvent) => {
    setNewMessage(prevMessage => prevMessage + emojiData.emoji);
  };

  const effectiveBackground = userProfile?.chatBackgroundUrl
    ? userProfile.chatBackgroundUrl
    : themeSettings?.defaultBackgroundUrl || square?.backgroundUrl;

  const effectiveDecoration = userProfile?.chatDecorationUrl
    ? userProfile.chatDecorationUrl
    : themeSettings?.defaultDecorationUrl;

  const effectiveDecorationPosition = userProfile?.chatDecorationPosition
    ? userProfile.chatDecorationPosition
    : themeSettings?.defaultDecorationPosition || 'bottom right';

  const emojiPickerTheme = Theme.DARK;

  const headerContent = (
    <div className="flex flex-1 min-w-0 items-center justify-end gap-4">
      {(isSquareLoading || areAllUsersLoading) ? (
        <></>
      ) : square ? (
        <>
          {square.djId && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => setIsDjPanelOpen(true)}>
                    <FontAwesomeIcon icon={faMusic} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Open DJ Panel</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsUserListOpen(!isUserListOpen)}>
                <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
              </Button>
            </div>
            <div className="lg:hidden">
              <UserListSheet onUserSelect={handleUserSelectForMention} squareId={squareId} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <AppLayout headerContent={headerContent} soundState={soundStateProp} setSoundState={setSoundStateProp}>
      <div className="flex flex-1 min-h-0 w-full min-w-0 overflow-hidden h-full">
        <div
          className="flex-1 flex flex-col h-full min-h-0 relative back_chat w-full min-w-0 overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: effectiveBackground ? `url(${effectiveBackground})` : undefined }}
        >
          {effectiveDecoration && (
            <div
              className="absolute inset-0 pointer-events-none bg-no-repeat"
              style={{
                backgroundImage: `url(${effectiveDecoration})`,
                backgroundPosition: effectiveDecorationPosition,
                backgroundSize: 'contain',
              }}
            ></div>
          )}
          {isKicked ? (
            <ChatPrisonView initialTimeLeft={kickTimeLeft} reason={kickReason} roomName={square?.name} />
          ) : isGloballyBanned ? (
            <ChatPrisonView isBanned={true} reason={globalBanReason} />
          ) : isSquareBanned ? (
            <ChatPrisonView isBanned={true} reason={squareBanReason} squareName={square?.name} />
          ) : null}

          <>
            <ScrollArea className="flex-1 p-4" viewportRef={scrollAreaViewportRef}>
              <div className="space-y-4">
                {messages?.map((message) => (
                  <ChatMessage key={message.id} message={message} onQuote={handleQuote} allUsers={allUsers} currentUserProfile={userProfile} onUsernameClick={handleUsernameClick} square={square} onDeleteMessage={handleDeleteMessage} onSpotlightMessage={handleSpotlightMessage} squareId={squareId} isQuizSquare={isQuizSquare} isQbotActive={false} onMediaClick={(type, src) => setMediaViewerState({ type, src })} />
                ))
                }
              </div>
            </ScrollArea>
            <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
              {isMuted && (
                <div className="flex items-center justify-center gap-2 text-sm text-red-300 bg-red-900/20 p-2 rounded-md mb-2">
                  <Image src="/interface_icons/regmute.svg" alt="Muted" width={20} height={20} />
                  <span>{muteMessage || 'You are muted.'}</span>
                </div>
              )}
              {isMentioning && (allUsers?.filter(u => getEffectiveDisplayName(u).toLowerCase().includes(mentionQuery.toLowerCase())).length ?? 0) > 0 && (
                <div className="p-2 mb-2 rounded-md bg-secondary text-secondary-foreground max-h-48 overflow-y-auto">
                  <p className="text-xs font-bold mb-2 px-2">Mention a user</p>
                  {allUsers?.filter(u => getEffectiveDisplayName(u).toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5).map(u => (
                    <div key={u.id} onClick={() => handleMentionSelect(getEffectiveDisplayName(u))} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-accent rounded-md">
                      <UserAvatar user={u} className="w-8 h-8" />
                      <span className="font-medium">{getEffectiveDisplayName(u)}</span>
                    </div>
                  ))}
                </div>
              )}
              {quotedMessage && (
                <div className="relative p-2 mb-2 rounded-md bg-secondary text-secondary-foreground">
                  <p className="text-xs font-bold">Replying to {getEffectiveDisplayName(quotedMessage.user)}</p>
                  <p className="text-sm opacity-80 truncate">{quotedMessage.message.content}</p>
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setQuotedMessage(null)}>
                    <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {imageToSend && (
                <div className="relative p-2 mb-2 rounded-md bg-secondary text-secondary-foreground">
                  <p className="text-xs font-bold">Image Attached:</p>
                  <Image src={imageToSend} alt="Attached drawing" width={100} height={75} className="mt-1 rounded-md" />
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setImageToSend(null)}>
                    <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {videoToSend && (
                <div className="relative p-2 mb-2 rounded-md bg-secondary text-secondary-foreground">
                  <p className="text-xs font-bold">Video Attached:</p>
                  <video src={videoToSend} controls className="mt-1 rounded-md max-w-xs" />
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setVideoToSend(null)}>
                    <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {audioToSend && (
                <div className="relative p-2 mb-2 rounded-md bg-secondary text-secondary-foreground">
                  <p className="text-xs font-bold">Audio Attached:</p>
                  <audio src={audioToSend} controls className="mt-1 w-full" />
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setAudioToSend(null)}>
                    <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {documentToSend && documentToSend.url && (
                <div className="relative p-2 mb-2 rounded-md bg-secondary text-secondary-foreground">
                  <p className="text-xs font-bold">Document Attached:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <FontAwesomeIcon icon={faFileAlt} className="text-muted-foreground" />
                    <span className="text-sm truncate">{documentToSend.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setDocumentToSend({ url: null, name: null })}>
                    <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {!isMuted && (
                <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-card/60 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 relative group w-full max-w-4xl mx-auto shadow-xl">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={handleFileSelect}
                  />
                  {/* Left Side Icons */}
                  <div className="flex items-center gap-0.5 px-1 mb-1">
                    <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary transition-colors">
                          <FontAwesomeIcon icon={faSmile} className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-2xl" side="top" align="start">
                        <EmojiPicker
                          onEmojiClick={onEmojiClick}
                          theme={emojiPickerTheme}
                          lazyLoadEmojis={true}
                          searchDisabled={true}
                          previewConfig={{ showPreview: false }}
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary transition-colors">
                          <FontAwesomeIcon icon={faPaperclip} className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2 mb-2" side="top" align="start">
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex flex-col h-auto p-3 gap-2" onClick={() => fileInputRef.current?.click()}>
                            <Image src="/images/upload.svg" alt="Upload" width={20} height={20} />
                            <span className="text-[10px]">Upload</span>
                          </Button>
                          <Button variant="outline" className="flex flex-col h-auto p-3 gap-2" onClick={() => setIsYouTubeSearchOpen(true)} disabled={!themeSettings?.youtubeEmbedsEnabled}>
                            <Image src="/images/youtube.svg" alt="YouTube" width={20} height={20} />
                            <span className="text-[10px]">YouTube</span>
                          </Button>
                          <Button variant="outline" className="flex flex-col h-auto p-3 gap-2" onClick={() => setIsGiphySearchOpen(true)}>
                            <Image src="https://developers.giphy.com/branch/master/static/header-logo-0fec0225d189bc0eae27dac3e3770582.gif" alt="Giphy" width={20} height={20} />
                            <span className="text-[10px]">Giphy</span>
                          </Button>
                          <Button variant="outline" className="flex flex-col h-auto p-3 gap-2" onClick={() => setIsPaintDialogOpen(true)} disabled={!userProfile?.drawingCanvasEnabled && !themeSettings?.drawingCanvasEnabled}>
                            <Image src="/images/paintit.svg" alt="Paint It" width={20} height={20} />
                            <span className="text-[10px]">Paint It</span>
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Input Center */}
                  <Textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleNewMessageChange}
                    placeholder={isSquareBanned || isKicked || isGloballyBanned ? "Restricted" : "Message..."}
                    className="flex-1 min-w-0 resize-none border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-2 text-sm min-h-[38px] max-h-[120px] scrollbar-hide"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    rows={1}
                    disabled={isMuted || isSquareBanned || isKicked || isGloballyBanned || isRecording}
                  />

                  {/* Right Side Logic: Record vs Send */}
                  <div className="flex items-center gap-1.5 px-1 mb-1">
                    {!newMessage.trim() && !imageToSend && !videoToSend && !audioToSend && !documentToSend.url ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8 rounded-full text-muted-foreground hover:text-primary transition-all", isRecording && "text-red-500 bg-red-500/10")}
                        onClick={handleVoiceMessage}
                      >
                        <FontAwesomeIcon icon={isRecording ? faStop : faMicrophone} className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                        disabled={isUserProfileLoading || isMuted || isSquareBanned || isKicked || isGloballyBanned || isRecording}
                      >
                        <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </>
        </div>
        <aside className={cn(
          "flex-col border-l bg-card text-card-foreground hidden lg:flex transition-all duration-300 ease-in-out",
          isUserListOpen ? "w-80" : "w-0"
        )}>
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} className="w-5 h-5" />
                Members
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <UserListContent onUserSelect={handleUserSelectForMention} squareId={squareId} />
              </div>
            </ScrollArea>
          </div>
        </aside>
      </div>
      {square && (
        <DjPanelDialog
          open={isDjPanelOpen}
          onOpenChange={setIsDjPanelOpen}
          square={square}
          djUser={djUser || null}
          squareId={squareId}
        />
      )}
      <PaintDialog
        open={isPaintDialogOpen}
        onOpenChange={setIsPaintDialogOpen}
        onSave={(dataUrl) => {
          setImageToSend(dataUrl);
          setNewMessage(''); // Clear text when attaching image
          toast({ title: 'Drawing attached!' });
        }}
      />
      <YouTubeSearchDialog
        open={isYouTubeSearchOpen}
        onOpenChange={setIsYouTubeSearchOpen}
        onSelectVideo={handleSelectYouTubeVideo}
      />
      <GiphySearchDialog
        open={isGiphySearchOpen}
        onOpenChange={setIsGiphySearchOpen}
        onSelectGif={handleSelectGif}
      />
      <MediaViewerDialog
        open={!!mediaViewerState}
        onOpenChange={() => setMediaViewerState(null)}
        media={mediaViewerState}
      />
      {square && <FloatingDjControls square={square} squareId={squareId} />}
      {square && <FloatingCallButton square={square} squareId={squareId} />}
    </AppLayout>
  );
}

export default function SquarePage({ soundState, setSoundState }: any) {
  return <SquarePageContent soundState={soundState} setSoundState={setSoundState} />;
}
