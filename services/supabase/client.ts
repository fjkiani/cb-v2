import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug environment variables
console.log('Supabase environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  urlStart: supabaseUrl?.substring(0, 20) + '...',
  keyStart: supabaseKey?.substring(0, 20) + '...',
  envKeys: Object.keys(import.meta.env).filter(key =>
    key.includes('SUPABASE') ||
    key.includes('DB_') ||
    key.includes('SERVICE_') ||
    key.includes('VITE_')
  )
});

// Initialize Supabase client with fallback values
let supabaseConfig: any;

if (supabaseUrl && supabaseKey) {
  // Validate key format (just check if it's a JWT)
  if (!supabaseKey.startsWith('eyJ')) {
    console.error('Invalid Supabase key format, using fallback values');
    // Use fallback values
    supabaseConfig = {
      url: 'https://gpirjathvfoqjurjhdxq.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwaXJqYXRodmZvcWp1cmpoZHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NzExMTMsImV4cCI6MjA1MDE0NzExM30.4mFiGX3DyOEy4ZwzKVbLcJ9_LCCPvYGZqHHWwsqY_xU'
    };
    console.warn('⚠️ Using fallback Supabase configuration due to invalid key format');
  } else {
    supabaseConfig = { url: supabaseUrl, key: supabaseKey };
    console.log('✅ Using environment Supabase configuration');
  }
} else {
  // Use fallback values for development
  supabaseConfig = {
    url: 'https://gpirjathvfoqjurjhdxq.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwaXJqYXRodmZvcWp1cmpoZHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NzExMTMsImV4cCI6MjA1MDE0NzExM30.4mFiGX3DyOEy4ZwzKVbLcJ9_LCCPvYGZqHHWwsqY_xU'
  };
  console.warn('⚠️ Using fallback Supabase configuration (missing environment variables)');
}

export const supabase = createClient(supabaseConfig.url, supabaseConfig.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  }
});

// SaaS Authentication Service
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabase;
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  // Sign up with email and password
  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {}
      }
    });
    return { data, error };
  }

  // Sign in with email and password
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }

  // Sign in with OAuth provider
  async signInWithProvider(provider: 'google' | 'github' | 'discord') {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { data, error };
  }

  // Sign out
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  // Reset password
  async resetPassword(email: string) {
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    return { data, error };
  }

  // Update password
  async updatePassword(password: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password
    });
    return { data, error };
  }

  // Update user metadata
  async updateUser(updates: { email?: string; password?: string; data?: Record<string, any> }) {
    const { data, error } = await this.supabase.auth.updateUser(updates);
    return { data, error };
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  // Get user profile with subscription info
  async getUserProfile(userId?: string) {
    const user = userId ? { id: userId } : await this.getCurrentUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(`
        *,
        user_usage_summary (
          total_queries,
          llm_queries,
          period_start,
          period_end
        )
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }

  // Update user profile
  async updateUserProfile(updates: Record<string, any>) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await this.supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    return { data, error };
  }

  // Check if user can perform an action based on their quota
  async checkUserQuota(queryType: string = 'llm'): Promise<{
    canProceed: boolean;
    remainingQueries: number;
    currentTier: string;
    limit: number;
  }> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await this.supabase
      .rpc('check_user_quota', { user_id: user.id });

    if (error) {
      console.error('Error checking user quota:', error);
      throw error;
    }

    const quota = data[0];
    return {
      canProceed: quota.can_proceed,
      remainingQueries: quota.remaining_queries,
      currentTier: quota.current_tier,
      limit: quota.current_tier === 'free' ? 10 : quota.current_tier === 'pro' ? 500 : 999999
    };
  }

  // Track user usage
  async trackUsage(queryType: string, subType?: string, tokensUsed: number = 0) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await this.supabase
      .from('user_usage')
      .insert({
        user_id: user.id,
        query_type: queryType,
        query_subtype: subType,
        tokens_used: tokensUsed,
        credits_used: 1
      });

    if (error) {
      console.error('Error tracking usage:', error);
      throw error;
    }

    // Also increment the user query count
    await this.supabase.rpc('increment_user_query_count', {
      user_id: user.id
    });
  }
}

// Export singleton instance
export const authService = new AuthService();

interface Article {
  title: string;
  url: string;
  source: string;
  content?: string;
  published_at: string;
}

export const storeArticles = async (articles: Article[]) => {
  try {
    // Group articles by source
    const articlesBySource = articles.reduce((acc, article) => {
      const source = article.source || 'Unknown';
      acc[source] = acc[source] || [];
      acc[source].push(article);
      return acc;
    }, {} as Record<string, Article[]>);

    // Check for duplicates per source
    for (const [source, sourceArticles] of Object.entries(articlesBySource)) {
      const { data: existingArticles } = await supabase
        .from('articles')
        .select('title, url')
        .eq('source', source)
        .in('title', sourceArticles.map(a => a.title));

      const existingTitles = new Set(existingArticles?.map(a => a.title) || []);
      
      const newArticles = sourceArticles.filter(article => 
        !existingTitles.has(article.title)
      );

      if (newArticles.length > 0) {
        await supabase
          .from('articles')
          .insert(newArticles)
          .select();
      }
    }

    return { data: articles, error: null };
  } catch (error) {
    console.error('Error storing articles:', error);
    throw error;
  }
};