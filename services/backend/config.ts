export const BACKEND_CONFIG = {
  BASE_URL: 'https://web-production-9a14.up.railway.app', // Railway backend URL
  HEALTH_CHECK_INTERVAL: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// Debug log to verify environment
console.log('Current environment:', {
  mode: import.meta.env.MODE,
  baseUrl: BACKEND_CONFIG.BASE_URL
});