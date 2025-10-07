import { ProcessedArticle } from '../news/types';
import { createClient } from '@supabase/supabase-js';

const COHERE_API_KEY = 'OPnR3L2JKy7VXt9MKeCM5KKhQxSZge4snUt6xwL0';
const COHERE_API_URL = 'https://api.cohere.ai/v1/generate';

// Cache management with localStorage
class AnalysisCache {
  private static CACHE_KEY = 'news-analysis-cache';
  private static MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static MAX_CACHE_SIZE = 100; // Maximum number of cached analyses

  private static cache: Map<string, { timestamp: number; data: DeepSeekAnalysis }>;

  static {
    // Initialize cache from localStorage
    try {
      const stored = localStorage.getItem(AnalysisCache.CACHE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      AnalysisCache.cache = new Map(Object.entries(parsed));
      
      // Clean up old entries on initialization
      AnalysisCache.cleanup();
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
      AnalysisCache.cache = new Map();
    }
  }

  static get(key: string): DeepSeekAnalysis | null {
    const entry = AnalysisCache.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > AnalysisCache.MAX_CACHE_AGE) {
      AnalysisCache.cache.delete(key);
      AnalysisCache.saveToStorage();
      return null;
    }

    return entry.data;
  }

  static set(key: string, data: DeepSeekAnalysis): void {
    // Add new entry
    AnalysisCache.cache.set(key, {
      timestamp: Date.now(),
      data
    });

    // Cleanup if cache is too large
    if (AnalysisCache.cache.size > AnalysisCache.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(AnalysisCache.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      while (AnalysisCache.cache.size > AnalysisCache.MAX_CACHE_SIZE) {
        const [oldestKey] = entries.shift()!;
        AnalysisCache.cache.delete(oldestKey);
      }
    }

    // Save to localStorage
    AnalysisCache.saveToStorage();
  }

  private static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of AnalysisCache.cache.entries()) {
      if (now - entry.timestamp > AnalysisCache.MAX_CACHE_AGE) {
        AnalysisCache.cache.delete(key);
      }
    }
    AnalysisCache.saveToStorage();
  }

  private static saveToStorage(): void {
    try {
      const data = Object.fromEntries(AnalysisCache.cache.entries());
      localStorage.setItem(AnalysisCache.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cache to localStorage:', error);
    }
  }
}

export interface DeepSeekAnalysis {
  summary: string;
  sentiment: {
    score: number;
    label: string;
    confidence: number;
  };
  marketImpact: {
    immediate: string;
    longTerm: string;
    affectedSectors: string[];
  };
  keyPoints: string[];
  relatedIndicators: string[];
}

// Import backend API instead of direct Supabase access
import { backendAPI } from '../backend/api';

function normalizeUrl(url: string): string {
  try {
    // Remove any trailing slashes
    url = url.replace(/\/+$/, '');
    
    // Add https:// if no protocol is specified
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Remove www. if present
    url = url.replace(/^(https?:\/\/)?(www\.)?/, '$1');
    
    return url.toLowerCase();
  } catch (error) {
    console.error('Error normalizing URL:', error);
    return url;
  }
}

async function storeArticleAndAnalysis(
  article: ProcessedArticle,
  analysis: DeepSeekAnalysis
) {
  try {
    console.log('Storing article and analysis via backend API:', {
      title: article.raw.title,
      url: article.raw.url
    });

    // Use backend API to store article and analysis
    const response = await backendAPI.post('/analysis/store-article-analysis', {
      article: article,
      analysis: analysis
    });

    console.log('Successfully stored article and analysis:', response);
    return response;
  } catch (error) {
    console.error('Failed to store article and analysis:', error);
    throw error;
  }
}

export const analyzeArticle = async (
  article: ProcessedArticle
): Promise<DeepSeekAnalysis> => {
  console.log('Processing article via backend API:', {
    id: article.id,
    title: article.raw.title,
    url: article.raw.url
  });

  try {
    // Use backend API for article analysis instead of direct Cohere calls
    const response = await backendAPI.post('/analysis/market-impact', {
      content: article.raw.content || article.summary,
      title: article.raw.title,
      source: article.raw.source,
      publishedAt: article.raw.publishedAt
    });

    // Transform backend response to match expected format
    const analysis: DeepSeekAnalysis = {
      summary: response.summary || response.overview || "Analysis completed",
      sentiment: {
        score: Number(response.sentiment?.score) || 0,
        label: response.sentiment?.label || response.sentiment?.sentiment || "neutral",
        confidence: Number(response.sentiment?.confidence) || 0.8
      },
      marketImpact: {
        immediate: response.marketImpact?.shortTerm || response.marketImpact?.immediate || "Short-term impact analysis",
        longTerm: response.marketImpact?.longTerm || "Long-term implications analysis",
        affectedSectors: Array.isArray(response.marketImpact?.affectedSectors)
          ? response.marketImpact.affectedSectors
          : response.marketImpact?.sectors || []
      },
      keyPoints: Array.isArray(response.keyPoints)
        ? response.keyPoints
        : response.key_points || ["Analysis completed"],
      relatedIndicators: Array.isArray(response.relatedIndicators)
        ? response.relatedIndicators
        : response.related_indicators || []
    };

    console.log('Successfully analyzed article:', article.raw.title);
    return analysis;

  } catch (error) {
    console.error('Error analyzing article:', error);
    // Return a fallback analysis instead of throwing
    return {
      summary: "Analysis temporarily unavailable",
      sentiment: {
        score: 0,
        label: "neutral",
        confidence: 0.5
      },
      marketImpact: {
        immediate: "Analysis service temporarily unavailable",
        longTerm: "Please try again later",
        affectedSectors: []
      },
      keyPoints: ["Analysis service temporarily unavailable"],
      relatedIndicators: []
    };
  }
}; 