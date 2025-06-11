import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { config } from '@/lib/config';
import { Logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const logger = Logger.createScoped('AuthContext');

  useEffect(() => {
    // Initialize Supabase client if configured
    if (config.api.supabase.url && config.api.supabase.anonKey) {
      const client = createClient(
        config.api.supabase.url,
        config.api.supabase.anonKey
      );
      setSupabase(client);

      // Get initial session
      client.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange(async (event, session) => {
        logger.info('Auth state changed', { event });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // No Supabase configured
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Authentication not configured');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Sign in failed', error);
      throw error;
    }

    logger.info('User signed in', { userId: data.user?.id });
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    if (!supabase) {
      throw new Error('Authentication not configured');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      logger.error('Sign up failed', error);
      throw error;
    }

    logger.info('User signed up', { userId: data.user?.id });
  };

  const signOut = async () => {
    if (!supabase) {
      throw new Error('Authentication not configured');
    }

    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error('Sign out failed', error);
      throw error;
    }

    logger.info('User signed out');
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    if (!supabase) {
      throw new Error('Authentication not configured');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      logger.error('OAuth sign in failed', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase) {
      throw new Error('Authentication not configured');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      logger.error('Password reset failed', error);
      throw error;
    }

    logger.info('Password reset email sent', { email });
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 