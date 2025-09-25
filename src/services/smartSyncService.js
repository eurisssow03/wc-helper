// Smart sync service for PostgreSQL - only syncs data when needed for incoming queries
import { postgresService } from './postgresService.js';
import { readLS, writeLS, STORAGE_KEYS } from './storage.js';

class SmartSyncService {
  constructor() {
    this.syncQueue = new Set(); // Track tables that need syncing
    this.isProcessing = false;
    this.syncPromises = new Map(); // Track ongoing sync operations
    
    console.log('🔄 SmartSyncService: Initialized with PostgreSQL and query-triggered syncing');
  }

  // Trigger sync for specific tables when query is needed
  async triggerSync(tables, context = 'unknown') {
    console.log(`🔄 SmartSync: Triggering sync for [${tables.join(', ')}] - Context: ${context}`);
    
    // Add to sync queue
    tables.forEach(table => this.syncQueue.add(table));
    
    // Process sync queue
    return this.processSyncQueue();
  }

  // Process the sync queue
  async processSyncQueue() {
    if (this.isProcessing || this.syncQueue.size === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 SmartSync: Processing ${this.syncQueue.size} tables in queue`);

    try {
      const syncPromises = Array.from(this.syncQueue).map(async (table) => {
        // Check if sync is already in progress
        if (this.syncPromises.has(table)) {
          return this.syncPromises.get(table);
        }

        const syncPromise = this.syncTable(table);
        this.syncPromises.set(table, syncPromise);
        
        try {
          const result = await syncPromise;
          return result;
        } finally {
          this.syncPromises.delete(table);
        }
      });

      await Promise.all(syncPromises);
      
      // Clear sync queue
      this.syncQueue.clear();
      
      console.log('✅ SmartSync: All tables synced successfully');
    } catch (error) {
      console.error('❌ SmartSync: Error processing sync queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Sync a single table
  async syncTable(tableName) {
    try {
      console.log(`🔄 SmartSync: Syncing ${tableName}`);
      
      // Get data from PostgreSQL
      const postgresData = await postgresService.getAll(tableName);
      
      // Update localStorage as backup
      const storageKey = STORAGE_KEYS[tableName] || tableName;
      writeLS(storageKey, postgresData);
      
      console.log(`✅ SmartSync: ${tableName} synced (${postgresData.length} items)`);
      return postgresData;
    } catch (error) {
      console.error(`❌ SmartSync: Error syncing ${tableName}:`, error);
      
      // Fallback to localStorage
      const storageKey = STORAGE_KEYS[tableName] || tableName;
      const localData = readLS(storageKey, []);
      console.log(`🔄 SmartSync: Using localStorage fallback for ${tableName} (${localData.length} items)`);
      return localData;
    }
  }

  // Get data with smart syncing (only syncs when needed)
  async getData(tableName, context = 'query') {
    console.log(`🔄 SmartSync: Getting ${tableName} data - Context: ${context}`);
    
    // Add to sync queue
    this.syncQueue.add(tableName);
    
    // Process sync queue
    await this.processSyncQueue();
    
    // Return data from localStorage
    const storageKey = STORAGE_KEYS[tableName] || tableName;
    return readLS(storageKey, []);
  }

  // Get multiple tables with smart syncing
  async getMultipleData(tableNames, context = 'query') {
    console.log(`🔄 SmartSync: Getting multiple tables [${tableNames.join(', ')}] - Context: ${context}`);
    
    // Add all to sync queue
    tableNames.forEach(table => this.syncQueue.add(table));
    
    // Process sync queue
    await this.processSyncQueue();
    
    // Return data from localStorage
    const result = {};
    tableNames.forEach(tableName => {
      const storageKey = STORAGE_KEYS[tableName] || tableName;
      result[tableName] = readLS(storageKey, []);
    });
    
    return result;
  }

  // Save data and trigger selective sync
  async saveData(tableName, data, id = null) {
    try {
      console.log(`🔄 SmartSync: Saving to ${tableName}`);
      
      // Save to PostgreSQL
      const result = await postgresService.save(tableName, data, id);
      
      // Update localStorage immediately
      const storageKey = STORAGE_KEYS[tableName] || tableName;
      const localData = readLS(storageKey, []);
      
      if (id) {
        // Update existing item
        const index = localData.findIndex(item => item.id === id);
        if (index >= 0) {
          localData[index] = result;
        } else {
          localData.push(result);
        }
      } else {
        // Add new item
        localData.push(result);
      }
      
      writeLS(storageKey, localData);
      
      console.log(`✅ SmartSync: Saved to ${tableName}`);
      return result;
    } catch (error) {
      console.error(`❌ SmartSync: Error saving to ${tableName}:`, error);
      throw error;
    }
  }

  // Delete data and trigger selective sync
  async deleteData(tableName, id) {
    try {
      console.log(`🔄 SmartSync: Deleting ${id} from ${tableName}`);
      
      // Delete from PostgreSQL
      await postgresService.delete(tableName, id);
      
      // Update localStorage immediately
      const storageKey = STORAGE_KEYS[tableName] || tableName;
      const localData = readLS(storageKey, []);
      const filteredData = localData.filter(item => item.id !== id);
      writeLS(storageKey, filteredData);
      
      console.log(`✅ SmartSync: Deleted ${id} from ${tableName}`);
      return true;
    } catch (error) {
      console.error(`❌ SmartSync: Error deleting from ${tableName}:`, error);
      throw error;
    }
  }

  // Batch save with selective sync
  async batchSave(tableName, items) {
    try {
      console.log(`🔄 SmartSync: Batch saving ${items.length} items to ${tableName}`);
      
      // Save to PostgreSQL
      const results = await postgresService.batchInsert(tableName, items);
      
      // Update localStorage immediately
      const storageKey = STORAGE_KEYS[tableName] || tableName;
      const localData = readLS(storageKey, []);
      const updatedData = [...localData, ...results];
      writeLS(storageKey, updatedData);
      
      console.log(`✅ SmartSync: Batch saved ${results.length} items to ${tableName}`);
      return results;
    } catch (error) {
      console.error(`❌ SmartSync: Error batch saving to ${tableName}:`, error);
      throw error;
    }
  }

  // Force sync all tables (use sparingly)
  async forceSyncAll() {
    console.log('🔄 SmartSync: Force syncing all tables');
    
    const tables = [
      'users',
      'homestays',
      'faqs', 
      'logs',
      'messages',
      'conversation_memory',
      'settings'
    ];
    
    return this.triggerSync(tables, 'force-sync-all');
  }

  // Get sync statistics
  getSyncStats() {
    const stats = {
      queueSize: this.syncQueue.size,
      isProcessing: this.isProcessing,
      ongoingSyncs: this.syncPromises.size,
      postgresStats: postgresService.getCacheStats()
    };
    
    console.log('🔄 SmartSync: Stats:', stats);
    return stats;
  }

  // Clear all caches and queues
  clearAll() {
    this.syncQueue.clear();
    this.syncPromises.clear();
    postgresService.clearAllCache();
    console.log('🔄 SmartSync: Cleared all caches and queues');
  }
}

// Create singleton instance
export const smartSyncService = new SmartSyncService();
export default smartSyncService;
