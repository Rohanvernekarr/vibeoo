// config.js - Configuration file for API keys and settings
const CONFIG = {
  // Replace these with your actual API keys
  GEMINI_API_KEY: 'AIzaSyBVc64e42TzQDMWK0OkZTz_DzbOcIGfwJs',
  YOUTUBE_API_KEY: 'AIzaSyD-oUfK9ApNBpTi5v6MPNMtZCdl-JI1qP8',
  
  // API endpoints
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  YOUTUBE_API_BASE: 'https://www.googleapis.com/youtube/v3',
  
  // Extension settings
  MAX_SUMMARY_LENGTH: 2000,
  MAX_TIMESTAMPS: 10,
  TIMESTAMP_THRESHOLD: 30, // seconds between timestamps
  
  // UI settings
  POPUP_WIDTH: 700,
  POPUP_HEIGHT: 600
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
} 