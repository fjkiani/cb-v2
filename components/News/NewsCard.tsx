import React, { useState, useEffect } from 'react';
import { ProcessedArticle } from '../../services/news/types';
import { Clock, ExternalLink, TrendingUp, TrendingDown, Minus, Tag, BookOpen, ChevronDown, ChevronUp, Activity, BarChart } from 'lucide-react';
import { analyzeArticle, DeepSeekAnalysis } from '../../services/analysis/deepseek';

interface NewsCardProps {
  article: ProcessedArticle;
}

export const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  // Get initial state from localStorage or default to false
  const initialShowAnalysis = localStorage.getItem(`analysis-toggle-${article.id}`) === 'true';
  const [analysis, setAnalysis] = useState<DeepSeekAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(initialShowAnalysis);

  // Load analysis if it was previously shown
  useEffect(() => {
    if (showAnalysis && !analysis && !loading) {
      handleAnalysisToggle();
    }
  }, []); // Run once on mount

  // Only fetch analysis when user wants to see it
  const handleAnalysisToggle = async () => {
    const newState = !showAnalysis;
    setShowAnalysis(newState);
    // Save toggle state to localStorage
    localStorage.setItem(`analysis-toggle-${article.id}`, String(newState));

    if (newState && !analysis && !loading) {
      setLoading(true);
      try {
        const result = await analyzeArticle(article);
        setAnalysis(result);
      } catch (error) {
        console.error('Failed to load analysis:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const getSentimentIcon = () => {
    if (article.sentiment.score > 0.2) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (article.sentiment.score < -0.2) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.2) return 'text-green-600';
    if (score < -0.2) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatDate = (dateString: string | undefined | null) => {
    try {
      // Get the most reliable date
      const dateToFormat = dateString || article.raw.created_at;
      if (!dateToFormat) {
        console.warn('No valid date available:', { 
          title: article.raw.title,
          publishedAt: dateString, 
          created_at: article.raw.created_at 
        });
        return 'Date unavailable';
      }

      const date = new Date(dateToFormat);
      
      // Log date parsing for debugging
      // console.debug('Date parsing in NewsCard:', {
      //   title: article.raw.title,
      //   original: dateToFormat,
      //   parsed: {
      //     date: date,
      //     isValid: !isNaN(date.getTime()),
      //     utc: date.toUTCString(),
      //     iso: date.toISOString()
      //   },
      //   timezone: {
      //     local: Intl.DateTimeFormat().resolvedOptions().timeZone,
      //     target: 'America/New_York'
      //   }
      // });
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date in NewsCard:', {
          title: article.raw.title,
          dateString: dateToFormat
        });
        return 'Invalid date';
      }
      
      // Format in New York timezone
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone: 'America/New_York',
        timeZoneName: 'short'
      }).format(date);
    } catch (error) {
      console.error('Date formatting error in NewsCard:', {
        error,
        title: article.raw.title,
        dateString
      });
      return 'Date error';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{article.raw.title}</h3>
      
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Clock className="w-4 h-4" />
          <span>{formatDate(article.raw.publishedAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          {getSentimentIcon()}
          {/* <span>
            Sentiment: {(article.sentiment.score * 100).toFixed(1)}%
            ({article.sentiment.confidence * 100}% confidence)
          </span> */}
        </div>
      </div>

      {/* Enhanced Sentiment Display */}
      {analysis && (
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            {getSentimentIcon()}
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getSentimentColor(analysis.sentiment.score)}`}>
                  {(analysis.sentiment.score * 100).toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500">
                  ({(analysis.sentiment.confidence * 100).toFixed(0)}% confidence)
                </span>
              </div>
              <span className="text-xs text-gray-500 capitalize">
                {analysis.sentiment.label} sentiment
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary if available */}
      {article.raw.naturalLanguage?.summary && (
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">AI Summary</span>
          </div>
          <p className="text-gray-600 text-sm">{article.raw.naturalLanguage.summary}</p>
        </div>
      )}

      {/* Full article content */}
      <div className="bg-gray-50 rounded-md p-4 mb-4">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <BookOpen className="w-4 h-4" />
          <span className="font-medium">Full Article</span>
        </div>
        <p className="text-gray-600 text-sm whitespace-pre-line">
          {(() => {
            // Try multiple sources for content in correct priority order
            let content = '';

            // First priority: raw.content (preserved from backend)
            if (article.raw?.content && article.raw.content !== 'No content available' && article.raw.content.length > 5) {
              content = article.raw.content;
            }
            // Second priority: top-level content
            else if (article.content && article.content !== 'No content available' && article.content.length > 5) {
              content = article.content;
            }
            // Third priority: summary
            else if (article.summary && article.summary !== 'No content available' && article.summary.length > 5) {
              content = article.summary;
            }

            // Enhanced debugging - only log once per article to avoid spam
            if (!content || content.length < 10) {
              const debugKey = `debug-${article.id}`;
              if (!window[debugKey]) {
                window[debugKey] = true;
                console.debug('No content found for article:', {
                  title: article.raw?.title || article.title,
                  id: article.id,
                  articleKeys: Object.keys(article),
                  rawKeys: article.raw ? Object.keys(article.raw) : 'no raw',
                  hasRawContent: !!article.raw?.content,
                  rawContentLength: article.raw?.content?.length || 0,
                  rawContentPreview: article.raw?.content?.substring(0, 50) || 'none',
                  hasContent: !!article.content,
                  contentLength: article.content?.length || 0,
                  contentPreview: article.content?.substring(0, 50) || 'none',
                  hasSummary: !!article.summary,
                  summaryLength: article.summary?.length || 0,
                  summaryPreview: article.summary?.substring(0, 50) || 'none'
                });
              }
            }

            if (content && content.length > 5) {
              return content.replace(/\d+\s+(?:minutes?|hours?|days?)\s+ago/i, '').trim();
            }
            return 'Content loading...';
          })()}
        </p>
      </div>

      {/* AI Analysis Section - Now with toggle */}
      <div className="mb-4">
        <button
          onClick={handleAnalysisToggle}
          className="flex items-center gap-2 text-gray-700 mb-2 hover:text-blue-600"
        >
          <BookOpen className="w-4 h-4" />
          <span className="font-medium">
            {showAnalysis ? 'Hide AI Analysis' : 'Show AI Analysis'}
          </span>
          {showAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showAnalysis && (
          <div>
            {loading ? (
              <div className="animate-pulse space-y-4 bg-blue-50 p-4 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-blue-200 rounded-full animate-bounce"></div>
                  <div>
                    <p className="text-blue-800 font-medium">Analysis in Queue</p>
                    <p className="text-blue-600 text-xs mt-1">
                      Due to API rate limits, analysis may take several minutes. 
                      Your request is queued and will be processed automatically.
                    </p>
                  </div>
                </div>
                <div className="h-4 bg-blue-100 rounded w-3/4"></div>
                <div className="h-4 bg-blue-100 rounded w-1/2"></div>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-md">
                  <h4 className="font-medium text-indigo-900 mb-2">Summary</h4>
                  <p className="text-indigo-800 text-sm">{analysis.summary}</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">Key Points</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.keyPoints.map((point, i) => (
                      <li key={i} className="text-blue-800 text-sm">{point}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-md">
                    <h4 className="font-medium text-green-900 mb-2">Short-term Impact</h4>
                    <p className="text-green-800 text-sm">{analysis.marketImpact.immediate}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-md">
                    <h4 className="font-medium text-purple-900 mb-2">Long-term Impact</h4>
                    <p className="text-purple-800 text-sm">{analysis.marketImpact.longTerm}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {analysis.marketImpact.affectedSectors.map((sector, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {sector}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-md">
                <p className="text-yellow-800 font-medium mb-1">Analysis Pending</p>
                <p className="text-yellow-700 text-sm">
                  Your analysis request is in the queue. Due to API rate limits, we process requests 
                  gradually to ensure service stability. Please check back in a few minutes.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related Indicators Section */}
      {analysis && analysis.relatedIndicators.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Activity className="w-4 h-4" />
            <span className="font-medium text-sm">Related Indicators</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.relatedIndicators.map((indicator, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-1"
              >
                <BarChart className="w-3 h-3" />
                {indicator}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Market Impact Section - Enhanced */}
      {analysis && (
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-700">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium text-sm">Market Impact</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-1">Short Term</p>
              <p className="text-sm text-gray-600">{analysis.marketImpact.immediate}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-1">Long Term</p>
              <p className="text-sm text-gray-600">{analysis.marketImpact.longTerm}</p>
            </div>
          </div>
        </div>
      )}

      {/* Diffbot Tags */}
      {article.raw.tags && article.raw.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Tag className="w-4 h-4" />
            <span className="font-medium">Topics</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {article.raw.tags.map((tag, i) => (
              <span 
                key={i} 
                className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                title={`Score: ${tag.score}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Existing entities */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {article.entities.companies.map((company, i) => (
            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {company}
            </span>
          ))}
          {article.entities.sectors.map((sector, i) => (
            <span key={i} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {sector}
            </span>
          ))}
        </div>
      </div>

      {/* Read more link */}
      <a href={article.raw.url} target="_blank" rel="noopener noreferrer" 
         className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
        Read full article <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
};