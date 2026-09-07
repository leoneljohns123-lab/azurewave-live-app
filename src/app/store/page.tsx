
'use client';

import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCoins } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import { storeItems, storeCategories, type StoreItem, type StoreCategory } from '@/lib/store-items';
import { useState, useMemo, useEffect } from 'react';
import { useChat } from '@/context/chat-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, increment, arrayUnion } from 'firebase/firestore';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffectiveUserProfile } from '@/hooks/use-effective-user-profile';
import { ScrollArea } from '@/components/ui/scroll-area';


const StoreItemCard = ({ item, onPurchase, isPurchased }: { item: StoreItem, onPurchase: (item: StoreItem) => void, isPurchased: boolean }) => {
    return (
        <Card className="bg-card hover:bg-accent transition-colors flex flex-col">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center flex-1">
                {typeof item.icon === 'string' ? (
                    <Image src={item.icon} alt={item.name} width={40} height={40} className="h-10 w-10 mb-3" />
                ) : (
                    <FontAwesomeIcon icon={item.icon} className={`h-10 w-10 mb-3 ${item.iconColor}`} />
                )}
                <h3 className="font-bold text-base">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex-1">{item.description}</p>
            </CardContent>
            <div className="p-3 border-t">
                <Button className="w-full" onClick={() => onPurchase(item)} disabled={isPurchased}>
                    {isPurchased ? 'Owned' : item.price === 0 ? 'Get' : (
                        <span className="flex items-center gap-2">
                           {item.currency === 'gold' ? (
                               <FontAwesomeIcon icon={faCoins} className="text-yellow-300" />
                           ) : (
                                <Image src="/interface_icons/ruby.svg" alt="Ruby" width={16} height={16} />
                           )}
                           {item.price.toLocaleString()}
                        </span>
                    )}
                </Button>
            </div>
        </Card>
    )
}

