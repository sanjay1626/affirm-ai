import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const checkOnboarding = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('onboarding_answers')
      .select('onboarding_done')
      .eq('user_id', userId)
      .maybeSingle(); // maybeSingle returns null (not 406) when no row exists
    setHasCompletedOnboarding(data?.onboarding_done === true);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Load existing session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        if (session?.user) {
          checkOnboarding(session.user.id).finally(() => {
            if (mounted) setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        // Never leave the app stuck on the loading screen.
        if (mounted) setIsLoading(false);
      });

    // Listen for auth state changes.
    // IMPORTANT: supabase-js holds an auth lock while this callback runs.
    // Awaiting another supabase call here (e.g. a DB query) deadlocks on web,
    // so we defer that work with setTimeout(0) to let the lock release first.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        if (session?.user) {
          const userId = session.user.id;
          setTimeout(() => { if (mounted) checkOnboarding(userId); }, 0);
        } else {
          setHasCompletedOnboarding(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkOnboarding]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshOnboardingStatus = async () => {
    if (session?.user) {
      await checkOnboarding(session.user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        hasCompletedOnboarding,
        signIn,
        signUp,
        signOut,
        refreshOnboardingStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
