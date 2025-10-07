export const config = {
  // Backend URL - use environment variable with fallbacks
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL ||
               'https://web-production-9a14.up.railway.app',
  
  // Other config values
  API_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 15 * 60 * 1000, // 15 minutes
} as const;

// Debug log to verify configuration
console.log('App Configuration:', {
  mode: import.meta.env.MODE,
  backendUrl: config.BACKEND_URL,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD
});
