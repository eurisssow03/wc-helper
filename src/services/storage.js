// Storage service for localStorage operations
import { STORAGE_KEYS } from '../utils/constants.js';

// Read from localStorage with fallback
export function readLS(key, fallback) { 
  try { 
    const txt = localStorage.getItem(key); 
    return txt ? JSON.parse(txt) : fallback;
  } catch (error) {
    console.error(`❌ Storage: Error reading ${key}:`, error);
    return fallback;
  }
}

// Write to localStorage
export function writeLS(key, value) { 
  try {
  localStorage.setItem(key, JSON.stringify(value)); 
    return true;
  } catch (error) {
    console.error(`❌ Storage: Error writing ${key}:`, error);
    return false;
  }
}

// Remove from localStorage
export function removeLS(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`❌ Storage: Error removing ${key}:`, error);
    return false;
  }
}

// Clear all application data
export function clearAllData() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('✅ Storage: All application data cleared');
    return true;
  } catch (error) {
    console.error('❌ Storage: Error clearing all data:', error);
    return false;
  }
}

// Get storage statistics
export function getStorageStats() {
  try {
    const stats = {
      totalKeys: 0,
      totalSize: 0,
      keys: {}
    };
    
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const value = localStorage.getItem(key);
      if (value) {
        stats.totalKeys++;
        stats.totalSize += value.length;
        stats.keys[name] = {
          key,
          size: value.length,
          hasData: true
        };
      } else {
        stats.keys[name] = {
          key,
          size: 0,
          hasData: false
        };
      }
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Storage: Error getting storage stats:', error);
    return null;
  }
}