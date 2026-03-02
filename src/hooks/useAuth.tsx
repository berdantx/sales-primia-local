// Authentication context and hooks
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to log access events (non-blocking)
const logAccessEvent = async (
  eventType: 'login_success' | 'login_failed' | 'logout' | 'password_changed',
  email: string,
  userId?: string,
  metadata?: Record<string, unknown>
) => {
  try {
    await supabase.functions.invoke('log-access', {
      body: {
        event_type: eventType,
        email,
        user_id: userId,
        metadata,
      },
    });
  } catch (error) {
    console.error('Failed to log access event:', error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Fail-safe: avoid infinite loading screen if auth handshake stalls
    const loadingTimeout = window.setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 4000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        window.clearTimeout(loadingTimeout);
      }
    );

    // THEN check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        window.clearTimeout(loadingTimeout);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
        window.clearTimeout(loadingTimeout);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Log the event (non-blocking)
    logAccessEvent(
      error ? 'login_failed' : 'login_success',
      email,
      data?.user?.id,
      error ? { error_message: error.message } : undefined
    );

    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    const currentEmail = user?.email;
    const currentUserId = user?.id;
    
    await supabase.auth.signOut();
    
    // Log the event (non-blocking)
    if (currentEmail) {
      logAccessEvent('logout', currentEmail, currentUserId);
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    // Log the event (non-blocking)
    if (!error && user?.email) {
      logAccessEvent('password_changed', user.email, user.id);
    }

    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, updatePassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
