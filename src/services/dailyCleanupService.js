// Daily cleanup service for local data
import { readLS, writeLS, STORAGE_KEYS } from './storage.js';

class DailyCleanupService {
  constructor() {
    this.cleanupInterval = null;
    this.isRunning = false;
    this.lastCleanup = null;
    
    console.log('🧹 DailyCleanupService: Initialized');
  }

  // Start daily cleanup
  start() {
    if (this.isRunning) {
      console.log('🧹 DailyCleanupService: Already running');
      return;
    }

    console.log('🧹 DailyCleanupService: Starting daily cleanup...');
    this.isRunning = true;

    // Run cleanup immediately
    this.runCleanup();

    // Set up daily interval (24 hours)
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, 24 * 60 * 60 * 1000); // 24 hours

    console.log('✅ DailyCleanupService: Daily cleanup started');
  }

  // Stop daily cleanup
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 DailyCleanupService: Daily cleanup stopped');
  }

  // Run cleanup process
  async runCleanup() {
    try {
      console.log('🧹 DailyCleanupService: Running cleanup...');
      const startTime = Date.now();
      
      // Clean up local data that should not be stored in database
      const cleanupResults = {
        messages: this.cleanupMessages(),
        logs: this.cleanupLogs(),
        conversationMemory: this.cleanupConversationMemory(),
        tempData: this.cleanupTempData()
      };

      const totalCleaned = Object.values(cleanupResults).reduce((sum, count) => sum + count, 0);
      const duration = Date.now() - startTime;
      
      this.lastCleanup = new Date().toISOString();
      
      console.log(`✅ DailyCleanupService: Cleanup completed in ${duration}ms`);
      console.log(`🧹 DailyCleanupService: Cleaned up ${totalCleaned} items:`, cleanupResults);
      
      return {
        success: true,
        totalCleaned,
        duration,
        results: cleanupResults,
        timestamp: this.lastCleanup
      };
    } catch (error) {
      console.error('❌ DailyCleanupService: Error during cleanup:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Clean up messages (keep only last 100)
  cleanupMessages() {
    try {
      const messages = readLS(STORAGE_KEYS.messages, []);
      
      if (messages.length <= 100) {
        console.log('🧹 DailyCleanupService: Messages count is within limit, no cleanup needed');
        return 0;
      }

      // Keep only the last 100 messages (most recent)
      const sortedMessages = messages.sort((a, b) => 
        new Date(b.received_at || b.created_at || 0) - new Date(a.received_at || a.created_at || 0)
      );
      
      const messagesToKeep = sortedMessages.slice(0, 100);
      const cleanedCount = messages.length - messagesToKeep.length;
      
      writeLS(STORAGE_KEYS.messages, messagesToKeep);
      
      console.log(`🧹 DailyCleanupService: Cleaned ${cleanedCount} old messages, kept ${messagesToKeep.length}`);
      return cleanedCount;
    } catch (error) {
      console.error('❌ DailyCleanupService: Error cleaning messages:', error);
      return 0;
    }
  }

  // Clean up logs (keep only last 200)
  cleanupLogs() {
    try {
      const logs = readLS(STORAGE_KEYS.logs, []);
      
      if (logs.length <= 200) {
        console.log('🧹 DailyCleanupService: Logs count is within limit, no cleanup needed');
        return 0;
      }

      // Keep only the last 200 logs (most recent)
      const sortedLogs = logs.sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      
      const logsToKeep = sortedLogs.slice(0, 200);
      const cleanedCount = logs.length - logsToKeep.length;
      
      writeLS(STORAGE_KEYS.logs, logsToKeep);
      
      console.log(`🧹 DailyCleanupService: Cleaned ${cleanedCount} old logs, kept ${logsToKeep.length}`);
      return cleanedCount;
    } catch (error) {
      console.error('❌ DailyCleanupService: Error cleaning logs:', error);
      return 0;
    }
  }

  // Clean up conversation memory (keep only last 50 conversations)
  cleanupConversationMemory() {
    try {
      const memory = readLS(STORAGE_KEYS.conversationMemory, {});
      
      const conversations = Object.keys(memory);
      
      if (conversations.length <= 50) {
        console.log('🧹 DailyCleanupService: Conversation memory count is within limit, no cleanup needed');
        return 0;
      }

      // Sort conversations by last updated time
      const sortedConversations = conversations.sort((a, b) => {
        const timeA = new Date(memory[a]?.lastUpdated || 0);
        const timeB = new Date(memory[b]?.lastUpdated || 0);
        return timeB - timeA;
      });

      // Keep only the last 50 conversations
      const conversationsToKeep = sortedConversations.slice(0, 50);
      const cleanedCount = conversations.length - conversationsToKeep.length;

      // Create new memory object with only kept conversations
      const newMemory = {};
      conversationsToKeep.forEach(phoneNumber => {
        newMemory[phoneNumber] = memory[phoneNumber];
      });

      writeLS(STORAGE_KEYS.conversationMemory, newMemory);
      
      console.log(`🧹 DailyCleanupService: Cleaned ${cleanedCount} old conversations, kept ${conversationsToKeep.length}`);
      return cleanedCount;
    } catch (error) {
      console.error('❌ DailyCleanupService: Error cleaning conversation memory:', error);
      return 0;
    }
  }

  // Clean up temporary data
  cleanupTempData() {
    try {
      let cleanedCount = 0;
      
      // Clean up old cache data
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('wc_cache_') || 
        key.startsWith('wc_temp_') ||
        key.startsWith('wc_session_')
      );
      
      cacheKeys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          const age = Date.now() - (data.timestamp || 0);
          
          // Remove data older than 7 days
          if (age > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        } catch (error) {
          // If data is not JSON or corrupted, remove it
          localStorage.removeItem(key);
          cleanedCount++;
        }
      });
      
      // Clean up old test data
      const testKeys = Object.keys(localStorage).filter(key => 
        key.includes('test_') || 
        key.includes('debug_') ||
        key.includes('temp_')
      );
      
      testKeys.forEach(key => {
        localStorage.removeItem(key);
        cleanedCount++;
      });
      
      if (cleanedCount > 0) {
        console.log(`🧹 DailyCleanupService: Cleaned ${cleanedCount} temporary data items`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('❌ DailyCleanupService: Error cleaning temp data:', error);
      return 0;
    }
  }

  // Manual cleanup trigger
  async triggerCleanup() {
    console.log('🧹 DailyCleanupService: Manual cleanup triggered');
    return await this.runCleanup();
  }

  // Get cleanup status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCleanup: this.lastCleanup,
      nextCleanup: this.isRunning ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
    };
  }

  // Get storage statistics
  getStorageStats() {
    try {
      const stats = {
        messages: readLS(STORAGE_KEYS.messages, []).length,
        logs: readLS(STORAGE_KEYS.logs, []).length,
        conversationMemory: Object.keys(readLS(STORAGE_KEYS.conversationMemory, {})).length,
        totalLocalStorage: Object.keys(localStorage).length,
        localStorageSize: JSON.stringify(localStorage).length
      };
      
      console.log('📊 DailyCleanupService: Storage stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ DailyCleanupService: Error getting storage stats:', error);
      return null;
    }
  }
}

// Create singleton instance
export const dailyCleanupService = new DailyCleanupService();
export default dailyCleanupService;
