import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService, AuthService } from '../services/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  subscription_tier: string;
  query_count: number;
  query_limit: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
  preferences: Record<string, any>;
  user_usage_summary?: {
    total_queries: number;
    llm_queries: number;
    period_start: string;
    period_end: string;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error?: any }>;
  signInWithProvider: (provider: 'google' | 'github' | 'discord') => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
  updatePassword: (password: string) => Promise<{ error?: any }>;
  updateProfile: (updates: Record<string, any>) => Promise<{ error?: any }>;
  checkQuota: (queryType?: string) => Promise<{
    canProceed: boolean;
    remainingQueries: number;
    currentTier: string;
    limit: number;
  }>;
  trackUsage: (queryType: string, subType?: string, tokensUsed?: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const initialSession = await authService.getCurrentSession();
        setSession(initialSession);

        if (initialSession?.user) {
          setUser(initialSession.user);
          await loadUserProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const userProfile = await authService.getUserProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await authService.signIn(email, password);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    setLoading(true);
    try {
      const { error } = await authService.signUp(email, password, metadata);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithProvider = async (provider: 'google' | 'github' | 'discord') => {
    try {
      const { error } = await authService.signInWithProvider(provider);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await authService.resetPassword(email);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await authService.updatePassword(password);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates: Record<string, any>) => {
    try {
      const { error } = await authService.updateUserProfile(updates);
      if (!error) {
        await refreshProfile();
      }
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const checkQuota = async (queryType: string = 'llm') => {
    try {
      return await authService.checkUserQuota(queryType);
    } catch (error) {
      console.error('Error checking quota:', error);
      throw error;
    }
  };

  const trackUsage = async (queryType: string, subType?: string, tokensUsed: number = 0) => {
    try {
      await authService.trackUsage(queryType, subType, tokensUsed);
      // Refresh profile to get updated usage stats
      await refreshProfile();
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    checkQuota,
    trackUsage,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
