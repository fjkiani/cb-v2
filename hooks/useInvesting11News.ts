import { useQuery } from '@tanstack/react-query';

import { BACKEND_CONFIG } from '../services/backend/config';
const BACKEND_URL = BACKEND_CONFIG.BASE_URL;

export const useInvesting11News = () => {
  return useQuery({
    queryKey: ['investing11-news'],
    queryFn: async () => {
      const response = await fetch(`${BACKEND_URL}/api/investing11/news`);
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      const data = await response.json();
      return data.articles;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (renamed from cacheTime)
  });
};
