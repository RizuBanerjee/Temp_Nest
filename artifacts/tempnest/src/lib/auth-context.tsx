import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth } from "./firebase";

type AuthState = {
  user: FirebaseUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoaded(true);
    });
    return unsubscribe;
  }, []);

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    },
    [],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name?: string) => {
      const result = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password,
      );
      if (name && result.user) {
        await updateProfile(result.user, { displayName: name });
        await result.user.reload();
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(firebaseAuth, provider);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(firebaseAuth);
  }, []);

  const value: AuthState = {
    user,
    isLoaded,
    isSignedIn: !!user,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOutUser,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
