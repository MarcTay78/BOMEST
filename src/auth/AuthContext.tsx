import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { dataStore } from '../data';
import type { Session } from '../lib/types';

interface AuthState {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataStore.getSession().then((s) => {
      setSession(s);
      setLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const s = await dataStore.signIn(email, password);
    setSession(s);
  };

  const signOut = async () => {
    await dataStore.signOut();
    setSession(null);
  };

  return <AuthContext.Provider value={{ session, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useIsAdmin() {
  return useAuth().session?.role === 'admin';
}
