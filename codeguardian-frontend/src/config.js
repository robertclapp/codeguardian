/**
 * Configuration for CodeGuardian Frontend
 * Handles environment-specific settings for different deployment platforms
 */

const config = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL || 
           (import.meta.env.DEV ? 'http://localhost:5000' : 'https://codeguardian-api.onrender.com'),
  
  // Application Settings
  APP_NAME: import.meta.env.VITE_APP_NAME || 'CodeGuardian',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Authentication
  GITHUB_CLIENT_ID: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
  
  // Feature Flags
  ENABLE_GITHUB_AUTH: import.meta.env.VITE_ENABLE_GITHUB_AUTH !== 'false',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_ERROR_REPORTING: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
  
  // UI Configuration
  THEME: import.meta.env.VITE_THEME || 'light',
  DEFAULT_LANGUAGE: import.meta.env.VITE_DEFAULT_LANGUAGE || 'en',
  
  // Performance Settings
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_RETRY_ATTEMPTS) || 3,
  
  // Development Settings
  DEBUG: import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true',
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || (import.meta.env.DEV ? 'debug' : 'error'),
}

// Validation
if (!config.API_URL) {
  console.error('API_URL is not configured. Please set VITE_API_URL environment variable.')
}

if (config.ENABLE_GITHUB_AUTH && !config.GITHUB_CLIENT_ID) {
  console.warn('GitHub authentication is enabled but GITHUB_CLIENT_ID is not set.')
}

// Export configuration
export default config

// Named exports for convenience
export const {
  API_URL,
  APP_NAME,
  APP_VERSION,
  GITHUB_CLIENT_ID,
  ENABLE_GITHUB_AUTH,
  ENABLE_ANALYTICS,
  ENABLE_ERROR_REPORTING,
  THEME,
  DEFAULT_LANGUAGE,
  API_TIMEOUT,
  RETRY_ATTEMPTS,
  DEBUG,
  LOG_LEVEL
} = config

