import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NewsCard } from './NewsCard';
import { RawNewsArticle } from '../../types';
import { BACKEND_CONFIG } from '../../services/backend/config';
import { AlertCircle, Loader2 } from 'lucide-react';

interface NewsGridProps {
  articles: RawNewsArticle[];
  loading: boolean;
}

export const NewsGrid: React.FC<NewsGridProps> = ({ articles, loading: initialLoading }) => {
  const [logs, setLogs] = useState<{ level: string; message: string; timestamp: string }[]>([]);
  const { data: tradingEconomicsArticles, isLoading: isTradingEconomicsLoading, error: tradingEconomicsError, refetch } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/news`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Filter for Trading Economics articles only
      const teArticles = (data || []).filter((article: any) => article.source === 'Trading Economics');
      console.log('Trading Economics articles found:', teArticles.length);

      // Debug first article to see data structure
      if (teArticles.length > 0) {
        const firstArticle = teArticles[0];
        console.debug('First article data structure:', {
          id: firstArticle.id,
          title: firstArticle.title,
          published_at: firstArticle.published_at,
          hasContent: !!firstArticle.content,
          contentLength: firstArticle.content?.length || 0,
          contentPreview: firstArticle.content?.substring(0, 100) || 'none',
          hasRaw: !!firstArticle.raw,
          rawKeys: firstArticle.raw ? Object.keys(firstArticle.raw) : 'no raw',
          rawContentLength: firstArticle.raw?.content?.length || 0,
          rawContentPreview: firstArticle.raw?.content?.substring(0, 100) || 'none',
          hasSummary: !!firstArticle.summary,
          summaryLength: firstArticle.summary?.length || 0
        });

        // Log timestamp to see if data is fresh
        const articleDate = new Date(firstArticle.published_at);
        const now = new Date();
        const ageInHours = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60);
        console.log(`📅 First article age: ${ageInHours.toFixed(1)} hours old (published: ${articleDate.toLocaleString()})`);
      }

      const transformedArticles = teArticles.map((article: any) => ({
        ...article,
        raw: {
          // Preserve existing raw data if available, otherwise create new structure
          ...(article.raw || {}),
          title: article.title,
          content: article.content || article.raw?.content || article.summary,
          url: article.url,
          publishedAt: article.published_at,
          source: article.source,
          // Preserve sentiment data if it exists in raw
          sentiment: article.raw?.sentiment || (article.sentiment_score ? {
            score: article.sentiment_score,
            label: article.sentiment_label || 'neutral',
            confidence: 0.8
          } : undefined)
        },
        keyPoints: article.keyPoints || [],
        entities: {
          companies: article.entities?.companies || [],
          sectors: article.entities?.sectors || [],
          indicators: article.entities?.indicators || []
        },
        marketImpact: {
          shortTerm: {
            description: article.marketImpact?.shortTerm?.description || '',
            confidence: article.marketImpact?.shortTerm?.confidence || 0,
            affectedSectors: article.marketImpact?.shortTerm?.affectedSectors || []
          },
          longTerm: {
            description: article.marketImpact?.longTerm?.description || '',
            confidence: article.marketImpact?.longTerm?.confidence || 0.5,
            potentialRisks: article.marketImpact?.longTerm?.potentialRisks || []
          }
        },
        sentiment: {
          score: article.sentiment?.score || article.sentiment_score || 0,
          label: article.sentiment?.label || article.sentiment_label || 'neutral',
          confidence: article.sentiment?.confidence || 0.8
        }
      }));

      // Debug first transformed article
      if (transformedArticles.length > 0) {
        const firstTransformed = transformedArticles[0];
        console.debug('First transformed article:', {
          id: firstTransformed.id,
          title: firstTransformed.raw?.title || firstTransformed.title,
          hasRawContent: !!firstTransformed.raw?.content,
          rawContentLength: firstTransformed.raw?.content?.length || 0,
          rawContentPreview: firstTransformed.raw?.content?.substring(0, 100) || 'none',
          hasTopLevelContent: !!firstTransformed.content,
          topLevelContentLength: firstTransformed.content?.length || 0
        });
      }

      return transformedArticles;
    },
    enabled: false, // Initially disable this query; we rely on the parent dashboard's fetch
  });

  const isLoading = initialLoading || isTradingEconomicsLoading;

  // The main refresh logic is now handled by the parent NewsDashboard component.
  // This component will simply display the articles passed down to it.

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (tradingEconomicsError) {
    return (
      <div className="text-red-500 p-4">
        Error loading news: {tradingEconomicsError.message}
      </div>
    );
  }

  // Use articles prop if available, otherwise use fetched Trading Economics articles
  const displayArticles = articles.length > 0 ? articles : (tradingEconomicsArticles || []);

  // Always show the header and refresh button, even if no articles
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Trading Economics News</h2>
          {/* Show article count and freshness indicator */}
          {tradingEconomicsArticles && tradingEconomicsArticles.length > 0 && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                {tradingEconomicsArticles.length} articles
              </span>
              <span className="text-green-600">●</span>
              <span>Live</span>
            </div>
          )}
        </div>
        {/* The refresh button is removed as per the edit hint */}
      </div>

      {displayArticles.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No news articles</h3>
          <p className="text-gray-500 mb-4">Click "Get Fresh News" to fetch the latest market updates</p>
          {/* The refresh button is removed as per the edit hint */}
        </div>
      ) : (
        displayArticles.map((article: any) => (
          <NewsCard key={article.id} article={article} />
        ))
      )}
    </div>
  );
};