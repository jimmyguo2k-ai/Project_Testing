const config = {
  // Model IDs for each agent layer
  models: {
    screenwriter: 'claude-opus-4-6',
    director: 'claude-sonnet-4-6',
    actor: 'claude-sonnet-4-6',
    summarizer: 'claude-haiku-4-5-20251001',
  },

  // Token limits per agent
  maxTokens: {
    screenwriter: 16384,
    director: 2048,
    actor: 4096,
    summarizer: 512,
  },

  // Story loop settings
  storyLoop: {
    bibleRefreshInterval: 20,   // Refresh bible every N turns
    summarizeInterval: 10,      // Compress history every N turns
    recentTurnsForDirector: 3,  // How many recent turns director sees
    targetProseWords: { min: 800, max: 1500 },
  },

  // Server
  port: process.env.PORT || 3001,
};

module.exports = config;
