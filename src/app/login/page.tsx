'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useUser, useAuth, useFirestore, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { doc, collection, getDocs, query, limit, getDoc, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { User, ThemeSettings } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const countries = [
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "GB", label: "United Kingdom" },
    { value: "AU", label: "Australia" },
    { value: "DE", label: "Germany" },
    { value: "FR", label: "France" },
    { value: "JP", label: "Japan" },
    { value: "BR", label: "Brazil" },
    { value: "IN", label: "India" },
    { value: "CN", label: "China" },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [guestUsername, setGuestUsername] = useState('');
  const [signInEmail, setSignInEmail] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>();
  const [country, setCountry] = useState<string>();
  const [processingAction, setProcessingAction] = useState<
    'signin' | 'signup' | 'guest' | null
  >(null);
  const [activeTab, setActiveTab] = useState('signin');
  const [settings, setSettings] = useState<ThemeSettings | null>(null);

  useEffect(() => {
      const fetchSettings = async () => {
          if (firestore) {
              const settingsRef = doc(firestore, 'app_settings', 'theme');
              const settingsSnap = await getDoc(settingsRef);
              if (settingsSnap.exists()) {
                  setSettings(settingsSnap.data() as ThemeSettings);
              }
          }
      };
      fetchSettings();
  }, [firestore]);


  // Clear form fields when switching tabs
  useEffect(() => {
    setSignInEmail('');
    setEmail('');
    setPassword('');
    setSignUpUsername('');
    setGender(undefined);
    setCountry(undefined);
  }, [activeTab]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/squares');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-slate-900">
        <p>Loading...</p>
      </div>
    );
  }

  const handleAuthError = (error: any, title: string) => {
    setProcessingAction(null);
    toast({
      variant: 'destructive',
      title: title,
      description: error.message || 'An unexpected error occurred.',
    });
  };

  const checkLoginRestrictions = async (userId: string): Promise<boolean> => {
    const userDocRef = doc(firestore, 'users', userId);
    try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userProfile = userDoc.data() as User;

            // Check for ban (permanent mute), but allow Owner to bypass
            if (userProfile.role !== 'Owner' && userProfile.mutedUntil && userProfile.mutedUntil.startsWith('9999')) {
                 toast({
                    variant: 'destructive',
                    title: 'Login Failed',
                    description: `Your account has been permanently banned.`,
                });
                await signOut(auth);
                return true;
            }
        }
    } catch (error) {
        console.error("Error checking login restrictions:", error);
    }
    return false;
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpUsername.trim() || !email.trim() || !password.trim() || !gender || !country) {
        handleAuthError({ message: 'Please fill out all required fields.' }, 'Sign Up Failed');
        return;
    }

    setProcessingAction('signup');
    try {
      // Check for username uniqueness
      const usersCollection = collection(firestore, 'users');
      const usernameQuery = query(usersCollection, where("lowercaseUsername", "==", signUpUsername.trim().toLowerCase()));
      const usernameSnapshot = await getDocs(usernameQuery);
      if (!usernameSnapshot.empty) {
        handleAuthError({ message: 'This username is already taken.' }, 'Sign Up Failed');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: signUpUsername });

      const usersCollectionRef = collection(firestore, 'users');
      const q = query(usersCollectionRef, limit(1));
      const querySnapshot = await getDocs(q);
      
      let role = settings?.defaultRole || 'User';
      if (querySnapshot.empty) {
        role = 'Owner';
      }

      const initialGold = settings?.initialGold || 0;
      const initialRubies = settings?.initialRubies || 0;
      const selectedCountry = countries.find(c => c.value === country);

      const newUser: Partial<User> = {
        id: userCredential.user.uid,
        displayName: signUpUsername,
        username: signUpUsername.trim(),
        lowercaseUsername: signUpUsername.trim().toLowerCase(),
        email: userCredential.user.email,
        avatarUrl: '',
        role: role,
        gender: gender,
        country: country,
        lastLoginLocation: selectedCountry?.label,
        level: 1,
        xp: 0,
        quizPoints: 0,
        createdAt: new Date().toISOString(),
        messageCount: 0,
        badges: [],
        gold: initialGold,
        rubies: initialRubies,
        about: '',
        isBot: false,
        // This is a placeholder. In a real application, you would generate
        // this hash on the server side from the user's IP for security.
        securityFingerprint: `placeholder_reg_${Date.now()}`
      };
      
      if (settings?.muteNewUsersDuration && settings.muteNewUsersDuration > 0) {
        const expires = new Date(Date.now() + settings.muteNewUsersDuration * 60 * 1000);
        newUser.mutedUntil = expires.toISOString();
      }

      const userRef = doc(firestore, 'users', userCredential.user.uid);
      setDocumentNonBlocking(userRef, newUser, {});

      // Send welcome DM from Superbot
      const privateMessagesCollection = collection(firestore, 'privateMessages');
      const welcomeMessageTemplate = settings?.welcomeMessage || `Welcome to Azurewave, {username}! I'm Superbot, your friendly guide. If you need a confidence boost or some smooth talk, check out **Gemma**, our Rizz Master! Have fun! 🎉`;
      const welcomeMessage = welcomeMessageTemplate.replace('{username}', signUpUsername);

      addDocumentNonBlocking(privateMessagesCollection, {
          senderId: 'superbot',
          receiverId: userCredential.user.uid,
          content: welcomeMessage,
          timestamp: new Date().toISOString(),
          read: false,
          participants: ['superbot', userCredential.user.uid].sort(),
      });

      toast({
        title: 'Account Created!',
        description: 'You have been successfully signed in.',
      });
      // No need to call router.push, onAuthStateChanged will handle it
    } catch (error) {
      handleAuthError(error, 'Sign Up Failed');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !password.trim()) return;

    setProcessingAction('signin');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, signInEmail, password);
      const isRestricted = await checkLoginRestrictions(userCredential.user.uid);
      if (isRestricted) {
          setProcessingAction(null);
          return;
      }
      // onAuthStateChanged and the useEffect will handle redirection.
    } catch (error) {
      handleAuthError({ message: "Invalid email or password." }, 'Sign In Failed');
    }
  };

  const handleGuestSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestUsername.trim()) return;

    setProcessingAction('guest');
    try {
      const userCredential = await signInAnonymously(auth);

      const isRestricted = await checkLoginRestrictions(userCredential.user.uid);
      if (isRestricted) {
          setProcessingAction(null);
          return;
      }

      const userRef = doc(firestore, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      const isNewUser = !userDoc.exists();

      const userData: Partial<User> = {
        id: userCredential.user.uid,
        displayName: guestUsername,
        username: guestUsername,
        lowercaseUsername: guestUsername.toLowerCase(),
        email: null,
        avatarUrl: '',
        role: 'Guest',
        isBot: false,
        securityFingerprint: `placeholder_guest_${Date.now()}`
      };

      if (isNewUser) {
        Object.assign(userData, {
          level: 1,
          xp: 0,
          quizPoints: 0,
          createdAt: new Date().toISOString(),
          messageCount: 0,
          badges: [],
          gold: 0,
          rubies: 0,
          about: '',
        });
      }
      
      setDocumentNonBlocking(userRef, userData, { merge: true });
      
      if (isNewUser) {
        // Send welcome DM from Superbot
        const privateMessagesCollection = collection(firestore, 'privateMessages');
        const welcomeMessage = `Welcome to Azurewave, ${guestUsername}! I'm Superbot, your friendly guide. If you need some smooth talk, go find **Gemma** in the member list! Have fun! 🎉`;
        addDocumentNonBlocking(privateMessagesCollection, {
            senderId: 'superbot',
            receiverId: userCredential.user.uid,
            content: welcomeMessage,
            timestamp: new Date().toISOString(),
            read: false,
            participants: ['superbot', userCredential.user.uid].sort(),
        });
      }


      toast({
        title: 'Joined as Guest!',
        description: `Welcome, ${guestUsername}!`,
      });
      // No need to call router.push, onAuthStateChanged will handle it
    } catch (error) {
      handleAuthError(error, 'Guest Sign In Failed');
    }
  };
  
  const registrationDisabled = settings?.disableRegistration === true;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 relative">
              <Image src="/logo.png" alt="Azurewave Logo" fill className="object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-black font-brand text-gray-800 dark:text-white uppercase tracking-tight">
            Azurewave
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {registrationDisabled ? 'Login to continue' : 'Sign in to start chatting'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-blue-50 dark:bg-gray-900/50 p-1 rounded-lg">
            <TabsTrigger
              value="signin"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-md rounded-[7px] text-gray-500 data-[state=active]:text-blue-500"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-md rounded-[7px] text-gray-500 data-[state=active]:text-blue-500"
              disabled={registrationDisabled}
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                  disabled={!!processingAction}
                  className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!!processingAction}
                  className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg"
                disabled={!!processingAction}
              >
                {processingAction === 'signin' ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup" className="mt-6">
            {registrationDisabled ? (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">Registration is currently disabled by the administrator.</p>
                </div>
            ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                    <Input
                    id="signup-username"
                    placeholder="Username"
                    value={signUpUsername}
                    onChange={(e) => setSignUpUsername(e.target.value)}
                    required
                    disabled={!!processingAction}
                    className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <Input
                    id="signup-email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={!!processingAction}
                    className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <Input
                    id="signup-password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!!processingAction}
                    className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</Label>
                    <RadioGroup
                        onValueChange={(value) => setGender(value as 'male' | 'female')}
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="male" id="male" disabled={!!processingAction}/>
                            <Label htmlFor="male" className="text-sm">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="female" id="female" disabled={!!processingAction}/>
                            <Label htmlFor="female" className="text-sm">Female</Label>
                        </div>
                    </RadioGroup>
                </div>

                    <div>
                        <Label htmlFor="country" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Country</Label>
                        <Select onValueChange={setCountry} disabled={!!processingAction}>
                            <SelectTrigger id="country" className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Select a country" />
                            </SelectTrigger>
                            <SelectContent>
                                {countries.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                <Button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 rounded-lg"
                    disabled={!!processingAction}
                >
                    {processingAction === 'signup'
                    ? 'Creating Account...'
                    : 'Create Account'}
                </Button>
                </form>
            )}
          </TabsContent>
        </Tabs>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
              Or continue as a guest
            </span>
          </div>
        </div>

        <form onSubmit={handleGuestSignIn} className="mt-6 space-y-4">
          <div>
            <Input
              id="guest-username"
              placeholder="Enter a guest username"
              value={guestUsername}
              onChange={(e) => setGuestUsername(e.target.value)}
              required
              disabled={!!processingAction}
              className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="w-full rounded-lg"
            disabled={!!processingAction}
          >
            {processingAction === 'guest' ? 'Joining...' : 'Join as Guest'}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          Secure & private chat experience
        </div>
      </div>
    </main>
  );
}
