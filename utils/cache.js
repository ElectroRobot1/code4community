/**
 * Centralized Caching Utility
 * Provides efficient, consistent caching across the application
 */

// Cache configuration
export const CACHE_CONFIG = {
  USER_DATA: 'brhs_user_cache',
  USER_PREFERENCES: 'brhs_user_preferences',
  MATHLAB_REQUESTS: 'brhs_mathlab_requests',
  MATHLAB_SESSIONS: 'brhs_mathlab_sessions',
  MATHLAB_ACTIVE_SESSIONS: 'brhs_mathlab_active_sessions',
  TUTORS_LIST: 'brhs_tutors_list',
  ADMINS_LIST: 'brhs_admins_list',
  SESSION_TRACKING: 'brhs_session_tracking',
  COURSES: 'brhs_courses',
  SETTINGS: 'brhs_settings',
  NAVIGATION: 'brhs_navigation_state',
  THEME: 'brhs_theme_preferences',
  NOTIFICATIONS: 'brhs_notifications',
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes default TTL
  USER_DATA_TTL: 30 * 60 * 1000, // 30 minutes for user data
  STATIC_DATA_TTL: 60 * 60 * 1000, // 1 hour for static data
};

// Cache metadata structure
const createCacheEntry = (data, ttl = CACHE_CONFIG.DEFAULT_TTL) => ({
  data,
  timestamp: Date.now(),
  ttl,
  version: '1.0.0',
  checksum: generateChecksum(data)
});

