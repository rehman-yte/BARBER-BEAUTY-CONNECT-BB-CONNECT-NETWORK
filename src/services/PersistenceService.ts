/**
 * PersistenceService handles client-side caching of critical data in localStorage.
 * This ensures that data is not lost after a page refresh, even if the server is slow.
 */

export const StorageManager = {
  /**
   * Clears non-critical data (caches) to free up space.
   */
  clearNonCritical: () => {
    console.warn('StorageManager: Clearing non-critical caches to free up space...');
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      // Clear all keys starting with bb_cache_
      if (key.startsWith('bb_cache_')) {
        localStorage.removeItem(key);
      }
    });
  },

  /**
   * Aggressively clears almost everything except session data.
   */
  emergencyClear: () => {
    console.error('StorageManager: EMERGENCY CLEAR - Removing all non-session data!');
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (!key.includes('session') && !key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
  },

  /**
   * Strips large base64 strings from an object to reduce its size.
   */
  optimizeData: (data: any): any => {
    if (!data) return data;
    
    // If it's an array, optimize each element
    if (Array.isArray(data)) {
      return data.map(item => StorageManager.optimizeData(item));
    }
    
    // If it's an object, strip large strings
    if (typeof data === 'object') {
      const optimized: any = {};
      for (const key in data) {
        const value = data[key];
        if (typeof value === 'string' && value.startsWith('data:image/') && value.length > 1000) {
          optimized[key] = null; // Strip large base64 strings
        } else if (typeof value === 'object') {
          optimized[key] = StorageManager.optimizeData(value);
        } else {
          optimized[key] = value;
        }
      }
      return optimized;
    }
    
    return data;
  }
};

export const PersistenceService = {
  save: (key: string, data: any) => {
    const fullKey = `bb_cache_${key}`;
    try {
      localStorage.setItem(fullKey, JSON.stringify(data));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn(`PersistenceService: Quota exceeded for ${key}. Attempting optimization...`);
        StorageManager.clearNonCritical();
        
        try {
          // Try saving again after clearing other caches
          localStorage.setItem(fullKey, JSON.stringify(data));
        } catch (innerE) {
          console.warn(`PersistenceService: Still exceeding quota for ${key}. Saving optimized version...`);
          // If still failing, save an optimized version (no images)
          const optimizedData = StorageManager.optimizeData(data);
          try {
            localStorage.setItem(fullKey, JSON.stringify(optimizedData));
            console.info(`PersistenceService: Successfully saved optimized version of ${key}.`);
          } catch (finalE) {
            console.error(`PersistenceService: CRITICAL - Failed to save even optimized version of ${key}.`, finalE);
            StorageManager.emergencyClear();
          }
        }
      } else {
        console.error('Failed to save to localStorage', e);
      }
    }
  },

  load: (key: string) => {
    try {
      const data = localStorage.getItem(`bb_cache_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to load from localStorage', e);
      return null;
    }
  },

  clear: (key: string) => {
    localStorage.removeItem(`bb_cache_${key}`);
  }
};
