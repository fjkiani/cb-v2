import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  BarChart3,
  Target,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface MarketOverviewDisplayProps {
  overview: string | null;
  isLoading: boolean;
  error: string | null;
  isNewsLoading: boolean;
}

interface CategoryData {
  name: string;
  count: number;
  articles: Array<{
    title: string;
    content: string;
    isPreview?: boolean;
  }>;
}

interface MarketIndicator {
  title: string;
  values: string[];
}

interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

export const MarketOverviewDisplay: React.FC<MarketOverviewDisplayProps> = ({
  overview,
  isLoading,
  error,
  isNewsLoading
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['executive-summary']));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const parsedData = useMemo(() => {
    if (!overview) return null;

    // Parse the markdown-style overview
    const lines = overview.split('\n');
    let currentSection = '';
    let executiveSummary = '';
    const marketIndicators: MarketIndicator[] = [];
    const categories: CategoryData[] = [];
    const sentimentData: SentimentData = { positive: 0, negative: 0, neutral: 0, total: 0 };
    const keyTakeaways: string[] = [];

    let currentCategory: CategoryData | null = null;
    let inCategorySection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        currentSection = trimmed.substring(2);
      } else if (trimmed.startsWith('## ')) {
        const subsection = trimmed.substring(3);
        if (subsection === 'Executive Summary') {
          currentSection = 'executive-summary';
        } else if (subsection === 'Key Market Indicators') {
          currentSection = 'market-indicators';
        } else if (subsection === 'Economic Data by Category') {
          currentSection = 'categories';
          inCategorySection = true;
        } else if (subsection === 'Market Sentiment Analysis') {
          currentSection = 'sentiment';
          inCategorySection = false;
        } else if (subsection === 'Key Takeaways') {
          currentSection = 'takeaways';
        }
      } else if (trimmed.startsWith('* **') && trimmed.endsWith('**') && currentSection === 'market-indicators') {
        // Parse category headers from **Category:** format
        const categoryMatch = trimmed.match(/\* \*\*([^:]+):\*\*/);
        if (categoryMatch) {
          currentCategory = {
            name: categoryMatch[1],
            count: 1, // We'll count articles as we find them
            articles: []
          };
          categories.push(currentCategory);
        }
      } else if (trimmed.startsWith('* ') && !trimmed.includes('**') && currentCategory && currentSection === 'market-indicators') {
        // Parse article content within categories
        if (trimmed.length > 20) {
          currentCategory.articles.push({
            title: `Article ${currentCategory.articles.length + 1}`,
            content: trimmed.substring(2),
            isPreview: false
          });
          currentCategory.count = currentCategory.articles.length;
        }
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**') && !currentCategory && inCategorySection) {
        // Fallback for other bold text in category sections
        const categoryName = trimmed.slice(2, -2);
        currentCategory = {
          name: categoryName,
          count: 0,
          articles: []
        };
        categories.push(currentCategory);
      } else if (trimmed.startsWith('* ') && currentCategory && inCategorySection) {
        // Parse content for category articles
        if (trimmed.length > 10) {
          currentCategory.articles.push({
            title: `Detail ${currentCategory.articles.length + 1}`,
            content: trimmed.substring(2),
            isPreview: false
          });
          currentCategory.count = currentCategory.articles.length;
        }
      } else if (trimmed.startsWith('• ') && currentSection === 'market-indicators') {
        // Parse market indicators from bullet points
        const indicatorText = trimmed.substring(2);
        const colonIndex = indicatorText.indexOf(':');
        if (colonIndex !== -1) {
          const title = indicatorText.substring(0, colonIndex).trim();
          const description = indicatorText.substring(colonIndex + 1).trim();
          marketIndicators.push({ title, values: [description] });
        }
      } else if (trimmed.startsWith('• Positive developments:') && currentSection === 'sentiment') {
        const match = trimmed.match(/• Positive developments: (\d+)/);
        if (match) sentimentData.positive = parseInt(match[1]);
      } else if (trimmed.startsWith('• Negative developments:') && currentSection === 'sentiment') {
        const match = trimmed.match(/• Negative developments: (\d+)/);
        if (match) sentimentData.negative = parseInt(match[1]);
      } else if (trimmed.startsWith('• Neutral/stable conditions:') && currentSection === 'sentiment') {
        const match = trimmed.match(/• Neutral\/stable conditions: (\d+)/);
        if (match) sentimentData.neutral = parseInt(match[1]);
      } else if (trimmed.includes('rate cut') || trimmed.includes('easing') || trimmed.includes('positive') || trimmed.includes('improvement')) {
        // Simple sentiment analysis based on keywords
        if (currentSection === 'sentiment' || currentSection === 'executive-summary') {
          if (trimmed.includes('rate cut') || trimmed.includes('easing') || trimmed.includes('positive') || trimmed.includes('improvement')) {
            sentimentData.positive++;
          } else if (trimmed.includes('decline') || trimmed.includes('weak') || trimmed.includes('concern') || trimmed.includes('uncertainty')) {
            sentimentData.negative++;
          } else {
            sentimentData.neutral++;
          }
        }
      } else if (trimmed.startsWith('• ') && currentSection === 'takeaways') {
        keyTakeaways.push(trimmed.substring(2));
      } else if (trimmed && currentSection === 'executive-summary' && !trimmed.startsWith('Based on analysis') && trimmed.length > 10) {
        executiveSummary += trimmed + ' ';
      } else if (trimmed && currentSection === 'market-indicators' && !trimmed.startsWith('• ') && trimmed.length > 20 && executiveSummary.length < 50) {
        // If executive summary is short, use content from market indicators as summary
        executiveSummary += trimmed + ' ';
      }
    }

    sentimentData.total = sentimentData.positive + sentimentData.negative + sentimentData.neutral;

    // Ensure we have at least some basic data
    if (sentimentData.total === 0) {
      sentimentData.neutral = 1;
      sentimentData.total = 1;
    }

    // If no categories were parsed but we have market indicators, create a general category
    if (categories.length === 0 && marketIndicators.length > 0) {
      categories.push({
        name: 'Market Developments',
        count: marketIndicators.length,
        articles: marketIndicators.map(indicator => ({
          title: indicator.title,
          content: indicator.values.join(', '),
          isPreview: false
        }))
      });
    }

    return {
      executiveSummary: executiveSummary.trim() || 'Market analysis generated based on recent economic data.',
      marketIndicators,
      categories,
      sentimentData,
      keyTakeaways
    };
  }, [overview]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Trading Economics - Market Overview
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin mr-2" size={20} />
            <span>Generating comprehensive market overview...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-red-200">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            Trading Economics - Market Overview
          </h3>
        </div>
        <div className="p-6">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Trading Economics - Market Overview
          </h3>
        </div>
        <div className="p-6">
          <p className="text-gray-500 italic">
            {isNewsLoading ? 'Loading news before generating overview...' : 'Market overview will be generated based on key articles.'}
          </p>
        </div>
      </div>
    );
  }

  if (!parsedData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-yellow-200">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-yellow-800">
            <BarChart3 className="w-5 h-5" />
            Trading Economics - Market Overview
          </h3>
        </div>
        <div className="p-6">
          <p className="text-yellow-700">Unable to parse market overview data.</p>
        </div>
      </div>
    );
  }

  const { executiveSummary, marketIndicators, categories, sentimentData, keyTakeaways } = parsedData;

  return (
    <div className="bg-white rounded-lg shadow-sm border mb-6">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Trading Economics - Market Overview
        </h3>
      </div>
      <div className="p-6 space-y-6">
        {/* Executive Summary */}
        <div>
          <button
            onClick={() => toggleSection('executive-summary')}
            className="flex items-center gap-2 p-0 h-auto font-semibold text-left hover:text-blue-600 bg-transparent border-none cursor-pointer"
          >
            {expandedSections.has('executive-summary') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Executive Summary
          </button>
          {expandedSections.has('executive-summary') && executiveSummary && (
            <p className="mt-2 text-gray-700">{executiveSummary}</p>
          )}
        </div>

        {/* Key Market Indicators */}
        <div>
          <button
            onClick={() => toggleSection('market-indicators')}
            className="flex items-center gap-2 p-0 h-auto font-semibold text-left hover:text-blue-600 bg-transparent border-none cursor-pointer"
          >
            {expandedSections.has('market-indicators') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Key Market Indicators
          </button>
          {expandedSections.has('market-indicators') && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {marketIndicators.map((indicator, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-md">
                  <p className="font-medium text-sm text-gray-900">{indicator.title}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {indicator.values.map((value, valueIndex) => (
                      <span key={valueIndex} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Economic Data by Category */}
        <div>
          <button
            onClick={() => toggleSection('categories')}
            className="flex items-center gap-2 p-0 h-auto font-semibold text-left hover:text-blue-600 bg-transparent border-none cursor-pointer"
          >
            {expandedSections.has('categories') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Economic Data by Category ({categories.length} categories)
          </button>
          {expandedSections.has('categories') && (
            <div className="mt-3 space-y-3">
              {categories.map((category, index) => (
                <div key={index} className="border rounded-md">
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="w-full justify-start p-3 h-auto font-medium text-left hover:text-blue-600 bg-transparent border-none cursor-pointer flex items-center"
                  >
                    {expandedCategories.has(category.name) ? (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-2" />
                    )}
                    {category.name}
                    <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded border">
                      {category.count}
                    </span>
                  </button>
                  {expandedCategories.has(category.name) && (
                    <div className="px-3 pb-3 space-y-2">
                      {category.articles.map((article, articleIndex) => (
                        <div key={articleIndex} className="bg-gray-50 p-3 rounded">
                          <h5 className="font-medium text-sm">{article.title}</h5>
                          {article.content && (
                            <p className="text-xs text-gray-600 mt-1">{article.content}</p>
                          )}
                          {article.isPreview && (
                            <p className="text-xs text-blue-600 mt-1">... and more articles</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Market Sentiment Analysis */}
        <div>
          <button
            onClick={() => toggleSection('sentiment')}
            className="flex items-center gap-2 p-0 h-auto font-semibold text-left hover:text-blue-600 bg-transparent border-none cursor-pointer"
          >
            {expandedSections.has('sentiment') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Market Sentiment Analysis
          </button>
          {expandedSections.has('sentiment') && (
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{sentimentData.positive}</div>
                  <div className="text-sm text-gray-600">Positive</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(sentimentData.positive / sentimentData.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{sentimentData.negative}</div>
                  <div className="text-sm text-gray-600">Negative</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${(sentimentData.negative / sentimentData.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{sentimentData.neutral}</div>
                  <div className="text-sm text-gray-600">Neutral</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-gray-600 h-2 rounded-full"
                      style={{ width: `${(sentimentData.neutral / sentimentData.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Key Takeaways */}
        <div>
          <button
            onClick={() => toggleSection('takeaways')}
            className="flex items-center gap-2 p-0 h-auto font-semibold text-left hover:text-blue-600 bg-transparent border-none cursor-pointer"
          >
            {expandedSections.has('takeaways') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Key Takeaways
          </button>
          {expandedSections.has('takeaways') && (
            <ul className="mt-3 space-y-2">
              {keyTakeaways.map((takeaway, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Target className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{takeaway}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
