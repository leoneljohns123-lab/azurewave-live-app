'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, PrivateMessage } from '@/lib/types';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPaperPlane, faWindowMinimize, faSmile, faPaperclip, faMicrophone, faStop } from '@fortawesome/free-solid-svg-icons';
import { usePrivateMessages } from '@/hooks/usePrivateMessages';
import { useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useDM } from '@/contexts/DMProvider';
import { collection, doc } from 'firebase/firestore';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import Image from 'next/image';
import { askSuperbot } from '@/ai/flows/superbot-flow';
import { askGemma } from '@/ai/flows/gemma-rizz-flow';
import { askQuizbot } from '@/ai/flows/quizbot-flow';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GiphySearchDialog } from '@/components/giphy-search-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/use-notifications';

interface DMWindowProps {
  recipient: User;
  index: number;
}

export function DMWindow({ recipient, index }: DMWindowProps) {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const { closeDM } = useDM();
  const { showNotification } = useNotifications();
  const lastNotifiedMsgId = useRef<string | null>(null);
  const initialLoadDone = useRef(false);
  const { messages, isLoading } = usePrivateMessages(recipient);
  const [newMessage, setNewMessage] = useState('');
  
  const [isClient, setIsClient] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  
  const { profile: currentUserProfile } = useEffectiveUserProfile();
  const [muteMessage, setMuteMessage] = useState<string | null>(null);
  
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isGiphySearchOpen, setIsGiphySearchOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imageToSend, setImageToSend] = useState<string | null>(null);
  const [videoToSend, setVideoToSend] = useState<string | null>(null);
  const [audioToSend, setAudioToSend] = useState<string | null>(null);
  const [documentToSend, setDocumentToSend] = useState<{ url: string | null, name: string | null }>({ url: null, name: null });
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isMuted = useMemo(() => {
    if (!currentUserProfile?.mutedUntil) return false;
    if (currentUserProfile.role === 'Owner') return false;
    if (currentUserProfile.mutedUntil.startsWith('9999')) return true;
    return new Date(currentUserProfile.mutedUntil).getTime() > Date.now();
  }, [currentUserProfile]);

  useEffect(() => {
    if (!isMuted || !currentUserProfile?.mutedUntil || currentUserProfile.role === 'Owner') {
      setMuteMessage(null);
      return;
    }
    
    if (currentUserProfile.mutedUntil.startsWith('9999')) {
        setMuteMessage("You are permanently banned.");
        return;
    }

    const expiresAt = new Date(currentUserProfile.mutedUntil).getTime();
    
    const intervalId = setInterval(() => {
      const now = Date.now();
      const distance = expiresAt - now;

      if (distance < 0) {
        clearInterval(intervalId);
        setMuteMessage(null);
      } else {
        const minutes = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2,'0');
        const seconds = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
        setMuteMessage(`You are muted. Time remaining: ${minutes}:${seconds}`);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isMuted, currentUserProfile?.mutedUntil, currentUserProfile?.role]);

  useEffect(() => {
      setIsClient(true);
      const newX = window.innerWidth - 384 - (index * 100);
      const newY = window.innerHeight - 420;
      setPosition({ x: newX > 0 ? newX : 0, y: newY > 0 ? newY : 0 });
  }, [index]);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaViewportRef.current) {
      scrollAreaViewportRef.current.scrollTop = scrollAreaViewportRef.current.scrollHeight;
    }
  }, [messages, isMinimized, isBotTyping]);

  useEffect(() => {
    if (messages && currentUser && firestore) {
      messages.forEach(message => {
        if (!message.read && message.receiverId === currentUser.uid) {
          const messageRef = doc(firestore, 'privateMessages', message.id);
          updateDocumentNonBlocking(messageRef, { read: true });
        }
      });
    }
  }, [messages, currentUser, firestore]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (windowRef.current) {
      setIsDragging(true);
      dragStartOffset.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
          setPosition({
              x: e.clientX - dragStartOffset.current.x,
              y: e.clientY - dragStartOffset.current.y,
          });
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };
  
  useEffect(() => {
    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  // Notification for new messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Skip initial load of existing messages
      if (!initialLoadDone.current) {
        lastNotifiedMsgId.current = lastMessage.id;
        initialLoadDone.current = true;
        return;
      }

      if (lastMessage.senderId !== currentUser?.uid && lastMessage.id !== lastNotifiedMsgId.current) {
        lastNotifiedMsgId.current = lastMessage.id;
        
        showNotification(`New DM from ${recipient.displayName}`, {
          body: lastMessage.content,
          tag: `dm-${recipient.id}`,
        });
      }
    }
  }, [messages, currentUser?.uid, showNotification, recipient.displayName, recipient.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || isMuted) return;
    
    const userMessage = newMessage.trim();
    const privateMessagesCollection = collection(firestore, 'privateMessages');
    
    addDocumentNonBlocking(privateMessagesCollection, {
      senderId: currentUser.uid,
      receiverId: recipient.id,
      content: userMessage,
      timestamp: new Date().toISOString(),
      read: false,
      participants: [currentUser.uid, recipient.id].sort(),
    });
    
    setNewMessage('');

    // --- AI Agent Logic ---
    if (recipient.id === 'superbot') {
        if (recipient.isEnabled === false) {
            addDocumentNonBlocking(privateMessagesCollection, {
                senderId: 'superbot',
                receiverId: currentUser.uid,
                content: "I'm currently resting! (Disabled by administrator)",
                timestamp: new Date().toISOString(),
                read: false,
                participants: [currentUser.uid, 'superbot'].sort(),
            });
            return;
        }

        setIsBotTyping(true);
        try {
            const response = await askSuperbot({ prompt: userMessage });
            addDocumentNonBlocking(privateMessagesCollection, {
                senderId: 'superbot',
                receiverId: currentUser.uid,
                content: response,
                timestamp: new Date().toISOString(),
                read: false,
                participants: [currentUser.uid, 'superbot'].sort(),
            });
        } catch (err) {
            console.error("Superbot DM error:", err);
            addDocumentNonBlocking(privateMessagesCollection, {
                senderId: 'superbot',
                receiverId: currentUser.uid,
                content: "I'm having a bit of trouble connecting to my brain! Please try again in a moment.",
                timestamp: new Date().toISOString(),
                read: false,
                participants: [currentUser.uid, 'superbot'].sort(),
            });
        } finally {
            setIsBotTyping(false);
        }
    } else if (recipient.id === 'gemma') {
        if (recipient.isEnabled === false) {
            addDocumentNonBlocking(privateMessagesCollection, {
                senderId: 'gemma',
                receiverId: currentUser.uid,
                content: "I'm staying undercover for now. (Disabled by administrator)",
                timestamp: new Date().toISOString(),
                read: false,
                participants: [currentUser.uid, 'gemma'].sort(),
            });
            return;
        }

        setIsBotTyping(true);
        try {
            const response = await askGemma({ prompt: userMessage });
            addDocumentNonBlocking(privateMessagesCollection, {
                senderId: 'gemma',
                receiverId: currentUser.uid,
                content: response,
                timestamp: new Date().toISOString(),
                read: false,
                participants: [currentUser.uid, 'gemma'].sort(),
            });
        } catch (err) {
            console.error("Gemma DM error:", err);
            addDocumentNonBlocking(privateMessagesCollection, {
                senderId: 'gemma',
                receiverId: currentUser.uid,
                content: "Even the smooth ones have off days. Catch me in a minute, yeah?",
                timestamp: new Date().toISOString(),
                read: false,
                participants: [currentUser.uid, 'gemma'].sort(),
            });
        } finally {
            setIsBotTyping(false);
        }
    } else if (recipient.id === 'quizbot' || recipient.id === 'qbot') {
        if (recipient.isEnabled === false) {
            addDocumentNonBlocking(privateMessagesCollection, {
                senderId: recipient.id,
                receiverId: currentUser.uid,
                content: "I'm recalibrating my questions! (Disabled by administrator)",
                timestamp: new Date().toISOString(),
                read: false,
                participants: [currentUser.uid, recipient.id].sort(),
            });
            return;
        }

        setIsBotTyping(true);
        try {
            const quiz = await askQuizbot({});
            let content = '';
            if (quiz.quizType === 'scramble') {
                content = `SCRAMBLE! Unscramble this word: ${quiz.question} (${quiz.wordCount} word(s))`;
            } else {
                content = `TRIVIA! ${quiz.question} (${quiz.wordCount} word(s))`;
            }

            addDocumentNonBlocking(privateMessagesCollection, {
                senderId: recipient.id,
                receiverId: currentUser.uid,
                content: content,
                timestamp: new Date().toISOString(),
                read: false,
                participants: [currentUser.uid, recipient.id].sort(),
            });
            
            // Send hint after a short delay
            setTimeout(() => {
                addDocumentNonBlocking(privateMessagesCollection, {
                    senderId: recipient.id,
                    receiverId: currentUser.uid,
                    content: `Hint: ${quiz.hint}`,
                    timestamp: new Date().toISOString(),
                    read: false,
                    participants: [currentUser.uid, recipient.id].sort(),
                });
            }, 3000);

        } catch (err) {
            console.error("Quizbot DM error:", err);
            addDocumentNonBlocking(privateMessagesCollection, {
                senderId: recipient.id,
                receiverId: currentUser.uid,
                content: "My logic circuits are tangled! Please try again in a bit.",
                timestamp: new Date().toISOString(),
                read: false,
                participants: [currentUser.uid, recipient.id].sort(),
            });
        } finally {
            setIsBotTyping(false);
        }
    }
  };

  const handleSelectGif = (gifUrl: string) => {
    if (!currentUser || isMuted) return;
    const privateMessagesCollection = collection(firestore, 'privateMessages');
    addDocumentNonBlocking(privateMessagesCollection, {
      senderId: currentUser.uid,
      receiverId: recipient.id,
      content: 'Shared a GIF',
      timestamp: new Date().toISOString(),
      read: false,
      participants: [currentUser.uid, recipient.id].sort(),
      imageUrl: gifUrl,
    });
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // For now, we'll just mock the upload like in the main page or use a placeholder
    toast({ title: 'File selected', description: `${file.name} is ready to send.` });
    // Implementation would involve storage upload and setting the corresponding state
  };

  const handleVoiceMessage = () => {
      // Toggle recording mock
      setIsRecording(!isRecording);
      if (!isRecording) {
          toast({ title: 'Recording started...' });
      } else {
          toast({ title: 'Recording saved' });
          // Mock send audio
          handleSelectGif('mock-audio-url'); // Placeholder for audio logic
      }
  };

  if (!isClient) {
      return null;
  }

  const toggleMinimize = () => setIsMinimized(!isMinimized);

  return (
    <div
      ref={windowRef}
      className={cn(
          "fixed w-80 sm:w-96 rounded-lg shadow-2xl flex flex-col border border-slate-700/50 z-[60] bg-slate-800/50 backdrop-blur-md transition-all duration-300",
          isMinimized ? "h-12 overflow-hidden" : "h-[420px]",
      )}
      style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
      }}
    >
      <header
        className="flex items-center justify-between p-2 cursor-move bg-black/20"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-3">
          <UserAvatar user={recipient} className="w-8 h-8" />
          <span className="font-semibold text-sm text-white">{recipient.displayName}</span>
        </div>
        <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={toggleMinimize}>
                <FontAwesomeIcon icon={faWindowMinimize} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => closeDM(recipient.id)}>
                <FontAwesomeIcon icon={faTimes} />
            </Button>
        </div>
      </header>
      <ScrollArea className="flex-1 p-2 bg-black/10" viewportRef={scrollAreaViewportRef}>
        <div className="space-y-4 p-2">
            {isLoading && <p className="text-sm text-muted-foreground text-center">Loading messages...</p>}
            {messages?.map(message => {
                const isCurrentUser = message.senderId === currentUser?.uid;
                return (
                    <div key={message.id} className={cn("flex items-end gap-2", isCurrentUser && "justify-end")}>
                        <div className={cn(
                            "flex flex-col rounded-xl px-3 py-2 max-w-[80%] shadow-md",
                            isCurrentUser 
                                ? "bg-primary text-primary-foreground rounded-br-none" 
                                : "bg-slate-700 text-slate-200 rounded-bl-none"
                        )}>
                            {message.content.startsWith('https://media') && message.content.includes('giphy.com') ? (
                                <div className="mt-1 relative w-full aspect-video rounded-lg overflow-hidden min-w-[200px]">
                                    <Image src={message.content} alt="GIF" layout="fill" className="object-cover" unoptimized />
                                </div>
                            ) : (
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                            <time className={cn('text-xs opacity-70 mt-1 self-end', isCurrentUser ? 'text-primary-foreground/80' : 'text-slate-400' )}>
                                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                            </time>
                        </div>
                    </div>
                )
            })}
            {isBotTyping && (
                <div className="flex items-end gap-2">
                    <div className="bg-slate-700 text-slate-200 rounded-xl px-3 py-2 rounded-bl-none shadow-md">
                        <div className="flex gap-1 py-1">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                </div>
            )}
             {messages && messages.length === 0 && !isLoading && !isBotTyping && (
                <p className="text-sm text-muted-foreground text-center py-12">
                    This is the beginning of your conversation with {recipient.displayName}.
                </p>
             )}
        </div>
      </ScrollArea>
      {isMuted ? (
        <div className="p-2 border-t border-slate-700/50 flex items-center justify-center gap-2 text-sm text-red-300 bg-red-900/20">
            <Image src="/interface_icons/regmute.svg" alt="Muted" width={20} height={20} />
            <span>{muteMessage || 'You are muted.'}</span>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-700/50 bg-black/40">
            <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 bg-slate-800/50 rounded-2xl p-1 border border-white/5 relative">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileSelect} />
              
              <div className="flex items-center gap-0.5 px-1 mb-1">
                <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-400 hover:text-primary transition-colors">
                      <FontAwesomeIcon icon={faSmile} className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-2xl" side="top" align="start">
                    <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} lazyLoadEmojis={true} searchDisabled={true} previewConfig={{ showPreview: false }} />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-400 hover:text-primary transition-colors">
                      <FontAwesomeIcon icon={faPaperclip} className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 mb-2 bg-slate-800 border-slate-700" side="top" align="start">
                    <div className="flex gap-2">
                       <Button variant="outline" size="sm" className="flex flex-col h-auto p-2 gap-1 border-slate-700" onClick={() => fileInputRef.current?.click()}>
                        <Image src="/images/upload.svg" alt="Upload" width={16} height={16} />
                        <span className="text-[9px]">Upload</span>
                      </Button>
                      <Button variant="outline" size="sm" className="flex flex-col h-auto p-2 gap-1 border-slate-700" onClick={() => setIsGiphySearchOpen(true)}>
                        <Image src="https://developers.giphy.com/branch/master/static/header-logo-0fec0225d189bc0eae27dac3e3770582.gif" alt="Giphy" width={16} height={16} />
                        <span className="text-[9px]">Giphy</span>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Message..."
                className="flex-1 min-w-0 resize-none border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-1.5 text-xs min-h-[32px] max-h-[80px] scrollbar-hide text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                rows={1}
                disabled={isBotTyping}
              />

              <div className="flex items-center gap-1 px-1 mb-1">
                {!newMessage.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7 rounded-full text-slate-400 hover:text-primary", isRecording && "text-red-500 bg-red-500/10")}
                    onClick={handleVoiceMessage}
                  >
                    <FontAwesomeIcon icon={isRecording ? faStop : faMicrophone} className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button type="submit" size="icon" className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isBotTyping}>
                    <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </form>
        </div>
      )}
      <GiphySearchDialog
        open={isGiphySearchOpen}
        onOpenChange={setIsGiphySearchOpen}
        onSelectGif={handleSelectGif}
      />
    </div>
  );
}
