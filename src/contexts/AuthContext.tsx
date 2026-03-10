import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getApps, getApp, initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
let auth: Auth | null = null;

function getAuthInstance(): Auth {
  if (!auth) {
    const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export interface AuthContextValue {
  /** Currently authenticated user (null if not logged in) */
  user: User | null;
  /** Sign in with Google popup */
  signIn: () => Promise<void>;
  /** Sign in with email and password */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Sign up with email and password */
  signUpWithEmail: (email: string, password: string) => Promise<void>;
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
    let unsubscribe: () => void = () => {};

    const initAuth = async () => {
      try {
        const authInstance = getAuthInstance();

        unsubscribe = onAuthStateChanged(
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
      } catch (err) {
        console.error('[AuthContext] Failed to initialize auth:', err);
        setError('Kunne ikke initialisere autentisering.');
        setLoading(false);
      }
    };

    initAuth();
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setError(null);
    try {
      const authInstance = getAuthInstance();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(authInstance, provider, browserPopupRedirectResolver);
      // onAuthStateChanged fires automatically — no manual state update needed
    } catch (err: any) {
      console.error('[AuthContext] Sign-in popup failed:', err.code, err);
      // Don't show error if user simply closed the popup themselves
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError('Kunne ikke starte innlogging. Prøv igjen.');
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const authInstance = getAuthInstance();
      await signInWithEmailAndPassword(authInstance, email, password);
      // User state will be updated by onAuthStateChanged listener
    } catch (err: any) {
      console.error('[AuthContext] Email sign-in failed:', err);
      if (err.code === 'auth/user-not-found') {
        setError('Bruker ikke funnet.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Feil passord.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Ugyldig e-postadresse.');
      } else if (err.code === 'auth/user-disabled') {
        setError('Kontoen er deaktivert.');
      } else {
        setError('Kunne ikke logge inn. Prøv igjen.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const authInstance = getAuthInstance();
      await createUserWithEmailAndPassword(authInstance, email, password);
      // User state will be updated by onAuthStateChanged listener
    } catch (err: any) {
      console.error('[AuthContext] Email sign-up failed:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('E-postadressen er allerede i bruk.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Ugyldig e-postadresse.');
      } else if (err.code === 'auth/weak-password') {
        setError('Passordet er for svakt (minimum 6 tegn).');
      } else {
        setError('Kunne ikke opprette konto. Prøv igjen.');
      }
      throw err;
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
    signInWithEmail,
    signUpWithEmail,
    signOut,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