// Generate a simple checksum for data integrity
function generateChecksum(data) {
  if (!data) return '';
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

// Check if cache entry is valid
const isCacheValid = (entry) => {
  if (!entry) return false;
  const now = Date.now();
  
  // Check TTL
  if ((now - entry.timestamp) >= entry.ttl) {
    return false;
  }
  
  // Check version compatibility
  if (entry.version !== '1.0.0') {
    return false;
  }
  
  // Check data integrity
  if (entry.checksum && entry.data) {
    const currentChecksum = generateChecksum(entry.data);
    if (currentChecksum !== entry.checksum) {
      return false;
    }
  }
  
  return true;
};

// Enhanced cache operations with compression and validation
export const CacheManager = {
  // Set data in cache with TTL
  set(key, data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    try {
      const entry = createCacheEntry(data, ttl);
      const serialized = JSON.stringify(entry);
      localStorage.setItem(key, serialized);
      
      // Track cache operations for analytics
      this.trackCacheOperation('set', key, serialized.length);
      
      return true;
    } catch (error) {
      return false;
    }
  },

  // Get data from cache with validation
  get(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const entry = JSON.parse(cached);
      
      if (!isCacheValid(entry)) {
        this.remove(key);
        this.trackCacheOperation('expired', key, 0);
        return null;
      }

      this.trackCacheOperation('hit', key, cached.length);
      return entry.data;
    } catch (error) {
      this.remove(key);
      return null;
    }
  },

  // Remove specific cache entry
  remove(key) {
    try {
      localStorage.removeItem(key);
      this.trackCacheOperation('remove', key, 0);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Clear all application caches
  clearAll() {
    try {
      Object.values(CACHE_CONFIG).forEach(key => {
        if (typeof key === 'string' && key.startsWith('brhs_')) {
          localStorage.removeItem(key);
        }
      });
      this.trackCacheOperation('clear_all', 'all', 0);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Clear expired caches
  clearExpired() {
    try {
      Object.values(CACHE_CONFIG).forEach(key => {
        if (typeof key === 'string' && key.startsWith('brhs_')) {
          const cached = localStorage.getItem(key);
          if (cached) {
            try {
              const entry = JSON.parse(cached);
              if (!isCacheValid(entry)) {
                localStorage.removeItem(key);
              }
            } catch (e) {
              localStorage.removeItem(key);
            }
          }
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  // Get cache statistics
  getStats() {
    try {
      const stats = {
        totalKeys: 0,
        totalSize: 0,
        hitRate: 0,
        operations: this.cacheOperations || {}
      };

      Object.values(CACHE_CONFIG).forEach(key => {
        if (typeof key === 'string' && key.startsWith('brhs_')) {
          const cached = localStorage.getItem(key);
          if (cached) {
            stats.totalKeys++;
            stats.totalSize += cached.length;
          }
        }
      });

      return stats;
    } catch (error) {
      return null;
    }
  },

  // Track cache operations for analytics
  trackCacheOperation(operation, key, size) {
    if (!this.cacheOperations) {
      this.cacheOperations = {};
    }
    
    if (!this.cacheOperations[key]) {
      this.cacheOperations[key] = { hits: 0, misses: 0, sets: 0, removes: 0 };
    }
    
    this.cacheOperations[key][operation + 's']++;
  },

  // Batch operations for efficiency
  batchSet(operations) {
    try {
      operations.forEach(({ key, data, ttl }) => {
        this.set(key, data, ttl);
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  // Batch get for efficiency
  batchGet(keys) {
    try {
      return keys.reduce((result, key) => {
        result[key] = this.get(key);
        return result;
      }, {});
    } catch (error) {
      return {};
    }
  }
};

// Specialized cache functions for common use cases
export const UserCache = {
  setUserData(userData) {
    return CacheManager.set(CACHE_CONFIG.USER_DATA, userData, CACHE_CONFIG.USER_DATA_TTL);
  },

  getUserData() {
    return CacheManager.get(CACHE_CONFIG.USER_DATA);
  },

  clearUserData() {
    return CacheManager.remove(CACHE_CONFIG.USER_DATA);
  },

  setPreferences(preferences) {
    return CacheManager.set(CACHE_CONFIG.USER_PREFERENCES, preferences, CACHE_CONFIG.USER_DATA_TTL);
  },

  getPreferences() {
    return CacheManager.get(CACHE_CONFIG.USER_PREFERENCES);
  }
};

export const MathLabCache = {
  setRequests(requests) {
    return CacheManager.set(CACHE_CONFIG.MATHLAB_REQUESTS, requests, CACHE_CONFIG.DEFAULT_TTL);
  },

  getRequests() {
    return CacheManager.get(CACHE_CONFIG.MATHLAB_REQUESTS);
  },

  setSessions(sessions) {
    return CacheManager.set(CACHE_CONFIG.MATHLAB_SESSIONS, sessions, CACHE_CONFIG.STATIC_DATA_TTL); // Use longer TTL for session history
  },

  getSessions() {
    return CacheManager.get(CACHE_CONFIG.MATHLAB_SESSIONS);
  },

  setActiveSessions(sessions) {
    return CacheManager.set(CACHE_CONFIG.MATHLAB_ACTIVE_SESSIONS, sessions, CACHE_CONFIG.DEFAULT_TTL);
  },

  getActiveSessions() {
    return CacheManager.get(CACHE_CONFIG.MATHLAB_ACTIVE_SESSIONS);
  },

  setSessionTracking(sessions) {
    return CacheManager.set(CACHE_CONFIG.SESSION_TRACKING, sessions, CACHE_CONFIG.DEFAULT_TTL);
  },

  getSessionTracking() {
    return CacheManager.get(CACHE_CONFIG.SESSION_TRACKING);
  },

  clearAll() {
    CacheManager.remove(CACHE_CONFIG.MATHLAB_REQUESTS);
    CacheManager.remove(CACHE_CONFIG.MATHLAB_SESSIONS);
    CacheManager.remove(CACHE_CONFIG.MATHLAB_ACTIVE_SESSIONS);
    CacheManager.remove(CACHE_CONFIG.SESSION_TRACKING);
  }
};

export const AdminCache = {
  setTutors(tutors) {
    return CacheManager.set(CACHE_CONFIG.TUTORS_LIST, tutors, CACHE_CONFIG.DEFAULT_TTL);
  },

  getTutors() {
    return CacheManager.get(CACHE_CONFIG.TUTORS_LIST);
  },

  setAdmins(admins) {
    return CacheManager.set(CACHE_CONFIG.ADMINS_LIST, admins, CACHE_CONFIG.DEFAULT_TTL);
  },

  getAdmins() {
    return CacheManager.get(CACHE_CONFIG.ADMINS_LIST);
  },

  clearAll() {
    CacheManager.remove(CACHE_CONFIG.TUTORS_LIST);
    CacheManager.remove(CACHE_CONFIG.ADMINS_LIST);
  }
};

export const SettingsCache = {
  setSettings(settings) {
    return CacheManager.set(CACHE_CONFIG.SETTINGS, settings, CACHE_CONFIG.STATIC_DATA_TTL);
  },

  getSettings() {
    return CacheManager.get(CACHE_CONFIG.SETTINGS);
  },

  setTheme(theme) {
    return CacheManager.set(CACHE_CONFIG.THEME, theme, CACHE_CONFIG.STATIC_DATA_TTL);
  },

  getTheme() {
    return CacheManager.get(CACHE_CONFIG.THEME);
  }
};

// Cache invalidation is now handled by cacheInvalidation.js

// Performance monitoring
export const CachePerformance = {
  startTiming(operation) {
    return {
      operation,
      startTime: performance.now()
    };
  },

  endTiming(timing) {
    const duration = performance.now() - timing.startTime;
    return duration;
  },

  // Monitor cache hit rates
  getHitRates() {
    const stats = CacheManager.getStats();
    if (!stats.operations) return {};

    return Object.keys(stats.operations).reduce((rates, key) => {
      const ops = stats.operations[key];
      const total = ops.hits + ops.misses;
      rates[key] = total > 0 ? (ops.hits / total) * 100 : 0;
      return rates;
    }, {});
  }
};

// Initialize cache cleanup on app start
if (typeof window !== 'undefined') {
  // Clear expired caches on app initialization
  CacheManager.clearExpired();
  
  // Set up periodic cleanup (every 10 minutes)
  setInterval(() => {
    CacheManager.clearExpired();
  }, 10 * 60 * 1000);
}

export default CacheManager;