function StorePageContent() {
  const { profile: currentUser, isLoading } = useEffectiveUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== 'Owner')) {
        router.replace('/squares');
    }
  }, [currentUser, isLoading, router]);

  const { updateCurrentUser, addXp } = useChat();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<StoreCategory | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToConfirm, setItemToConfirm] = useState<StoreItem | null>(null);

  const featuredItems = useMemo(() => storeItems.filter(item => item.tags?.includes('HOT') || item.tags?.includes('NEW')), []);

  const filteredItems = useMemo(() => {
    let items = storeItems;
    if (activeTab !== 'All') {
        items = items.filter(item => item.category === activeTab);
    }
    if (searchTerm) {
        items = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return items;
  }, [activeTab, searchTerm]);

  const handlePurchase = (item: StoreItem) => {
    if (!currentUser) return;

    if (item.tags?.includes('ONE-TIME') && currentUser.purchasedItems?.includes(item.id)) {
        toast({
            variant: 'destructive',
            title: 'Already Purchased',
            description: 'You can only claim this item once.',
        });
        return;
    }
    
    if (item.id === 'addon-paint' && currentUser.drawingCanvasEnabled) {
        toast({
            variant: 'destructive',
            title: 'Already Owned',
            description: 'You already have the Paint It! feature.',
        });
        return;
    }

    const balance = item.currency === 'gold' ? (currentUser.gold || 0) : (currentUser.rubies || 0);

    if (item.price > balance) {
        toast({
            variant: 'destructive',
            title: `Insufficient ${item.currency}`,
            description: `You need ${item.price.toLocaleString()} ${item.currency} to get this item.`,
        });
        return;
    }
    setItemToConfirm(item);
  };
  
  const confirmPurchase = () => {
    if (!itemToConfirm || !currentUser || !firestore) return;

    const { id, price, currency } = itemToConfirm;
    
    // Re-check balance before processing
    const currentGold = currentUser.gold || 0;
    const currentRubies = currentUser.rubies || 0;
    const balance = currency === 'gold' ? currentGold : currentRubies;
    if (price > balance) {
        toast({ variant: 'destructive', title: `Insufficient ${currency}` });
        setItemToConfirm(null);
        return;
    }

    const userRef = doc(firestore, 'users', currentUser.id);
    const updates: { [key: string]: any } = {};

    if (price > 0) {
        if (currency === 'gold') {
            updates.gold = increment(-price);
            updates.goldSpent = increment(price);
        } else {
            updates.rubies = increment(-price);
            updates.rubiesSpent = increment(price);
        }
    }

    switch (id) {
        case 'currency-gold-1':
            updates.gold = increment(1000);
            break;
        case 'currency-gold-2':
            updates.gold = increment(5000);
            break;
        case 'currency-ruby-1':
            updates.rubies = increment(10);
            break;
        case 'addon-paint':
            updates.drawingCanvasEnabled = true;
            break;
    }
    
    if (itemToConfirm.tags?.includes('ONE-TIME')) {
        updates.purchasedItems = arrayUnion(id);
    }
    
    updateDocumentNonBlocking(userRef, updates);
    
    if (price > 0) {
        addXp(price * 0.1);
    }
    
    toast({
        title: 'Purchase Successful!',
        description: `You got ${itemToConfirm.name}.`,
    });
    
    setItemToConfirm(null);
  };

  if (isLoading || !currentUser || currentUser.role !== 'Owner') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  
  const isPurchased = (item: StoreItem) => {
    if (item.id === 'addon-paint') {
      return currentUser.drawingCanvasEnabled ?? false;
    }
    if (item.tags?.includes('ONE-TIME')) {
      return currentUser.purchasedItems?.includes(item.id) ?? false;
    }
    return false;
  };

  return (
    <>
    <div className="flex-1 flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h1 className="text-2xl font-bold self-start sm:self-center">ChatStore</h1>
          <div className="relative w-full sm:flex-1 sm:max-w-sm">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search..."
              className="w-full rounded-full bg-muted pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
        <section>
          <h2 className="text-xl font-bold mb-4">Featured</h2>
          <Carousel
            opts={{ align: 'start', }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {featuredItems.map((item, index) => (
                <CarouselItem key={index} className="basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 pl-2 md:pl-4">
                  <div className="p-1">
                    <Card className={cn(
                        "relative overflow-hidden rounded-2xl border-none text-white transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl",
                        item.iconColor ? `hover:shadow-[${item.iconColor.replace('text-', '')}]/20` : 'hover:shadow-primary/20'
                    )}>
                      <div className="absolute inset-0 bg-gradient-to-br from-card/80 to-card/50"></div>
                      <CardContent className="relative flex flex-col items-start justify-between p-4 sm:p-6 aspect-[16/9]">
                        <div>
                           {item.tags && item.tags.length > 0 && (
                            <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {item.tags[0]}
                           </div>
                           )}
                           {typeof item.icon === 'string' ? (
                                <Image src={item.icon} alt={item.name} width={48} height={48} className="h-12 w-12 mb-4 opacity-50" />
                           ) : (
                               <FontAwesomeIcon icon={item.icon} className={`h-12 w-12 opacity-50 mb-4 ${item.iconColor}`} />
                           )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{item.name}</h3>
                          <p className="text-sm opacity-80">{item.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </section>

        <section>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                 <TabsList className="flex flex-wrap h-auto justify-start bg-transparent p-0 gap-2">
                    <TabsTrigger value="All" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
                    {storeCategories.map(cat => (
                        <TabsTrigger key={cat.name} value={cat.name} className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{cat.name}</TabsTrigger>
                    ))}
                </TabsList>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                    {filteredItems.map(item => (
                        <StoreItemCard key={item.id} item={item} onPurchase={handlePurchase} isPurchased={isPurchased(item)} />
                    ))}
                </div>
                {filteredItems.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No items found.</p>
                    </div>
                )}
            </Tabs>
        </section>
      </main>
    </div>
    {itemToConfirm && (
        <AlertDialog open={!!itemToConfirm} onOpenChange={() => setItemToConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to get "{itemToConfirm.name}" for {itemToConfirm.price.toLocaleString()} {itemToConfirm.currency}?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmPurchase}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}

export default function StorePage({ soundState, setSoundState }: any) {
  return (
    <AppLayout 
        soundState={soundState}
        setSoundState={setSoundState}
    >
      <StorePageContent />
    </AppLayout>
  );
}
