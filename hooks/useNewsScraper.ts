import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase/client';
import { BACKEND_CONFIG } from '../services/backend/config';
import type { RawNewsArticle } from '../types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useNewsScraper(refreshInterval = 300000) {
  const [news, setNews] = useState<RawNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('DISCONNECTED');
  const [isScraping, setIsScraping] = useState(false);
  const isFetchingRef = useRef(false);

  const getItemTime = (a: any): number => {
    const d = a?.created_at || a?.createdAt || a?.published_at || a?.publishedAt || a?.date || a?.timestamp;
    const t = d ? new Date(d).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  };

  const sortArticles = useCallback((articles: RawNewsArticle[]) => {
    return [...articles].sort((a, b) => getItemTime(b) - getItemTime(a));
  }, []);

  const fetchNews = useCallback(async (useFresh = false) => {
    if (isFetchingRef.current) {
      console.debug('[useNewsScraper] fetchNews skipped (in-flight)');
      return;
    }
    isFetchingRef.current = true;
    try {
      setLoading(true);
      const endpoint = '/api/news'; // Always use the same endpoint as RealTimeNews
      const url = new URL(`${BACKEND_CONFIG.BASE_URL}${endpoint}`);
      url.searchParams.set('t', Date.now().toString()); // cache bust
      if (useFresh) {
        url.searchParams.set('refresh', 'true'); // Force refresh from backend
      }
      console.debug('[useNewsScraper] GET', url.toString());
      const response = await fetch(url.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const list: RawNewsArticle[] = Array.isArray(data) ? data : (data?.articles ?? []);
      const sorted = sortArticles(list);

      // Debug: log first three
      const preview = sorted.slice(0, 3).map((a) => ({
        title: a.raw?.title || a.title || 'No title',
        created_at: a.created_at || a.published_at || a.publishedAt || a.raw?.publishedAt,
        url: a.raw?.url || a.url || '#'
      }));
      console.debug('[useNewsScraper] Received articles:', { count: sorted.length, first3: preview });

      setNews(sorted);
      setError(null);
    } catch (err) {
      console.error('[useNewsScraper] fetchNews error', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch news'));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [sortArticles]);

  const triggerScraper = useCallback(async () => {
    if (isScraping) return;
    try {
      setIsScraping(true);
      setError(null);
      const trig = new URL(`${BACKEND_CONFIG.BASE_URL}/api/scrape/trading-economics`);
      trig.searchParams.set('fresh', 'true');
      trig.searchParams.set('t', Date.now().toString()); // cache bust
      console.debug('[useNewsScraper] TRIGGER', trig.toString());
      const triggerRes = await fetch(trig.toString(), { method: 'GET', cache: 'no-store' });
      if (!triggerRes.ok) {
        let body: any = null;
        try { body = await triggerRes.json(); } catch {}
        throw new Error(`Scraper trigger failed: ${body?.message || triggerRes.statusText}`);
      }
      // Poll for fresh data a few times
      for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, i === 0 ? 4000 : 3000));
        await fetchNews(true);
      }
    } catch (err) {
      console.error('[useNewsScraper] triggerScraper error', err);
      setError(err instanceof Error ? err : new Error('Failed to trigger scraper'));
    } finally {
      setIsScraping(false);
    }
  }, [isScraping, fetchNews]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number;
    let channel: RealtimeChannel;

    async function setupSubscription() {
      try {
        // Only fetch news initially if we don't have any articles yet
        if (news.length === 0) {
          await fetchNews();
        }

        channel = supabase.channel('articles-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'articles' },
            (payload: RealtimePostgresChangesPayload<RawNewsArticle>) => {
              if (!mounted) return;
              if (payload.eventType === 'INSERT') {
                setNews(current => sortArticles([payload.new as any, ...current] as any));
              } else if (payload.eventType === 'UPDATE') {
                setNews(current => sortArticles(current.map(a => (a.id === (payload.new as any).id ? (payload.new as any) : a)) as any));
              }
            }
          )
          .subscribe((status: string) => setSubscriptionStatus(status));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to setup subscription'));
      }
    }

    setupSubscription();

    // Disable automatic fetching to prevent infinite loops
    // timeoutId = window.setInterval(() => {
    //   if (subscriptionStatus !== 'SUBSCRIBED') {
    //     fetchNews();
    //   }
    // }, refreshInterval);

    return () => {
      mounted = false;
      window.clearInterval(timeoutId);
      if (channel) supabase.removeChannel(channel);
    };
  }, [refreshInterval, sortArticles, subscriptionStatus]); // Remove fetchNews to prevent infinite loop

  const refreshNews = useCallback(async () => {
    await triggerScraper();
  }, [triggerScraper]);

  return { news, loading, error, isScraping, subscriptionStatus, refreshNews };
}