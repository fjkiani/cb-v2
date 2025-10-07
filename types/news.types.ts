// Defines the canonical structure for a news article within our application
// Mirrors backend/src/types/news.types.ts
export interface InternalArticle {
  id?: number | string; // Optional: Database ID might be added after storing
  title: string;
  url: string; 
  content?: string; // Often fetched separately or unavailable initially
  publishedAt: string; // ISO 8601 format string
  sourceName: string; // e.g., 'RealTimeNews', 'TradingEconomics'
  category?: string;
  createdAt?: string; // When we added it
  updatedAt?: string; // When we last updated it
}

// Add other shared news-related types here if needed 