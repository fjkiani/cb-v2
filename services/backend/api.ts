import { BACKEND_CONFIG } from './config';
import { retry } from '../../utils/retry';
import type { ScraperError } from './types';
import { authService } from '../supabase/client';

class BackendAPI {
  private baseUrl: string;
  private static instance: BackendAPI;

  private constructor() {
    // Use the configured backend URL
    this.baseUrl = BACKEND_CONFIG.BASE_URL;
    console.log('BackendAPI initialized with URL:', this.baseUrl);
  }

  static getInstance() {
    if (!BackendAPI.instance) {
      BackendAPI.instance = new BackendAPI();
    }
    return BackendAPI.instance;
  }

  // Get authentication headers
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const session = await authService.getCurrentSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }

    return headers;
  }

  async getRecentArticles() {
    const url = `${this.baseUrl}/api/news`;
    console.log('Fetching news from:', url);

    try {
      const headers = await this.getAuthHeaders();
      const response = await retry(
        async () => {
          const res = await fetch(url, {
            method: 'GET',
            headers,
          });

          // Check response before returning
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res;
        },
        {
          attempts: 3,
          delay: 1000,
          onError: (error, attempt) => {
            console.warn(`Attempt ${attempt} failed:`, error.message);
          }
        }
      );

      const data = await response.json();
      console.log('Successfully fetched articles:', data.length);
      return data;
    } catch (error) {
      console.error('Failed to fetch news:', error);
      throw new Error(`Failed to fetch news: ${error.message}`);
    }
  }

  async post(endpoint: string, data: any) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('Posting to:', url);

    try {
      const headers = await this.getAuthHeaders();
      const response = await retry(
        async () => {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
          });

          // Check response before returning
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res;
        },
        {
          attempts: 3,
          delay: 1000,
          onError: (error, attempt) => {
            console.warn(`Attempt ${attempt} failed:`, error.message);
          }
        }
      );

      const result = await response.json();
      console.log('Successfully posted to:', endpoint);
      return result;
    } catch (error) {
      console.error('Failed to post:', error);
      throw new Error(`Failed to post: ${error.message}`);
    }
  }
}

export const backendAPI = BackendAPI.getInstance();