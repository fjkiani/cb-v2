import React, { useState, useEffect, useRef } from 'react';
import { NewsCard } from './NewsCard';
import { ProcessedArticle } from '../../services/news/types'; // Keep for NewsCard prop type
// Import the shared InternalArticle type
import { InternalArticle } from '../../types/news.types';
import { Loader2, RefreshCw } from 'lucide-react';
import { BACKEND_CONFIG } from '../../services/backend/config';

// Remove the outdated manual interface
/*
interface RealTimeArticle {
  id: string; 
  title: string;
  content: string; 
  url: string;
  published_at: string; 
  source: string;
  category: string;
  created_at: string;
  updated_at: string;
}
*/

// Rename the component
interface RealTimeNewsProps {
  articles?: InternalArticle[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const RealTimeNews = ({ 
  articles: propArticles, 
  loading: propLoading, 
  error: propError, 
  onRefresh 
}: RealTimeNewsProps = {}) => {
  // Use props if provided, otherwise use local state
  const [articles, setArticles] = useState<InternalArticle[]>(propArticles || []);
  const [loading, setLoading] = useState(propLoading ?? true);
  const [error, setError] = useState<string | null>(propError || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // --- New State for Market Overview ---
  const [marketOverview, setMarketOverview] = useState<string | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const lastOverviewSignature = useRef<string>('');
  // --- End New State ---

  // --- New Function to Fetch Market Overview ---
  const fetchMarketOverview = async (fetchedArticles: InternalArticle[]) => {
    if (fetchedArticles.length === 0) {
      setMarketOverview(null); // No articles, no overview
      return;
    }
    
    // Prevent multiple simultaneous overview fetches
    if (isOverviewLoading) {
      console.log('Market overview already loading, skipping...');
      return;
    }
    
    // Prevent fetching if we already have an overview for these articles
    const articlesSignature = fetchedArticles.map(a => a.id).sort().join(',');
    if (marketOverview && articlesSignature === lastOverviewSignature.current) {
      console.log('Market overview already generated for these articles, skipping...');
      return;
    }
    
    setIsOverviewLoading(true);
    setOverviewError(null);
    
    try {
      console.log('Requesting market overview for', fetchedArticles.length, 'articles');
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/analysis/market-overview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articles: fetchedArticles }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to get error details
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('Market overview response received:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setMarketOverview(data.overview || 'Overview generation returned empty.'); // Set the overview text
      console.log('Market overview debug info:', data.debug); // Log debug info from backend
      
      // Update the signature to prevent re-fetching for the same articles
      lastOverviewSignature.current = articlesSignature;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during overview generation';
      setOverviewError(errorMessage);
      console.error("Market overview fetch error:", error);
    } finally {
      setIsOverviewLoading(false);
    }
  };
  // --- End New Function ---
  
  const fetchNews = async (forceRefresh = false) => {
    console.log('RealTimeNews fetchNews called', { forceRefresh, currentArticlesCount: articles.length });
    setLoading(true);
    setError(null);
    setMarketOverview(null); // Clear overview on refresh
    setOverviewError(null);
    
    try {
      setIsRefreshing(forceRefresh);
      const url = new URL(`${BACKEND_CONFIG.BASE_URL}/api/news`);
      if (forceRefresh) {
        url.searchParams.set('refresh', 'true');
      }
      url.searchParams.set('t', Date.now().toString()); // Cache bust
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const fetchedArticlesData = Array.isArray(data) ? data : (Array.isArray(data.articles) ? data.articles : []);
      console.log('RealTimeNews received articles:', { 
        count: fetchedArticlesData.length, 
        firstTitle: fetchedArticlesData[0]?.raw?.title || fetchedArticlesData[0]?.title,
        firstPublishedAt: fetchedArticlesData[0]?.raw?.publishedAt || fetchedArticlesData[0]?.publishedAt || fetchedArticlesData[0]?.published_at
      });
      setArticles(fetchedArticlesData); 
      
      // --- Trigger overview fetch after articles are set ---
      if (fetchedArticlesData.length > 0) {
        fetchMarketOverview(fetchedArticlesData); // Call the new function
      } else {
        setMarketOverview(null); // Ensure overview is null if no articles
      }
      // --- End Trigger ---
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
      console.error("Fetch news error:", error); // Log the error
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Update local state when props change
  useEffect(() => {
    if (propArticles) {
      setArticles(propArticles);
    }
  }, [propArticles]);

  useEffect(() => {
    if (propLoading !== undefined) {
      setLoading(propLoading);
    }
  }, [propLoading]);

  useEffect(() => {
    if (propError !== undefined) {
      setError(propError);
    }
  }, [propError]);

  // Only fetch news if no props are provided (standalone mode)
  useEffect(() => {
    if (!propArticles && !propLoading && !propError) {
      console.log('RealTimeNews useEffect triggered - fetching news (standalone mode)');
      fetchNews();
    }
  }, [propArticles, propLoading, propError]);

  // Fetch market overview when articles change (but only if we haven't already processed them)
  useEffect(() => {
    if (articles.length > 0 && !loading && !error) {
      const articlesSignature = articles.map(a => a.id).sort().join(',');
      if (articlesSignature !== lastOverviewSignature.current) {
        console.log('Articles changed, fetching market overview...');
        fetchMarketOverview(articles);
      }
    }
  }, [articles.length, loading, error]); // Only depend on length, loading, and error, not the entire articles array

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      // setLoading(true); // Already handled in fetchNews
      // setError(null); 
      fetchNews(true);
    }
  };

  // Initial loading state for the main articles
  if (loading && articles.length === 0) { // Show initial load only if no articles yet
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin" size={24} /> Loading News...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-white">
      <div className="flex justify-between items-center mb-4 pb-4 border-b">
        {/* Update display title */}
        <h2 className="text-xl font-semibold text-gray-800">Market News</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isOverviewLoading} // Disable if either is loading
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${(isRefreshing || loading) ? 'animate-spin' : ''}`} />
          {isRefreshing || loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* --- Market Overview Section --- */} 
      <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-md">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Market Overview</h3>
        {isOverviewLoading ? (
          <div className="flex items-center text-blue-700">
             <Loader2 className="animate-spin mr-2" size={16} />
             <span>Generating overview...</span>
          </div>
        ) : overviewError ? (
          <p className="text-red-600">Error generating overview: {overviewError}</p>
        ) : marketOverview ? (
          <p className="text-blue-900 whitespace-pre-wrap">{marketOverview}</p>
        ) : (
          <p className="text-gray-500 italic">Market overview will be generated based on key articles.</p>
        )}
      </div>
      {/* --- End Market Overview Section --- */}

      {/* --- Article List Section --- */}
      {error ? (
        <div className="text-red-500 p-4 bg-red-50 border border-red-200 rounded-md">
          Error fetching news: {error} <br />
          Please check the backend logs for more details.
        </div>
      ) : articles.length === 0 && !loading ? ( // Show only if not loading and empty
        <div className="text-gray-500 p-4">
          No market news available at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article, index) => {
            // Create the structure expected by NewsCard (ProcessedArticle from services/news/types)
            const articleForCard: ProcessedArticle = {
              id: String(article.id ?? index), // Ensure ID is string, provide fallback if undefined
              raw: {
                title: article.raw?.title || article.title || 'No title',
                content: article.raw?.content || article.content || 'Content unavailable',
                url: article.raw?.url || article.url || '#',
                publishedAt: article.raw?.publishedAt || article.publishedAt || article.published_at,
                source: article.raw?.source || article.sourceName || article.source || 'Unknown',
                created_at: article.created_at || article.createdAt
              },
              // Provide default/empty values for analysis fields
              summary: '',
              keyPoints: [],
              entities: {
                companies: [],
                sectors: [],
                indicators: []
              },
              sentiment: {
                score: 0,
                label: 'neutral',
                confidence: 0
              },
              marketImpact: {
                shortTerm: { description: '', confidence: 0, affectedSectors: [] },
                longTerm: { description: '', confidence: 0, potentialRisks: [] }
              }
            };
  
            return (
              <NewsCard 
                key={articleForCard.id} 
                article={articleForCard} 
              />
            );
          })}
        </div>
      )}
      {/* --- End Article List Section --- */}
    </div>
  );
}; 