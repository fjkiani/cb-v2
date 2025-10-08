import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NewsGrid } from '../News/NewsGrid';
import { SentimentOverview } from '../Analysis/SentimentOverview';
import { MarketRelationshipGraph } from '../Analysis/MarketRelationshipGraph';
import { ServiceStatus } from './ServiceStatus';
import { useNewsScraper } from '../../hooks/useNewsScraper';
import { useNewsProcessor } from '../../hooks/useNewsProcessor';
import { Newspaper, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { RealTimeNews } from '../News/RealTimeNews';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { RawNewsArticle } from '../../types';
import { RawNewsArticle as ServiceRawNewsArticle } from '../../services/news/types';
import { EconomicCalendar } from '../Calendar/EconomicCalendar';
import { EarningsCalendar } from '../Calendar/EarningsCalendar';
import { useMarketContext } from '../../hooks/useMarketContext';
import { MarketContextDisplay } from '../Context/MarketContextDisplay';
import { MarketOverviewDisplay } from '../Analysis/MarketOverviewDisplay';
import MarketSentiment from '../Analysis/MarketSentiment';
import { MarketRelationships } from '../Analysis/MarketRelationships';
import { AppHeader } from '../Layout/AppHeader';
import { BACKEND_CONFIG } from '../../services/backend/config';

export const NewsDashboard: React.FC = () => {
  const { news, loading: newsLoading, error: newsError, refreshNews } = useNewsScraper();

  // --- State for TE Market Overview ---
  const [teMarketOverview, setTeMarketOverview] = useState<string | null>(null);
  const [isTeOverviewLoading, setIsTeOverviewLoading] = useState(false);
  const [teOverviewError, setTeOverviewError] = useState<string | null>(null);
  // --- Ref to track if overview was fetched for the current news set ---
  const overviewFetchedForNewsRef = useRef<string | null>(null);
  // --- End State ---

  // --- Use Market Context Hook --- 
  const { refetch: refetchMarketContext } = useMarketContext(); // Get the refetch function
  // We don't need the contextText/loading state here, MarketContextDisplay handles it

  // --- State for Manual Trigger --- 
  const [isGeneratingContext, setIsGeneratingContext] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  // --- Fetch Function for TE Market Overview ---
  const fetchTeMarketOverview = async (articlesToAnalyze: RawNewsArticle[]) => {
    console.log('[fetchTeMarketOverview] STARTING fetch with', articlesToAnalyze.length, 'articles'); // Log start
    if (articlesToAnalyze.length === 0) {
      console.log('[fetchTeMarketOverview] No articles to analyze');
      setTeMarketOverview(null);
      return;
    }

    // Debug: Log the first article structure
    console.log('[fetchTeMarketOverview] First article structure:', {
      hasRaw: 'raw' in articlesToAnalyze[0],
      rawKeys: articlesToAnalyze[0].raw ? Object.keys(articlesToAnalyze[0].raw) : 'no raw',
      topLevelKeys: Object.keys(articlesToAnalyze[0])
    });

    // Test basic connectivity first
    try {
      console.log('[fetchTeMarketOverview] Testing backend connectivity...');
      const healthResponse = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/health`);
      console.log('[fetchTeMarketOverview] Health check status:', healthResponse.status);
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
      console.log('[fetchTeMarketOverview] Backend is reachable');
    } catch (healthError) {
      console.error('[fetchTeMarketOverview] Backend connectivity test failed:', healthError);
      throw new Error(`Cannot connect to backend: ${healthError.message}`);
    }
    
    setIsTeOverviewLoading(true);
    setTeOverviewError(null);
    // setTeMarketOverview(null); // --- Temporarily COMMENT OUT immediate clearing ---
    console.log('[fetchTeMarketOverview] State set to loading.');
    
    try {
      console.log('Requesting TE market overview for', articlesToAnalyze.length, 'articles');
      // Ensure the articles sent have the structure expected by the backend (title, url, content)
      const payload = articlesToAnalyze.map(a => ({
          title: a.raw?.title || a.title,
          url: a.raw?.url || a.url,
          content: a.raw?.content || a.content || a.summary // Use raw content, then content, then summary as fallback
      }));
      
      console.log('Making request to:', `${BACKEND_CONFIG.BASE_URL}/api/analysis/trading-economics-overview`);
      console.log('Payload:', { articles: payload });

      const makeRequest = async (retryCount = 0): Promise<Response> => {
        try {
          const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/analysis/trading-economics-overview`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ articles: payload }),
            signal: AbortSignal.timeout(600000), // 10 minute timeout to match backend
          });
          return response;
        } catch (error) {
          if (retryCount < 2 && (error.name === 'TimeoutError' || error.message.includes('temporarily unavailable'))) {
            console.log(`[fetchTeMarketOverview] Retrying request (attempt ${retryCount + 2})...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            return makeRequest(retryCount + 1);
          }
          throw error;
        }
      };

      const response = await makeRequest();

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[fetchTeMarketOverview] API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: response.url
        });

        if (response.status === 504 || response.status === 503) {
          throw new Error(`Market overview service temporarily unavailable. The analysis service is experiencing high load. Please try again in a moment.`);
        }
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded. The AI service is busy. Please wait 30 seconds and try again.`);
        }
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('[fetchTeMarketOverview] Fetch successful. Response data:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setTeMarketOverview(data.overview || 'TE Overview generation returned empty (from backend).'); // Set overview on success
      console.log('[fetchTeMarketOverview] State set with overview:', data.overview?.substring(0,50) + '...'); // Log setting state
      console.log('TE Market overview debug info:', data.debug);
      
    } catch (error: unknown) {
      console.error("[fetchTeMarketOverview] Fetch error:", error); // Log error
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during TE overview generation';
      setTeOverviewError(errorMessage);
      setTeMarketOverview(null); // <-- Clear overview ONLY on error -->
      console.log('[fetchTeMarketOverview] State cleared due to error.');
    } finally {
      setIsTeOverviewLoading(false);
      console.log('[fetchTeMarketOverview] FINISHED fetch (finally block).'); // Log finish
    }
  };
  // --- End Fetch Function ---
  
  // --- Trigger TE Overview Fetch --- 
  useEffect(() => {
    // Only fetch overview when news is loaded, not loading, no error, and there are articles
    if (!newsLoading && !newsError && news.length > 0) {
      // Create a signature based on article IDs to prevent duplicate processing
      const newsSignature = news.map(n => n.id).sort().join(',');
      const lastSignature = overviewFetchedForNewsRef.current;

      console.log('[useEffect TE Overview] Running effect. Conditions:', {
        newsLoading,
        newsError,
        newsLength: news.length > 0,
        needsFetch: newsSignature !== lastSignature,
        newsSignature: newsSignature ? newsSignature.substring(0, 50) + '...' : 'null',
        lastSignature: lastSignature ? lastSignature.substring(0, 50) + '...' : 'null'
      });

      // Only fetch if we haven't processed this exact set of articles before
      if (newsSignature !== lastSignature && newsSignature.length > 0) {
        console.log('[useEffect TE Overview] Conditions MET. Calling fetchTeMarketOverview.');
        fetchTeMarketOverview(news);
        // Mark that we have fetched for this news signature
        overviewFetchedForNewsRef.current = newsSignature;
      } else {
        console.log('[useEffect TE Overview] Skipping - already processed these articles or empty signature');
      }
    } else {
      console.log('[useEffect TE Overview] Skipping - conditions not met:', {
        newsLoading,
        newsError,
        newsLength: news.length
      });
    }
  }, [news.length]); // Only depend on news.length to prevent infinite loops
  // --- End Trigger ---

  const newsForProcessor: ServiceRawNewsArticle[] = useMemo(() => {
    return news.map(article => ({
      title: article.raw?.title || article.title || 'Untitled',
      content: article.raw?.content || article.content || article.summary || 'No content available',
      url: article.raw?.url || article.url || '',
      publishedAt: article.raw?.publishedAt || article.published_at,
      created_at: article.created_at,
      source: article.raw?.source || article.source || 'Unknown',
      summary: article.summary,
      sentiment: article.sentiment,
      tags: article.tags?.map(tagString => ({ label: tagString, score: 0 })) ?? undefined,
    }));
  }, [news]);

  const { processedArticles, loading: processingLoading, error: processingError } = useNewsProcessor(newsForProcessor);

  const isLoading = newsLoading || processingLoading;
  const error = newsError || processingError;

  // --- Handle Manual Context Generation Trigger --- 
  const handleGenerateContext = async () => {
    setIsGeneratingContext(true);
    setTriggerError(null);
    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/context/generate-now`, {
        method: 'POST',
      });
      if (!response.ok || response.status !== 202) { // Check for 202 Accepted
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Trigger failed: ${response.status} - ${errorData.error || response.statusText}`);
      }
      console.log('[NewsDashboard] Context generation trigger successful.');
      // Wait a short moment before refetching to give backend time to process
      setTimeout(() => {
        refetchMarketContext(); 
        console.log('[NewsDashboard] Refetching market context after trigger.');
      }, 2000); // 2-second delay (adjust as needed)

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown trigger error';
      setTriggerError(errorMessage);
      console.error('[NewsDashboard] Error triggering context generation:', err);
    } finally {
      setIsGeneratingContext(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <AppHeader />

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* --- Overall Market Context Display --- */}
          <MarketContextDisplay />

          {/* --- Manual Trigger Button --- */}
          <div className="text-right">
            <button
              onClick={handleGenerateContext}
              disabled={isGeneratingContext}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isGeneratingContext ? 'animate-spin' : ''}`} />
              {isGeneratingContext ? 'Generating Context...' : 'Generate/Update Context'}
            </button>
            {triggerError && (
              <p className="text-xs text-red-600 mt-1">Error: {triggerError}</p>
            )}
          </div>

          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-red-700 font-medium">{error.message}</p>
                <p className="text-red-600 text-sm mt-1">
                  Please ensure the backend service is running and try again
                </p>
              </div>
            </div>
          ) : null}

          {/* Display Economic Calendar above the tabs/news grid */}
          <div className="mb-6">
            <EconomicCalendar />
          </div>

          {/* Display Earnings Calendar */}
          <div className="mb-6">
            <EarningsCalendar />
          </div>

          <Tabs defaultValue="trading-economics">
            <TabsList className="mb-4">
              <TabsTrigger value="trading-economics">Trading Economics</TabsTrigger>
              <TabsTrigger value="investing11">Investing11</TabsTrigger>
              <TabsTrigger value="market-sentiment">Market Sentiment</TabsTrigger>
              <TabsTrigger value="market-relationships">Market Relationships</TabsTrigger>
            </TabsList>

            <TabsContent value="trading-economics">
              <MarketOverviewDisplay
                overview={teMarketOverview}
                isLoading={isTeOverviewLoading}
                error={teOverviewError}
                isNewsLoading={newsLoading}
              />

              {/* Debug buttons */}
              <div className="mt-4 p-4 bg-gray-100 rounded-lg space-y-3">
                <div>
                  <button
                    onClick={() => {
                      console.log('Manual trigger clicked');
                      console.log('Current news state:', { loading: newsLoading, error: newsError, count: news.length });
                      if (news.length > 0) {
                        fetchTeMarketOverview(news);
                      } else {
                        console.log('No news available to analyze');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                    disabled={newsLoading || news.length === 0}
                  >
                    🔧 Debug: Manual Market Overview
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        console.log('Triggering fresh scrape...');
                        const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/schedule/trigger-te-scrape`, {
                          method: 'POST',
                          headers: {
                            'Authorization': 'Bearer 56f52b6634a410679d99bd631000ae6782a786a71e21e3f2494a36adac0d8e3f'
                          }
                        });
                        const result = await response.json();
                        console.log('Scrape trigger result:', result);

                        // Wait a moment then refresh the news
                        setTimeout(async () => {
                          console.log('Refreshing news data...');
                          await refreshNews(true);
                          alert('News refreshed with fresh data!');
                        }, 3000);
                      } catch (error) {
                        console.error('Failed to trigger scrape:', error);
                        alert('Failed to trigger scrape: ' + error.message);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    🔄 Force Fresh Scrape & Refresh
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  News: {news.length} articles
                </p>
              </div>
            
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <NewsGrid articles={processedArticles} loading={newsLoading} />
                </div>
                <div className="space-y-6">
                  <SentimentOverview articles={processedArticles} />
                  <MarketRelationshipGraph articles={processedArticles} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="investing11">
              <RealTimeNews 
                articles={news}
                loading={newsLoading}
                error={newsError}
                onRefresh={refreshNews}
              />
            </TabsContent>

            <TabsContent value="market-sentiment">
              <div className="mb-6">
                <MarketSentiment />
              </div>
            </TabsContent>

            <TabsContent value="market-relationships">
              <div className="mb-6">
                <MarketRelationships />
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ErrorBoundary>
  );
};