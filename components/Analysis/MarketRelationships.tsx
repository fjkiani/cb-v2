import React, { useState, useEffect } from 'react';
import { Network, TrendingUp, TrendingDown, RefreshCw, AlertCircle, BarChart3 } from 'lucide-react';
import { BACKEND_CONFIG } from '../../services/backend/config';

interface Relationship {
  source: string;
  target: string;
  strength: number;
  type: 'positive' | 'negative' | 'neutral';
  correlation: number;
}

interface MarketRelationshipsProps {
  relationships?: Relationship[];
}

export const MarketRelationships: React.FC<MarketRelationshipsProps> = ({ relationships = [] }) => {
  const [data, setData] = useState<Relationship[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRelationships = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, create sample relationship data
      // TODO: Replace with real API call when backend is ready
      const sampleRelationships: Relationship[] = [
        { source: 'S&P 500', target: 'Nasdaq 100', strength: 0.85, type: 'positive', correlation: 0.85 },
        { source: 'S&P 500', target: '10-Year Treasury', strength: 0.72, type: 'negative', correlation: -0.72 },
        { source: 'Gold', target: 'US Dollar', strength: 0.68, type: 'negative', correlation: -0.68 },
        { source: 'Oil', target: 'US Dollar', strength: 0.75, type: 'positive', correlation: 0.75 },
        { source: 'Bitcoin', target: 'Nasdaq 100', strength: 0.62, type: 'positive', correlation: 0.62 },
        { source: 'VIX', target: 'S&P 500', strength: 0.78, type: 'negative', correlation: -0.78 },
      ];

      setData(sampleRelationships);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch relationship data');
      console.error('Error fetching market relationships:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, []);

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'negative':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Analyzing market relationships...</span>
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
            onClick={fetchRelationships}
            className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayData = data || relationships;

  if (!displayData || displayData.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center py-8 text-gray-500">
          <Network className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No relationship data available</p>
          <button
            onClick={fetchRelationships}
            className="mt-4 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded text-sm"
          >
            Load Sample Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Network className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Market Relationships</h3>
              <p className="text-sm text-gray-600">Asset correlations and relationships</p>
            </div>
          </div>
          <button
            onClick={fetchRelationships}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Refresh relationships analysis"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Relationships List */}
      <div className="p-6">
        <div className="space-y-4">
          {displayData.map((relationship, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getRelationshipColor(relationship.type)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getRelationshipIcon(relationship.type)}
                  <div>
                    <div className="font-semibold">
                      {relationship.source} ↔ {relationship.target}
                    </div>
                    <div className="text-sm opacity-75">
                      {relationship.type.charAt(0).toUpperCase() + relationship.type.slice(1)} Correlation
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold">
                    {(relationship.correlation * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm opacity-75">
                    Strength: {(relationship.strength * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Correlation Bar */}
              <div className="mt-3">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">-100%</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        relationship.correlation > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.abs(relationship.correlation) * 100}%`,
                        marginLeft: relationship.correlation < 0 ? `${(1 - Math.abs(relationship.correlation)) * 100}%` : '0%'
                      }}
                    />
                  </div>
                  <span className="text-gray-600">+100%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Statistics */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Relationship Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{displayData.length}</div>
              <div className="text-sm text-blue-700">Total Relationships</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {displayData.filter(r => r.correlation > 0.5).length}
              </div>
              <div className="text-sm text-green-700">Strong Positive</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {displayData.filter(r => r.correlation < -0.5).length}
              </div>
              <div className="text-sm text-red-700">Strong Negative</div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Showing {displayData.length} key relationships</span>
            <span>Sample data for demonstration</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};