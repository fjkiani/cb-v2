import { useState, useEffect } from 'react';

// Use the configured backend URL
import { BACKEND_CONFIG } from '../services/backend/config';
const API_ENDPOINT = `${BACKEND_CONFIG.BASE_URL}/api/context/latest`;

// Interface for the expected API response
interface MarketContextResponse {
  contextText: string;
  generatedAt: string; // ISO string
}

// Interface for the hook's return value
interface UseMarketContextReturn {
  contextText: string | null;
  generatedAt: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void; // Function to manually trigger a refetch
}

export const useMarketContext = (): UseMarketContextReturn => {
  const [contextText, setContextText] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [triggerRefetch, setTriggerRefetch] = useState<number>(0); // State to trigger refetch

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    // Optionally clear previous state on refetch, or keep it while loading
    // setContextText(null);
    // setGeneratedAt(null);

    try {
      const response = await fetch(API_ENDPOINT);
      console.log(`[useMarketContext] Fetch response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 404) {
          // Handle case where no context has been generated yet
          setError('No market context has been generated yet.');
          setContextText(null);
          setGeneratedAt(null);
        } else {
          // Handle other HTTP errors
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || response.statusText}`);
        }
      } else {
        // Process successful response
        const data: MarketContextResponse = await response.json();
        setContextText(data.contextText);
        setGeneratedAt(data.generatedAt);
        setError(null); // Clear any previous error
        console.log(`[useMarketContext] Successfully fetched context generated at: ${data.generatedAt}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setContextText(null); // Clear data on error
      setGeneratedAt(null);
      console.error("[useMarketContext] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [triggerRefetch]); // Refetch when triggerRefetch changes

  const refetch = () => {
    setTriggerRefetch(prev => prev + 1); // Increment trigger to refetch
  };

  return { contextText, generatedAt, loading, error, refetch };
}; 