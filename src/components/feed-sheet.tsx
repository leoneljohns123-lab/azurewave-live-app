

'use client';

import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { UserAvatar } from '@/components/user-avatar';
import type { Post, User, Comment } from '@/lib/types';
import { useFirestore, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { useState, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faPaperPlane, faTimes, faRss, faPlus, faEllipsisV, faTrash, faThumbtack } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { getEffectiveDisplayName } from '@/lib/user-helpers';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SidebarMenuButton, SidebarMenuItem } from './ui/sidebar';
import { useChat } from '@/context/chat-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from './ui/separator';

function CreatePost() {
  const { profile } = useEffectiveUserProfile();
  const { hasFeaturePermission } = useChat();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canCreatePost = hasFeaturePermission(profile, 'createPost');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (!content.trim() && !image)) return;
    setIsSubmitting(true);

    const postsCollection = collection(firestore, 'posts');
    await addDocumentNonBlocking(postsCollection, {
      authorId: profile.id,
      content: content.trim(),
      imageUrl: image,
      likes: [],
      loves: [],
      funnies: [],
      dislikes: [],
      likeCount: 0,
      loveCount: 0,
      funnyCount: 0,
      dislikeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    });

    toast({ title: 'Post created!'});
    setContent('');
    setImage(null);
    setIsSubmitting(false);
    setIsComposing(false);
  };
  
  if (!canCreatePost) {
    return null; // Don't show the create post UI if user doesn't have permission
  }

  if (!isComposing) {
    return (
      <div className="mb-4">
        <Button onClick={() => setIsComposing(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
          <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
    );
  }

  return (
    <Card className="bg-[#3a2269]/20 backdrop-blur-sm border-none text-white">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="resize-none bg-white/10 border-white/20 placeholder-purple-200/70"
            rows={3}
          />
          {image && (
            <div className="relative w-24 h-24">
              <Image src={image} alt="Preview" layout="fill" className="rounded-md object-cover" />
              <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setImage(null)}>
                <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex justify-between items-center">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <Button type="button" variant="ghost" className="text-purple-300 hover:text-white" onClick={() => fileInputRef.current?.click()}>
              <FontAwesomeIcon icon={faImage} className="mr-2" /> Photo
            </Button>
            <div className="flex items-center gap-2">
                 <Button type="button" variant="ghost" className="text-purple-300 hover:text-white" onClick={() => setIsComposing(false)}>
                    Cancel
                 </Button>
                <Button type="submit" disabled={isSubmitting || (!content.trim() && !image)} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <FontAwesomeIcon icon={faPaperPlane} className="mr-2" /> Post
                </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const reactions: { type: 'likes' | 'loves' | 'funnies' | 'dislikes', icon: string }[] = [
    { type: 'likes', icon: '/reaction/like.svg' },
    { type: 'loves', icon: '/reaction/love.svg' },
    { type: 'funnies', icon: '/reaction/funny.svg' },
    { type: 'dislikes', icon: '/reaction/dislike.svg' },
];

function PostCard({ post, author, onSelectPost, onDeletePost }: { post: Post | null; author: User | null; onSelectPost: (post: Post) => void; onDeletePost: (postId: string) => void }) {
  if (!post) {
    return (
      <Card className="bg-[#3a2269]/20 backdrop-blur-sm border-none">
        <CardHeader className="flex flex-row items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-4/5" />
        </CardContent>
      </Card>
    );
  }

  const { profile } = useEffectiveUserProfile();
  const { hasPermission, hasFeaturePermission } = useChat();
  const firestore = useFirestore();
  const { toast } = useToast();

  const canReact = hasFeaturePermission(profile, 'reactToPost');
  const canComment = hasFeaturePermission(profile, 'commentOnPost');

  const handleReaction = (reactionType: 'likes' | 'loves' | 'funnies' | 'dislikes') => {
    if (!canReact || !profile || !post) return;
    const postRef = doc(firestore, 'posts', post.id);

    const updates: { [key: string]: any } = {};
    let currentReactionType: string | null = null;

    for (const rType of reactions.map(r => r.type)) {
      if (((post as any)[rType] || []).includes(profile.id)) {
        currentReactionType = rType;
        break;
      }
    }

    if (currentReactionType) {
      updates[`${currentReactionType}`] = arrayRemove(profile.id);
      updates[`${currentReactionType}Count`] = increment(-1);
    }
    
    if (currentReactionType !== reactionType) {
      updates[`${reactionType}`] = arrayUnion(profile.id);
      updates[`${reactionType}Count`] = increment(1);
    }
    
    updateDocumentNonBlocking(postRef, updates);
  };
  
  if (!author) {
    return (
      <Card className="bg-[#3a2269]/20 backdrop-blur-sm border-none">
        <CardHeader className="flex flex-row items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-4/5" />
        </CardContent>
      </Card>
    );
  }

  const canDelete = (profile && post && profile.id === post.authorId) || hasPermission(profile, 'managePosts');
  const canPin = hasPermission(profile, 'pinPosts');
  const showMoreMenu = canDelete || canPin;

  const handlePinPost = () => {
    if (!post) return;
    const postRef = doc(firestore, 'posts', post.id);
    updateDocumentNonBlocking(postRef, { isPinned: !post.isPinned });
    toast({
      title: post.isPinned ? 'Post Unpinned' : 'Post Pinned',
    });
  };

  return (
    <Card className="bg-[#3a2269]/20 backdrop-blur-sm border-none text-white">
      <CardHeader className="flex flex-row items-center gap-4">
        <UserAvatar user={author} className="w-12 h-12" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {post.isPinned && <FontAwesomeIcon icon={faThumbtack} className="text-purple-300 h-3 w-3" />}
            <p className="font-semibold">{getEffectiveDisplayName(author)}</p>
          </div>
          <p className="text-sm text-purple-300/80">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>
         {showMoreMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-300/80">
                <FontAwesomeIcon icon={faEllipsisV} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1e0a37] border-purple-900 text-white">
              {canPin && (
                <DropdownMenuItem onClick={handlePinPost}>
                  <FontAwesomeIcon icon={faThumbtack} className="mr-2 h-4 w-4" />
                  {post.isPinned ? 'Unpin Post' : 'Pin Post'}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem onClick={() => onDeletePost(post.id)} className="text-red-400 focus:bg-red-500/20 focus:text-red-300">
                  <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" />
                  Delete Post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{post.content}</p>
        {post.imageUrl && (
          <div className="mt-4 relative aspect-video">
            <Image src={post.imageUrl} alt="Post image" layout="fill" className="rounded-md object-cover" />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="flex gap-1">
          {reactions.map(reaction => {
            const count = (post as any)[`${reaction.type}Count`] || 0;
            const isReacted = profile && ((post as any)[reaction.type] || []).includes(profile.id);
            return (
              <Button key={reaction.type} variant="ghost" size="sm" onClick={() => handleReaction(reaction.type)} className={cn('hover:bg-white/10 p-1 h-auto', isReacted && "bg-white/20")} disabled={!canReact}>
                <Image src={reaction.icon} alt={reaction.type} width={24} height={24} />
                <span className="ml-1.5 text-xs">{count}</span>
              </Button>
            )
          })}
        </div>
        <Button variant="ghost" size="sm" className="hover:bg-white/10 p-1 h-auto" onClick={() => onSelectPost(post)} disabled={!canComment}>
            <Image src="/reaction/comment.svg" alt="Comment" width={24} height={24} />
            <span className="ml-1.5 text-xs">{post.commentCount || 0}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}


function CommentItem({ comment, author }: { comment: Comment, author: User | null}) {
  if (!author) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <div className="flex gap-3">
      <UserAvatar user={author} className="w-10 h-10" />
      <div className="flex-1">
        <div className="bg-[#4a3a7f]/50 backdrop-blur-sm p-3 rounded-lg">
          <p className="font-semibold text-sm">{getEffectiveDisplayName(author)}</p>
          <p className="text-sm text-purple-100">{comment.content}</p>
        </div>
        <p className="text-xs text-purple-300 mt-1 ml-2">
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}

function PostDetailDialog({ post, author, open, onOpenChange }: { post: Post | null, author: User | null, open: boolean, onOpenChange: (open: boolean) => void}) {
  const { profile } = useEffectiveUserProfile();
  const { hasFeaturePermission } = useChat();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canComment = hasFeaturePermission(profile, 'commentOnPost');

  const postId = post?.id;

  const commentsQuery = useMemoFirebase(() => {
    if (!postId) return null;
    return query(collection(firestore, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'))
  }, [firestore, postId]);
  const { data: comments, isLoading: isLoadingComments } = useCollection<Comment>(commentsQuery);
  
  const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(user => [user.id, user]));
  }, [users]);
  
  const handleDeletePost = (postId: string) => {
    if (!firestore) return;
    const postRef = doc(firestore, 'posts', postId);
    deleteDocumentNonBlocking(postRef);
    toast({
        title: "Post Deleted",
    });
    onOpenChange(false);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !commentContent.trim() || !postId || !author || !post) return;
    
    setIsSubmitting(true);
    const postRef = doc(firestore, 'posts', postId);
    const commentsCollection = collection(postRef, 'comments');
    await addDocumentNonBlocking(commentsCollection, {
      postId: postId,
      authorId: profile.id,
      content: commentContent.trim(),
      createdAt: new Date().toISOString(),
    });
    
    await updateDocumentNonBlocking(postRef, {
      commentCount: increment(1),
    });

    if (author.id !== profile.id) {
        const notificationsCollection = collection(firestore, 'users', author.id, 'notifications');
        addDocumentNonBlocking(notificationsCollection, {
            userId: author.id,
            senderId: profile.id,
            text: `replied to your post: "${post.content.substring(0, 20)}..."`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'post_comment',
            context: { postId: post.id }
        });
    }

    setCommentContent('');
    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 bg-[#2e1550] text-white border-none">
        <ScrollArea className="max-h-[80vh]">
          <div className="p-6 space-y-6">
            {post && <PostCard post={post} author={author} onSelectPost={() => {}} onDeletePost={handleDeletePost} />}
            
            <Card className="bg-[#3a2269]/20 backdrop-blur-sm border-none">
                <CardHeader>
                    <h2 className="font-semibold">Comments</h2>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingComments || isLoadingUsers ? (
                    <p>Loading comments...</p>
                  ) : (
                    comments?.map(comment => (
                      <CommentItem key={comment.id} comment={comment} author={usersMap.get(comment.authorId) || null} />
                    ))
                  )}
                  {comments?.length === 0 && <p className="text-purple-300 text-sm">No comments yet.</p>}
                </CardContent>
                {canComment && (
                    <CardFooter>
                        <form onSubmit={handleCommentSubmit} className="flex gap-2 w-full">
                            <UserAvatar user={profile!} className="w-10 h-10" />
                            <Textarea 
                              value={commentContent}
                              onChange={(e) => setCommentContent(e.target.value)}
                              placeholder="Write a comment..."
                              className="flex-1 bg-white/10 border-white/20 placeholder-purple-200/70"
                              disabled={isSubmitting}
                            />
                            <Button type="submit" disabled={isSubmitting || !commentContent.trim()} className="bg-purple-600 hover:bg-purple-700">
                                Post
                            </Button>
                        </form>
                    </CardFooter>
                )}
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function FeedSheetContent({ onSelectPost }: { onSelectPost: (post: Post, author: User | null) => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const postsQuery = useMemoFirebase(() => query(collection(firestore, 'posts'), orderBy('createdAt', 'desc')), [firestore]);
  const { data: posts, isLoading: isLoadingPosts } = useCollection<Post>(postsQuery);
  
  const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(user => [user.id, user]));
  }, [users]);

  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts]);

  const handleDeletePost = (postId: string) => {
    if (!firestore) return;
    const postRef = doc(firestore, 'posts', postId);
    deleteDocumentNonBlocking(postRef);
    toast({
      title: "Post Deleted",
    });
  };
  
  const SadFaceIcon = () => (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-300/30">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
      <path d="M15.5 15.5C14.71 14.71 13.45 14 12 14C10.55 14 9.29 14.71 8.5 15.5" stroke="#2e1550" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M15.5 15.5C14.71 14.71 13.45 14 12 14C10.55 14 9.29 14.71 8.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="10" r="1" fill="currentColor"/>
      <circle cx="15" cy="10" r="1" fill="currentColor"/>
    </svg>
  );

  return (
    <>
      <SheetHeader className="p-4 border-b border-white/10">
        <SheetTitle className="text-xl font-bold text-white">Friends wall</SheetTitle>
      </SheetHeader>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <CreatePost />
          <Separator className="bg-white/10"/>
          {isLoadingPosts || isLoadingUsers ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => <PostCard key={i} post={null} author={null} onSelectPost={() => {}} onDeletePost={() => {}}/>)}
              </div>
          ) : sortedPosts && sortedPosts.length > 0 ? (
            sortedPosts.map(post => (
              <PostCard key={post.id} post={post} author={usersMap.get(post.authorId) || null} onSelectPost={(p) => onSelectPost(p, usersMap.get(p.authorId) || null)} onDeletePost={handleDeletePost} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center pt-24 text-center text-purple-300/80">
              <SadFaceIcon />
              <p className="mt-4 text-base font-medium">There are no posts to show</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}

export function FeedSheet() {
  const { isFeedOpen, setFeedOpen } = useChat();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postAuthor, setPostAuthor] = useState<User | null>(null);

  const handleSelectPost = (post: Post, author: User | null) => {
    setSelectedPost(post);
    setPostAuthor(author);
  };
  
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedPost(null);
      setPostAuthor(null);
    }
  }

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="Feed" onClick={() => setFeedOpen(true)}>
          <FontAwesomeIcon icon={faRss} />
          <span>Feed</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <Sheet open={isFeedOpen} onOpenChange={setFeedOpen}>
        <SheetContent className="w-[400px] sm:w-[400px] p-0 flex flex-col bg-[#2e1550] border-l-0 text-white">
          <FeedSheetContent onSelectPost={handleSelectPost} />
        </SheetContent>
      </Sheet>
      <PostDetailDialog post={selectedPost} author={postAuthor} open={!!selectedPost} onOpenChange={handleDialogClose} />
    </>
  );
}
