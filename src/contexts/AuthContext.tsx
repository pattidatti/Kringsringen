import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Lazy-initialize Firebase Auth on first use
let app: any = null;
let auth: Auth | null = null;

function getAuthInstance(): Auth {
  if (!auth) {
    if (!app) {
      app = initializeApp(firebaseConfig);
    }
    auth = getAuth(app);
  }
  return auth;
}

export interface AuthContextValue {
  /** Currently authenticated user (null if not logged in) */
  user: User | null;
  /** Sign in with Google popup */
  signIn: () => Promise<void>;
  /** Sign out current user */
  signOut: () => Promise<void>;
  /** Loading state during auth initialization */
  loading: boolean;
  /** Last error message (null if no error) */
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    try {
      const authInstance = getAuthInstance();
      const unsubscribe = onAuthStateChanged(
        authInstance,
        (user) => {
          setUser(user);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('[AuthContext] Auth state change error:', err);
          setError('Autentiseringsfeil. Vennligst prøv igjen.');
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('[AuthContext] Failed to initialize auth:', err);
      setError('Kunne ikke initialisere autentisering.');
      setLoading(false);
      return () => {};
    }
  }, []);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const authInstance = getAuthInstance();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(authInstance, provider);
      // User state will be updated by onAuthStateChanged listener
    } catch (err: any) {
      console.error('[AuthContext] Sign-in failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Innlogging avbrutt.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Nettverksfeil. Sjekk internettforbindelsen din.');
      } else {
        setError('Kunne ikke logge inn. Prøv igjen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      const authInstance = getAuthInstance();
      await firebaseSignOut(authInstance);
      // User state will be updated by onAuthStateChanged listener
    } catch (err) {
      console.error('[AuthContext] Sign-out failed:', err);
      setError('Kunne ikke logge ut. Prøv igjen.');
    }
  };

  const value: AuthContextValue = {
    user,
    signIn,
    signOut,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
