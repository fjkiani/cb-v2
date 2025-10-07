import React, { useState } from 'react';
import { useMarketContext } from '../../hooks/useMarketContext';
import { Loader2, AlertCircle, BrainCircuit, Clock, RefreshCw } from 'lucide-react';
import { BACKEND_CONFIG } from '../../services/backend/config';

// Helper function to format the timestamp
const formatTimestamp = (isoString: string | null): string => {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    return date.toLocaleString([], { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

export const MarketContextDisplay: React.FC = () => {
  const { contextText, generatedAt, loading, error, refetch } = useMarketContext();
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const generateContext = async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/context/generate-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Wait a bit for context generation to complete
      setTimeout(() => {
        refetch(); // Refresh the context display
      }, 10000); // Wait 10 seconds

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate context';
      setGenerateError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-xl font-semibold text-indigo-800 flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-indigo-600" />
          Overall Market Context
        </h2>
        <button
          onClick={generateContext}
          disabled={generating || loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-400"
          title={generating ? 'Generating fresh market context...' : 'Generate fresh market context using latest news and data'}
        >
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating...' : 'Generate Fresh'}
        </button>
      </div>

      {(loading || generating) && (
        <div className="flex justify-center items-center p-6 text-indigo-700">
          <Loader2 className="animate-spin mr-2" size={20} />
          {generating ? 'Generating fresh market context...' : 'Loading Market Context...'}
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-100 border border-red-300 rounded-md p-3 flex items-center gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading context:</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {generateError && !generating && (
        <div className="bg-orange-100 border border-orange-300 rounded-md p-3 flex items-center gap-3 text-orange-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error generating context:</p>
            <p className="text-sm">{generateError}</p>
          </div>
        </div>
      )}

      {!loading && !error && contextText && (
        <div className="space-y-3">
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {contextText}
          </p>
          <div className="text-xs text-gray-500 flex items-center justify-end gap-1 pt-2 border-t border-indigo-100">
            <Clock size={12} />
            <span>Last Generated: {formatTimestamp(generatedAt)}</span>
          </div>
        </div>
      )}
      
      {/* Handle the case where loading is false, no error, but context is null (e.g., initial state before fetch or 404) */} 
      {!loading && !error && !contextText && (
          <p className="text-sm text-gray-500 italic p-4 text-center">
            Market context is currently unavailable. Try generating it.
          </p>
      )}
    </div>
  );
}; 