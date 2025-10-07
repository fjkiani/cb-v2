import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from 'lucide-react';
import { BACKEND_CONFIG } from '../../services/backend/config';

interface SentimentData {
  sentiment: {
    overall: string;
    score: number;
    confidence: number;
    label: string;
    marketConfidence: number;
  };
  breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  analysis: string;
  key_themes: string[];
  metadata: {
    articlesAnalyzed: number;
    method: string;
    timeRange: string;
  };
  timestamp: string;
  error?: string;
}

const MarketSentiment: React.FC = () => {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSentiment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/analysis/market-sentiment`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sentimentData = await response.json();
      setData(sentimentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sentiment data');
      console.error('Error fetching market sentiment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentiment();
  }, []);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="w-6 h-6 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="w-6 h-6 text-red-500" />;
      default:
        return <Minus className="w-6 h-6 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'bearish':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentBarColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'bg-green-500';
      case 'bearish':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Analyzing market sentiment...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-center h-32 text-red-600">
          <AlertCircle className="w-8 h-8 mr-2" />
          <span>Error: {error}</span>
          <button
            onClick={fetchSentiment}
            className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { sentiment, breakdown, analysis, key_themes, metadata } = data;
  const totalArticles = breakdown.positive + breakdown.negative + breakdown.neutral;

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getSentimentIcon(sentiment.overall)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Market Sentiment</h3>
              <p className="text-sm text-gray-600">{metadata.timeRange}</p>
            </div>
          </div>
          <button
            onClick={fetchSentiment}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Refresh sentiment analysis"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Main Sentiment Display */}
      <div className="p-6">
        <div className={`p-6 rounded-lg border-2 text-center ${getSentimentColor(sentiment.overall)}`}>
          <div className="flex items-center justify-center mb-4">
            {getSentimentIcon(sentiment.overall)}
            <span className="text-2xl font-bold ml-2">{sentiment.label}</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 mb-1">Sentiment Score</div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getSentimentBarColor(sentiment.overall)} transition-all duration-500`}
                    style={{ width: `${((sentiment.score + 1) / 2) * 100}%` }}
                  />
                </div>
                <span className="text-lg font-semibold">{sentiment.score.toFixed(3)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Confidence</div>
                <div className="font-semibold">{(sentiment.confidence * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-gray-600">Market Confidence</div>
                <div className="font-semibold">{sentiment.marketConfidence.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment Breakdown */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Sentiment Breakdown</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{breakdown.positive}</div>
              <div className="text-sm text-green-700">Positive</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{breakdown.negative}</div>
              <div className="text-sm text-red-700">Negative</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">{breakdown.neutral}</div>
              <div className="text-sm text-gray-700">Neutral</div>
            </div>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Market Analysis</h4>
          <p className="text-sm text-gray-700 leading-relaxed">{analysis}</p>
        </div>

        {/* Key Themes */}
        {key_themes && key_themes.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Themes</h4>
            <div className="flex flex-wrap gap-2">
              {key_themes.map((theme, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Analyzed {metadata.articlesAnalyzed} articles</span>
            <span>{metadata.method}</span>
            <span>{new Date(data.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketSentiment;

