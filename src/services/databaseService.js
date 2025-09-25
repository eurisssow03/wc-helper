// Frontend Database Service
// This service handles all database operations from the frontend

class DatabaseService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_WEBHOOK_URL || 'https://wc-helper.onrender.com';
    this.apiUrl = `${this.baseUrl}/api/database`;
  }

  // Generic fetch method with error handling
  async fetchAPI(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Database API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Health check
  async checkHealth() {
    try {
      const response = await this.fetchAPI('/health');
      return response.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  // Users operations
  async getUsers() {
    const response = await this.fetchAPI('/users');
    return response.users || [];
  }

  async createUser(userData) {
    const response = await this.fetchAPI('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return response;
  }

  async updateUser(id, userData) {
    const response = await this.fetchAPI(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    return response;
  }

  async deleteUser(id) {
    const response = await this.fetchAPI(`/users/${id}`, {
      method: 'DELETE'
    });
    return response;
  }

  // Homestays operations
  async getHomestays() {
    const response = await this.fetchAPI('/homestays');
    return response.homestays || [];
  }

  async createHomestay(homestayData) {
    const response = await this.fetchAPI('/homestays', {
      method: 'POST',
      body: JSON.stringify(homestayData)
    });
    return response;
  }

  async updateHomestay(id, homestayData) {
    const response = await this.fetchAPI(`/homestays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(homestayData)
    });
    return response;
  }

  async deleteHomestay(id) {
    const response = await this.fetchAPI(`/homestays/${id}`, {
      method: 'DELETE'
    });
    return response;
  }

  // FAQs operations
  async getFAQs() {
    const response = await this.fetchAPI('/faqs');
    return response.faqs || [];
  }

  async getActiveFAQs() {
    const response = await this.fetchAPI('/faqs/active');
    return response.faqs || [];
  }

  async createFAQ(faqData) {
    const response = await this.fetchAPI('/faqs', {
      method: 'POST',
      body: JSON.stringify(faqData)
    });
    return response;
  }

  async updateFAQ(id, faqData) {
    const response = await this.fetchAPI(`/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(faqData)
    });
    return response;
  }

  async deleteFAQ(id) {
    const response = await this.fetchAPI(`/faqs/${id}`, {
      method: 'DELETE'
    });
    return response;
  }

  // Settings operations
  async getSettings() {
    const response = await this.fetchAPI('/settings');
    return response.settings || {};
  }

  async getSetting(key) {
    const response = await this.fetchAPI(`/settings/${key}`);
    return response.value;
  }

  async setSetting(key, value) {
    const response = await this.fetchAPI(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
    return response;
  }

  // Messages operations
  async getMessages(limit = 100, offset = 0) {
    const response = await this.fetchAPI(`/messages?limit=${limit}&offset=${offset}`);
    return response.messages || [];
  }

  async createMessage(messageData) {
    const response = await this.fetchAPI('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
    return response;
  }

  async getMessagesByPhone(phoneNumber, limit = 50) {
    const response = await this.fetchAPI(`/messages/phone/${phoneNumber}?limit=${limit}`);
    return response.messages || [];
  }

  // Logs operations
  async getLogs(limit = 100, offset = 0) {
    const response = await this.fetchAPI(`/logs?limit=${limit}&offset=${offset}`);
    return response.logs || [];
  }

  async createLog(logData) {
    const response = await this.fetchAPI('/logs', {
      method: 'POST',
      body: JSON.stringify(logData)
    });
    return response;
  }

  // Conversation Memory operations
  async getConversationMessages(phoneNumber, limit = 20) {
    const response = await this.fetchAPI(`/conversation/${phoneNumber}?limit=${limit}`);
    return response.messages || [];
  }

  async addConversationMessage(phoneNumber, messageData) {
    const response = await this.fetchAPI(`/conversation/${phoneNumber}`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
    return response;
  }

  async clearConversation(phoneNumber) {
    const response = await this.fetchAPI(`/conversation/${phoneNumber}`, {
      method: 'DELETE'
    });
    return response;
  }

  // General Knowledge operations
  async getGeneralKnowledge(type = 'homestay') {
    const response = await this.fetchAPI(`/general-knowledge?type=${type}`);
    return response.content || '';
  }

  async setGeneralKnowledge(content, type = 'homestay') {
    const response = await this.fetchAPI('/general-knowledge', {
      method: 'PUT',
      body: JSON.stringify({ content, type })
    });
    return response;
  }

  // Statistics
  async getStats() {
    const response = await this.fetchAPI('/stats');
    return response.stats || {};
  }

  // Migration from localStorage to database
  async migrateFromLocalStorage() {
    try {
      console.log('🔄 Starting migration from localStorage to database...');
      
      // Get all localStorage data
      const data = {
        users: this.getLocalStorageData('wc_users'),
        homestays: this.getLocalStorageData('wc_homestays'),
        faqs: this.getLocalStorageData('wc_faqs'),
        settings: this.getLocalStorageData('wc_settings'),
        messages: this.getLocalStorageData('wc_messages'),
        logs: this.getLocalStorageData('wc_logs'),
        conversationMemory: this.getLocalStorageData('wc_conversation_memory'),
        homestayGeneralKnowledge: this.getLocalStorageData('wc_homestay_general_knowledge')
      };

      // Send to database
      const response = await this.fetchAPI('/migrate', {
        method: 'POST',
        body: JSON.stringify({ data })
      });

      console.log('✅ Migration completed:', response.migrated, 'items migrated');
      return response;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  // Helper method to get localStorage data
  getLocalStorageData(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`❌ Error reading localStorage key ${key}:`, error);
      return null;
    }
  }

  // Helper method to check if database is available
  async isDatabaseAvailable() {
    try {
      return await this.checkHealth();
    } catch (error) {
      return false;
    }
  }

  // Fallback to localStorage if database is not available
  async getDataWithFallback(dataType, ...args) {
    try {
      if (await this.isDatabaseAvailable()) {
        // Use database
        switch (dataType) {
          case 'users': return await this.getUsers();
          case 'homestays': return await this.getHomestays();
          case 'faqs': return await this.getFAQs();
          case 'activeFAQs': return await this.getActiveFAQs();
          case 'settings': return await this.getSettings();
          case 'messages': return await this.getMessages(...args);
          case 'logs': return await this.getLogs(...args);
          case 'conversation': return await this.getConversationMessages(...args);
          case 'generalKnowledge': return await this.getGeneralKnowledge(...args);
          case 'stats': return await this.getStats();
          default: throw new Error(`Unknown data type: ${dataType}`);
        }
      } else {
        // Fallback to localStorage
        console.warn('⚠️ Database not available, falling back to localStorage');
        return this.getLocalStorageFallback(dataType, ...args);
      }
    } catch (error) {
      console.error(`❌ Error getting ${dataType}:`, error);
      // Final fallback to localStorage
      return this.getLocalStorageFallback(dataType, ...args);
    }
  }

  // localStorage fallback methods
  getLocalStorageFallback(dataType, ...args) {
    switch (dataType) {
      case 'users': return this.getLocalStorageData('wc_users') || [];
      case 'homestays': return this.getLocalStorageData('wc_homestays') || [];
      case 'faqs': return this.getLocalStorageData('wc_faqs') || [];
      case 'activeFAQs': return (this.getLocalStorageData('wc_faqs') || []).filter(f => f.is_active);
      case 'settings': return this.getLocalStorageData('wc_settings') || {};
      case 'messages': return this.getLocalStorageData('wc_messages') || [];
      case 'logs': return this.getLocalStorageData('wc_logs') || [];
      case 'conversation': return this.getLocalStorageData('wc_conversation_memory') || {};
      case 'generalKnowledge': return this.getLocalStorageData('wc_homestay_general_knowledge') || '';
      case 'stats': return this.getBasicStats();
      default: return null;
    }
  }

  // Basic stats from localStorage
  getBasicStats() {
    const users = this.getLocalStorageData('wc_users') || [];
    const homestays = this.getLocalStorageData('wc_homestays') || [];
    const faqs = this.getLocalStorageData('wc_faqs') || [];
    const messages = this.getLocalStorageData('wc_messages') || [];
    const logs = this.getLocalStorageData('wc_logs') || [];
    const conversationMemory = this.getLocalStorageData('wc_conversation_memory') || {};

    return {
      totalUsers: users.length,
      totalHomestays: homestays.length,
      totalFAQs: faqs.length,
      activeFAQs: faqs.filter(f => f.is_active).length,
      totalMessages: messages.length,
      totalLogs: logs.length,
      totalConversations: Object.keys(conversationMemory).length
    };
  }
}

// Create singleton instance
const databaseService = new DatabaseService();
export default databaseService;
