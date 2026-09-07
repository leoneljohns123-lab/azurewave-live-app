
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Square, UserSquare, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faMessage, faBolt, faShieldAlt, faUsers, faPlay, faArrowRight, faCheckCircle, faGlobe, faLock, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

declare global {
  interface Window {
    ScrollReveal?: any;
  }
}

function LiveChatPreviewContent() {
    const mockUsers: User[] = [
        { id: 'user1', displayName: 'Alex', avatarUrl: 'https://picsum.photos/seed/user1/100/100', email: null, username: 'Alex' },
        { id: 'user2', displayName: 'Maria', avatarUrl: 'https://picsum.photos/seed/user2/100/100', email: null, username: 'Maria' },
        { id: 'user3', displayName: 'Chris', avatarUrl: 'https://picsum.photos/seed/user3/100/100', email: null, username: 'Chris' },
    ];

    const mockMessages = [
        { id: 1, senderId: 'user1', content: "Hey everyone! Check out this cool photo from my trip 🏞️" },
        { id: 2, senderId: 'user1', imageUrl: 'https://picsum.photos/seed/trip/400/300' },
        { id: 3, senderId: 'user2', quote: { senderName: 'Alex', content: 'Shared an image' }, content: "Wow, that looks amazing! Where was that taken?" },
        { id: 4, senderId: 'user3', content: "Sounds great! 🎶" },
    ];
    
    const getUserById = (id: string) => mockUsers.find(u => u.id === id);

    return (
        <div className="mt-4 flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden relative border border-white/20">
                        <Image src={'https://picsum.photos/seed/travel/100/100'} alt="Travel Talk" fill className="object-cover" data-ai-hint="travel landscape" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white">Travel Talk</div>
                        <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Public Square</div>
                    </div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-green-400 uppercase">Live</span>
                </div>
            </div>

            <div className="mt-5 space-y-4 h-64 overflow-y-auto pr-2 custom-scrollbar">
                {mockMessages.map((message) => {
                    const sender = getUserById(message.senderId);
                    if (!sender) return null;
                    
                    const isCurrentUserMock = sender.id === 'user2';

                    return (
                        <div key={message.id} className={cn("flex gap-3 items-start", isCurrentUserMock && "flex-row-reverse")}>
                            <UserAvatar user={sender} className="w-8 h-8 flex-shrink-0" />
                             <div className={cn(
                                 "rounded-2xl px-3 py-2 text-sm max-w-[80%] shadow-lg transition-all duration-300",
                                 isCurrentUserMock 
                                 ? "bg-blue-600 text-white rounded-tr-none"
                                 : "bg-white/10 backdrop-blur-md text-slate-200 border border-white/5 rounded-tl-none"
                             )}>
                                {!isCurrentUserMock && <p className="font-bold text-[10px] mb-1 text-primary/80">{sender.displayName}</p>}
                                {message.imageUrl ? (
                                    <div className="relative aspect-video w-full min-w-[180px] rounded-lg overflow-hidden mt-1 mb-1">
                                        <Image src={message.imageUrl} alt="Shared" fill className="object-cover" />
                                    </div>
                                ) : (
                                    <p className="text-xs leading-relaxed">{message.content}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function LiveCallPreview() {
    const mockCallUsers = [
        { id: 'user1', displayName: 'Alex', avatarUrl: 'https://picsum.photos/seed/user1/100/100' },
        { id: 'user2', displayName: 'Maria', avatarUrl: 'https://picsum.photos/seed/user2/100/100' },
        { id: 'user3', displayName: 'Chris', avatarUrl: 'https://picsum.photos/seed/user3/100/100' },
        { id: 'user4', displayName: 'You', avatarUrl: 'https://picsum.photos/seed/you/100/100' },
    ];
    
    return (
        <div className="mt-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider">Conference Room</h3>
                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-full border border-green-400/20">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </div>
                    4 ACTIVE
                 </div>
            </div>

            <div className="grid grid-cols-2 gap-3 h-64 overflow-hidden">
                {mockCallUsers.map(user => (
                    <div key={user.id} className="relative aspect-video bg-black/40 rounded-xl overflow-hidden group border border-white/5">
                        <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover transition-transform duration-500 group-hover:scale-110 opacity-80"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        <div className="absolute bottom-2 left-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                            <span className="text-[10px] font-bold text-white uppercase">{user.displayName}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function FeaturePreview() {
    return (
        <div className="relative bg-[#0f172a]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 p-8 transform rotate-1 hover:rotate-0 transition-transform duration-700">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
            
            <Tabs defaultValue="chat" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1 rounded-2xl mb-6">
                    <TabsTrigger value="chat" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                        <FontAwesomeIcon icon={faMessage} className="mr-2 h-3.5 w-3.5" />
                        Chat UI
                    </TabsTrigger>
                    <TabsTrigger value="call" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                        <FontAwesomeIcon icon={faVideo} className="mr-2 h-3.5 w-3.5" />
                        Video
                    </TabsTrigger>
                </TabsList>
                <div className="min-h-[280px]">
                    <TabsContent value="chat" className="m-0 focus-visible:outline-none">
                        <LiveChatPreviewContent />
                    </TabsContent>
                    <TabsContent value="call" className="m-0 focus-visible:outline-none">
                        <LiveCallPreview />
                    </TabsContent>
                </div>
            </Tabs>

            <div className="mt-8 flex gap-3">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center justify-between group cursor-text">
                    <span>Message #General...</span>
                    <FontAwesomeIcon icon={faBolt} className="text-yellow-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                <Link href="/login" className="bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95">
                    <FontAwesomeIcon icon={faPaperPlane} />
                </Link>
            </div>
        </div>
    )
}

export default function LandingPage() {
  const firestore = useFirestore();

  const squaresCollectionRef = useMemoFirebase(() => collection(firestore, 'squares'), [firestore]);
  const { data: squares, isLoading: isLoadingSquares } = useCollection<Square>(squaresCollectionRef);

  const userSquaresCollectionRef = useMemoFirebase(() => collection(firestore, 'userSquares'), [firestore]);
  const { data: userSquares, isLoading: isLoadingUserSquares } = useCollection<UserSquare>(userSquaresCollectionRef);

  const [popularSquares, setPopularSquares] = useState<Square[]>([]);

  useEffect(() => {
    if (!squares) return;

    const squareUserCounts: { [squareId: string]: number } = {};
    if (userSquares) {
        for (const userSquare of userSquares) {
            squareUserCounts[userSquare.squareId] = (squareUserCounts[userSquare.squareId] || 0) + 1;
        }
    }

    const sorted = [...squares]
        .map(s => ({ ...s, online: squareUserCounts[s.id] || 0 }))
        .sort((a, b) => (b as any).online - (a as any).online);
        
    setPopularSquares(sorted.slice(0, 5));
  }, [squares, userSquares]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ScrollReveal) {
      const sr = (window as any).ScrollReveal();
      sr.reveal('.reveal', { 
        origin: 'bottom',
        distance: '40px',
        duration: 1000,
        delay: 200,
        easing: 'cubic-bezier(0.5, 0, 0, 1)',
        interval: 100
      });
    }
  }, []);

  const totalOnline = userSquares?.length || 0;
  const isLoading = isLoadingSquares || isLoadingUserSquares;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-emerald-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[50%] h-[50%] bg-purple-600/5 rounded-full blur-[150px]"></div>
      </div>
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 relative group-hover:rotate-6 transition-transform">
                <Image src="/logo.png" alt="Azurewave" fill className="object-contain" />
            </div>
            <span className="text-2xl font-black font-brand tracking-tight text-white uppercase">Azurewave</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#squares" className="hover:text-white transition-colors">Squares</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-bold text-slate-400 hover:text-white">Sign In</Link>
            <Link href="/login" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-2xl text-sm font-bold shadow-xl shadow-blue-600/20 transition-all hover:scale-105">
                Join Now
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-40 pb-20 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <Badge variant="outline" className="mb-6 py-1 px-4 border-blue-500/30 bg-blue-500/5 text-blue-400 rounded-full font-bold tracking-wide uppercase text-[10px]">
                The Future of Social Chat
              </Badge>
              <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter text-white mb-8">
                Where every <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">square</span> tells a story.
              </h1>
              <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-xl mb-10">
                Join themed Squares, connect with real people, and chat in real-time. No gatekeeping, just pure conversation in a modern, secure environment.
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <Link href="/login" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-[2rem] font-bold shadow-2xl shadow-blue-600/30 transition-all hover:scale-105 flex items-center gap-3">
                  Start Chatting <FontAwesomeIcon icon={faArrowRight} />
                </Link>
                <a href="#squares" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-[2rem] font-bold transition-all backdrop-blur-md">
                  Explore Squares
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 border-t border-white/5 pt-10">
                <div>
                  <div className="text-2xl font-black text-white">{isLoading ? '...' : totalOnline.toLocaleString()}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Users Online</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{isLoading ? '...' : (squares?.length || 0).toLocaleString()}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Active Squares</div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-2xl font-black text-white">24/7</div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Live Moderation</div>
                </div>
              </div>
            </div>

            <div className="reveal">
              <FeaturePreview />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 reveal">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-6">Built for Connection</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">Fast, secure, and community-driven. Azurewave brings people together in focused, interactive spaces.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: faMessage, title: "Public Squares", desc: "Jump into themed conversations. No invites, no friction, just talk.", color: "bg-blue-500" },
                { icon: faBolt, title: "Instant Sync", desc: "Blazing fast real-time messaging with ultra-low latency.", color: "bg-yellow-500" },
                { icon: faShieldAlt, title: "Smart Safety", desc: "AI-driven and human-led moderation to keep things respectful.", color: "bg-emerald-500" },
                { icon: faUsers, title: "Community First", desc: "Suggest and vote on new Squares. Shape the platform you use.", color: "bg-purple-500" }
              ].map((f, i) => (
                <div key={i} className="reveal group p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-500">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg", f.color)}>
                    <FontAwesomeIcon icon={f.icon} className="text-white text-lg" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Squares Section */}
        <section id="squares" className="py-24 px-6 bg-slate-900/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 reveal">
              <div>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Trending Squares</h2>
                <p className="text-slate-400">Join the most active communities on the platform right now.</p>
              </div>
              <Link href="/login" className="text-blue-400 font-bold hover:text-blue-300 flex items-center gap-2 group transition-all">
                View all Squares <FontAwesomeIcon icon={faArrowRight} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="h-80 rounded-[2rem] bg-white/5 animate-pulse" />
                ))
              ) : popularSquares.map((s) => (
                <div key={s.id} className="reveal group relative h-96 rounded-[2rem] overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-500 hover:-translate-y-2 shadow-2xl">
                  <Image 
                    src={s.avatarUrl || `https://picsum.photos/seed/${s.id}/400/600`} 
                    alt={s.name} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                  
                  <div className="absolute top-4 right-4 flex gap-2">
                    {s.type === 'private' && (
                        <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-orange-400 border border-white/10">
                            <FontAwesomeIcon icon={faLock} className="text-xs" />
                        </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-black text-xl text-white truncate">{s.name}</h3>
                        {s.isVerified && <Image src="/images/verified.gif" alt="V" width={16} height={16} />}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 mb-4 h-8">{s.description}</p>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full border border-blue-400/20">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                            </span>
                            {(s as any).online || 0} ONLINE
                        </div>
                        <Link href={`/login`} className="bg-white text-black px-4 py-1.5 rounded-full text-[10px] font-black hover:bg-blue-500 hover:text-white transition-colors">
                            JOIN
                        </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section id="how" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="reveal">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-8">Start Chatting in <span className="text-blue-500">Seconds</span>.</h2>
                <p className="text-slate-400 text-lg mb-12">We've removed all the friction. No lengthy signups, no heavy apps. Just pure conversation.</p>
                
                <div className="space-y-10">
                  {[
                    { step: "01", title: "Choose your Square", desc: "Browse through hundreds of themed rooms or create your own." },
                    { step: "02", title: "Set a Nickname", desc: "Enter as a guest or sign up to save your progress and level up." },
                    { step: "03", title: "Join the Talk", desc: "Interact with live messages, reactions, and even video calls." }
                  ].map((s, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="text-4xl font-black text-white/10">{s.step}</div>
                      <div>
                        <h4 className="text-xl font-bold text-white mb-2">{s.title}</h4>
                        <p className="text-slate-400">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="reveal relative">
                <div className="absolute inset-0 bg-blue-600/20 rounded-[3rem] blur-[80px]"></div>
                <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Setup Tutorial</div>
                    </div>
                    <div className="space-y-6">
                        <div className="h-12 w-full bg-white/5 rounded-2xl border border-white/10 flex items-center px-4">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 animate-pulse"></div>
                            <div className="h-2 w-32 bg-white/10 rounded-full"></div>
                        </div>
                        <div className="h-12 w-2/3 bg-white/5 rounded-2xl border border-white/10 flex items-center px-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3"></div>
                            <div className="h-2 w-24 bg-white/10 rounded-full"></div>
                        </div>
                        <div className="h-32 w-full bg-blue-600/10 rounded-[2rem] border border-blue-500/20 flex flex-col items-center justify-center text-center p-6">
                            <FontAwesomeIcon icon={faCheckCircle} className="text-blue-400 text-3xl mb-3" />
                            <div className="text-sm font-bold text-white">System Optimized</div>
                            <div className="text-[10px] text-blue-400/70 mt-1 uppercase font-bold tracking-tighter">Ready for deployment</div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="py-24 px-6 bg-slate-900/20">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-8 md:p-16 relative overflow-hidden reveal">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
              
              <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Security built in, not bolted on.</h2>
                  <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                    We've designed Azurewave with your safety as our top priority. Our multi-layered moderation system ensures a healthy environment for everyone.
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    {[
                      { title: "24/7 Moderation", desc: "Proactive automated filters combined with dedicated human staff." },
                      { title: "Data Privacy", desc: "Your data is encrypted and never sold. You control your footprint." },
                      { title: "Anti-Abuse", desc: "Advanced rate-limiting and bot detection to prevent spam." },
                      { title: "Report Tools", desc: "Easy-to-use tools for reporting and blocking bad actors." }
                    ].map((s, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                        <h4 className="font-bold text-white mb-2">{s.title}</h4>
                        <p className="text-xs text-blue-100/70">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden lg:flex justify-center">
                    <div className="w-64 h-64 bg-white/10 rounded-full border-8 border-white/5 flex items-center justify-center shadow-inner relative animate-float">
                        <FontAwesomeIcon icon={faShieldAlt} className="text-white text-8xl drop-shadow-2xl" />
                        <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-ping-slow"></div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 px-6 text-center reveal">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-10">Ready to join the <span className="text-blue-500">Square</span>?</h2>
            <p className="text-xl text-slate-400 mb-12 max-w-xl mx-auto">Experience the next generation of social chat. No apps, no limits, just conversation.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-[2.5rem] font-black text-lg shadow-2xl shadow-blue-600/40 transition-all hover:scale-105 active:scale-95">
                    Launch Chat App
                </Link>
                <Link href="/login" className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-12 py-5 rounded-[2.5rem] font-black text-lg transition-all">
                    Register Account
                </Link>
            </div>
            <p className="mt-8 text-sm text-slate-500 font-bold uppercase tracking-widest">Free to join • Join as Guest • No Download</p>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 border-t border-white/5 py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
                <div className="w-6 h-6 relative">
                    <Image src="/logo.png" alt="Azurewave" fill className="object-contain" />
                </div>
                <span className="text-lg font-black font-brand tracking-tight text-white uppercase">Azurewave</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              Redefining public chat for the modern era. Join themed squares, connect with people, and talk freely in a secure environment.
            </p>
            <div className="flex gap-4">
                {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-blue-600 transition-colors cursor-pointer flex items-center justify-center">
                        <FontAwesomeIcon icon={faGlobe} className="text-xs" />
                    </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Product</h4>
            <ul className="space-y-4 text-sm text-slate-500 font-medium">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Squares Explorer</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Leaderboards</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">API Docs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Company</h4>
            <ul className="space-y-4 text-sm text-slate-500 font-medium">
              <li><a href="#" className="hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Our Blog</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Legal</h4>
            <ul className="space-y-4 text-sm text-slate-500 font-medium">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Community Rules</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">GDPR</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">© 2026 Azurewave. All rights reserved.</p>
          <div className="flex gap-8 text-xs text-slate-600 font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">System Status</a>
            <a href="#" className="hover:text-white transition-colors">English (US)</a>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
