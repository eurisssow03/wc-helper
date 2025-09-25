// Migration Service
// Handles migration from localStorage to database

import databaseService from '../services/databaseService.js';
import { readLS, STORAGE_KEYS } from './storage.js';

class MigrationService {
  constructor() {
    this.migrationStatus = this.getMigrationStatus();
  }

  // Get migration status from localStorage
  getMigrationStatus() {
    try {
      const status = localStorage.getItem('wc_migration_status');
      return status ? JSON.parse(status) : {
        completed: false,
        timestamp: null,
        itemsMigrated: 0,
        errors: []
      };
    } catch (error) {
      console.error('❌ Error reading migration status:', error);
      return {
        completed: false,
        timestamp: null,
        itemsMigrated: 0,
        errors: []
      };
    }
  }

  // Save migration status to localStorage
  saveMigrationStatus(status) {
    try {
      localStorage.setItem('wc_migration_status', JSON.stringify(status));
    } catch (error) {
      console.error('❌ Error saving migration status:', error);
    }
  }

  // Check if migration is needed
  isMigrationNeeded() {
    // Check if database is available
    if (!databaseService.isDatabaseAvailable()) {
      return false;
    }

    // Check if migration was already completed
    if (this.migrationStatus.completed) {
      return false;
    }

    // Check if there's data in localStorage to migrate
    const hasData = this.hasLocalStorageData();
    return hasData;
  }

  // Check if localStorage has data to migrate
  hasLocalStorageData() {
    const keys = [
      STORAGE_KEYS.users,
      STORAGE_KEYS.homestays,
      STORAGE_KEYS.faqs,
      STORAGE_KEYS.settings,
      STORAGE_KEYS.messages,
      STORAGE_KEYS.logs,
      STORAGE_KEYS.conversationMemory,
      STORAGE_KEYS.homestayGeneralKnowledge
    ];

    return keys.some(key => {
      const data = localStorage.getItem(key);
      return data && data !== '[]' && data !== '{}' && data !== '""';
    });
  }

  // Perform migration
  async migrateToDatabase() {
    console.log('🔄 Starting migration from localStorage to database...');
    
    const migrationStatus = {
      completed: false,
      timestamp: new Date().toISOString(),
      itemsMigrated: 0,
      errors: []
    };

    try {
      // Check if database is available
      const isDbAvailable = await databaseService.isDatabaseAvailable();
      if (!isDbAvailable) {
        throw new Error('Database is not available');
      }

      // Migrate each data type
      const migrationTasks = [
        { key: 'users', name: 'Users', method: this.migrateUsers.bind(this) },
        { key: 'homestays', name: 'Homestays', method: this.migrateHomestays.bind(this) },
        { key: 'faqs', name: 'FAQs', method: this.migrateFAQs.bind(this) },
        { key: 'settings', name: 'Settings', method: this.migrateSettings.bind(this) },
        { key: 'messages', name: 'Messages', method: this.migrateMessages.bind(this) },
        { key: 'logs', name: 'Logs', method: this.migrateLogs.bind(this) },
        { key: 'conversationMemory', name: 'Conversation Memory', method: this.migrateConversationMemory.bind(this) },
        { key: 'generalKnowledge', name: 'General Knowledge', method: this.migrateGeneralKnowledge.bind(this) }
      ];

      for (const task of migrationTasks) {
        try {
          console.log(`🔄 Migrating ${task.name}...`);
          const count = await task.method();
          migrationStatus.itemsMigrated += count;
          console.log(`✅ Migrated ${count} ${task.name}`);
        } catch (error) {
          console.error(`❌ Error migrating ${task.name}:`, error);
          migrationStatus.errors.push({
            type: task.name,
            error: error.message
          });
        }
      }

      // Mark migration as completed
      migrationStatus.completed = true;
      this.migrationStatus = migrationStatus;
      this.saveMigrationStatus(migrationStatus);

      console.log('✅ Migration completed successfully');
      console.log(`📊 Total items migrated: ${migrationStatus.itemsMigrated}`);
      
      if (migrationStatus.errors.length > 0) {
        console.warn('⚠️ Some items failed to migrate:', migrationStatus.errors);
      }

      return migrationStatus;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      migrationStatus.errors.push({
        type: 'General',
        error: error.message
      });
      this.migrationStatus = migrationStatus;
      this.saveMigrationStatus(migrationStatus);
      throw error;
    }
  }

  // Migrate users
  async migrateUsers() {
    const users = readLS(STORAGE_KEYS.users, []);
    let count = 0;

    for (const user of users) {
      try {
        await databaseService.createUser({
          username: user.username,
          password_hash: user.password_hash,
          role: user.role || 'admin'
        });
        count++;
      } catch (error) {
        // User might already exist, continue
        console.warn(`⚠️ User ${user.username} might already exist:`, error.message);
      }
    }

    return count;
  }

  // Migrate homestays
  async migrateHomestays() {
    const homestays = readLS(STORAGE_KEYS.homestays, []);
    let count = 0;

    for (const homestay of homestays) {
      try {
        await databaseService.createHomestay(homestay);
        count++;
      } catch (error) {
        console.error(`❌ Error migrating homestay ${homestay.name}:`, error);
      }
    }

    return count;
  }

  // Migrate FAQs
  async migrateFAQs() {
    const faqs = readLS(STORAGE_KEYS.faqs, []);
    let count = 0;

    for (const faq of faqs) {
      try {
        await databaseService.createFAQ(faq);
        count++;
      } catch (error) {
        console.error(`❌ Error migrating FAQ ${faq.question}:`, error);
      }
    }

    return count;
  }

  // Migrate settings
  async migrateSettings() {
    const settings = readLS(STORAGE_KEYS.settings, {});
    let count = 0;

    for (const [key, value] of Object.entries(settings)) {
      try {
        await databaseService.setSetting(key, value);
        count++;
      } catch (error) {
        console.error(`❌ Error migrating setting ${key}:`, error);
      }
    }

    return count;
  }

  // Migrate messages
  async migrateMessages() {
    const messages = readLS(STORAGE_KEYS.messages, []);
    let count = 0;

    for (const message of messages) {
      try {
        await databaseService.createMessage({
          id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          phone_number: message.phoneNumber || 'unknown',
          message_text: message.text || message.message_text,
          message_type: message.type === 'bot' ? 'outgoing' : 'incoming',
          ai_response: message.aiResponse || message.ai_response,
          confidence: message.confidence || 0,
          matched_question: message.matchedQuestion || message.matched_question,
          processing_time: message.processingTime || message.processing_time || 0,
          source: message.source || 'migration',
          status: message.status || 'processed'
        });
        count++;
      } catch (error) {
        console.error(`❌ Error migrating message ${message.id}:`, error);
      }
    }

    return count;
  }

  // Migrate logs
  async migrateLogs() {
    const logs = readLS(STORAGE_KEYS.logs, []);
    let count = 0;

    for (const log of logs) {
      try {
        await databaseService.createLog({
          id: log.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          channel: log.channel || 'Unknown',
          incoming_text: log.incoming_text,
          matched_question: log.matched_question,
          confidence: log.confidence || 0,
          answer: log.answer,
          processing_time: log.processing_time || 0,
          source: log.source || 'migration',
          ai_processing: log.ai_processing,
          conversation_memory: log.conversation_memory
        });
        count++;
      } catch (error) {
        console.error(`❌ Error migrating log ${log.id}:`, error);
      }
    }

    return count;
  }

  // Migrate conversation memory
  async migrateConversationMemory() {
    const conversationMemory = readLS(STORAGE_KEYS.conversationMemory, {});
    let count = 0;

    for (const [phoneNumber, conversation] of Object.entries(conversationMemory)) {
      if (conversation.messages && Array.isArray(conversation.messages)) {
        for (const message of conversation.messages) {
          try {
            await databaseService.addConversationMessage(phoneNumber, {
              message_id: message.id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              message_text: message.message,
              is_from_customer: message.isFromCustomer,
              context: conversation.context || {},
              metadata: message.metadata || {}
            });
            count++;
          } catch (error) {
            console.error(`❌ Error migrating conversation message for ${phoneNumber}:`, error);
          }
        }
      }
    }

    return count;
  }

  // Migrate general knowledge
  async migrateGeneralKnowledge() {
    const generalKnowledge = readLS(STORAGE_KEYS.homestayGeneralKnowledge, '');
    let count = 0;

    if (generalKnowledge && generalKnowledge.trim()) {
      try {
        await databaseService.setGeneralKnowledge(generalKnowledge, 'homestay');
        count = 1;
      } catch (error) {
        console.error('❌ Error migrating general knowledge:', error);
      }
    }

    return count;
  }

  // Reset migration status (for testing)
  resetMigrationStatus() {
    const status = {
      completed: false,
      timestamp: null,
      itemsMigrated: 0,
      errors: []
    };
    this.migrationStatus = status;
    this.saveMigrationStatus(status);
    console.log('🔄 Migration status reset');
  }

  // Get migration status
  getStatus() {
    return this.migrationStatus;
  }

  // Check if migration was completed successfully
  isCompleted() {
    return this.migrationStatus.completed;
  }

  // Get migration errors
  getErrors() {
    return this.migrationStatus.errors;
  }
}

// Create singleton instance
const migrationService = new MigrationService();
export default migrationService;
