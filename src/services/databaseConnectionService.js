// Database connection service with fallback to localStorage
import { readLS, writeLS, STORAGE_KEYS } from './storage.js';

class DatabaseConnectionService {
  constructor() {
    this.isConnected = false;
    this.connectionStatus = 'checking'; // 'checking', 'connected', 'disconnected', 'error'
    this.lastCheck = null;
    this.checkInterval = null;
    this.fallbackMode = false;
    
    console.log('🔌 DatabaseConnectionService: Initialized');
  }

  // Check database connection
  async checkConnection() {
    try {
      console.log('🔍 DatabaseConnectionService: Checking database connection...');
      this.connectionStatus = 'checking';
      
      // First, check if we're in a browser environment and if the webhook server is available
      if (typeof window === 'undefined') {
        throw new Error('Not in browser environment');
      }
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000);
      });
      
      // Create the fetch promise - try multiple endpoints
      const endpoints = [
        '/api/postgres/health',
        'https://wc-helper.onrender.com/api/postgres/health',
        'http://localhost:3001/api/postgres/health'
      ];
      
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 DatabaseConnectionService: Trying endpoint: ${endpoint}`);
          
          const fetchPromise = fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            mode: 'cors'
          });
          
          // Race between fetch and timeout
          const response = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📊 DatabaseConnectionService: Response from ${endpoint}:`, data);
            
            // Additional validation - check if the response actually indicates a successful database connection
            if (data.success && data.message && data.message.includes('successful')) {
              this.isConnected = true;
              this.connectionStatus = 'connected';
              this.fallbackMode = false;
              this.lastCheck = new Date().toISOString();
              
              console.log('✅ DatabaseConnectionService: Database connected successfully');
              console.log('📊 DatabaseConnectionService: Connection details:', data);
              return { connected: true, data };
            } else {
              lastError = new Error(`Database health check returned unsuccessful response: ${JSON.stringify(data)}`);
              continue;
            }
          } else {
            lastError = new Error(`HTTP ${response.status}: ${response.statusText} from ${endpoint}`);
            continue;
          }
        } catch (error) {
          console.log(`⚠️ DatabaseConnectionService: Endpoint ${endpoint} failed:`, error.message);
          lastError = error;
          continue;
        }
      }
      
      // If we get here, all endpoints failed
      throw lastError || new Error('All database endpoints failed');
      
    } catch (error) {
      console.warn('⚠️ DatabaseConnectionService: Database connection failed:', error.message);
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      this.fallbackMode = true;
      this.lastCheck = new Date().toISOString();
      
      return { connected: false, error: error.message };
    }
  }

  // Start periodic connection checking
  startConnectionMonitoring(intervalMs = 30000) {
    console.log('🔄 DatabaseConnectionService: Starting connection monitoring...');
    
    // Check immediately
    this.checkConnection();
    
    // Set up periodic checking
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, intervalMs);
  }

  // Stop connection monitoring
  stopConnectionMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🛑 DatabaseConnectionService: Stopped connection monitoring');
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      status: this.connectionStatus,
      fallbackMode: this.fallbackMode,
      lastCheck: this.lastCheck
    };
  }

  // Check if we should use fallback
  shouldUseFallback() {
    return this.fallbackMode || !this.isConnected;
  }

  // Fallback authentication using localStorage
  async authenticateFallback(email, password) {
    console.log('🔄 DatabaseConnectionService: Using fallback authentication');
    
    try {
      // Get users from localStorage
      const users = readLS(STORAGE_KEYS.users, []);
      
      if (users.length === 0) {
        // Create default admin user if none exists
        await this.createDefaultUser();
        return this.authenticateFallback(email, password);
      }
      
      // Hash the password
      const hash = await this.sha256Hex(password);
      
      // Find matching user
      const found = users.find(u => 
        u.username.toLowerCase() === email.toLowerCase() && 
        u.password === hash && 
        u.is_active
      );
      
      if (found) {
        console.log('✅ DatabaseConnectionService: Fallback authentication successful');
        return { success: true, user: found };
      } else {
        console.log('❌ DatabaseConnectionService: Fallback authentication failed');
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      console.error('❌ DatabaseConnectionService: Fallback authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create default user for fallback
  async createDefaultUser() {
    console.log('👤 DatabaseConnectionService: Creating default admin user for fallback');
    
    const hashedPassword = await this.sha256Hex('Passw0rd!');
    const defaultUser = {
      id: 'admin-001',
      username: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      is_active: true,
      created_by: 'system',
      created_at: new Date().toISOString(),
      updated_by: 'system',
      updated_at: new Date().toISOString()
    };
    
    writeLS(STORAGE_KEYS.users, [defaultUser]);
    console.log('✅ DatabaseConnectionService: Default admin user created');
  }

  // SHA-256 hashing function
  async sha256Hex(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Initialize fallback data
  async initializeFallbackData() {
    console.log('🔧 DatabaseConnectionService: Initializing fallback data...');
    
    // Initialize settings if not exists
    if (!localStorage.getItem(STORAGE_KEYS.settings)) {
      const defaultSettings = {
        alwaysOn: true,
        businessHours: { 
          tz: "Asia/Kuala_Lumpur", 
          start: "09:00", 
          end: "18:00",
          monday: { enabled: true, start: "09:00", end: "18:00" },
          tuesday: { enabled: true, start: "09:00", end: "18:00" },
          wednesday: { enabled: true, start: "09:00", end: "18:00" },
          thursday: { enabled: true, start: "09:00", end: "18:00" },
          friday: { enabled: true, start: "09:00", end: "18:00" },
          saturday: { enabled: true, start: "09:00", end: "18:00" },
          sunday: { enabled: true, start: "09:00", end: "18:00" }
        },
        aiProvider: "OpenAI",
        confidenceThreshold: 0.6,
        similarityThreshold: 0.3,
        aiRules: {
          responseTemplates: {
            en: {
              greeting: "Hello! Welcome to our homestay service. How can I help you today?",
              fallback: "Sorry, I couldn't understand your question. We will have someone contact you soon."
            },
            zh: {
              greeting: "您好！欢迎来到我们的民宿服务。我今天能为您提供什么帮助？",
              fallback: "抱歉，我无法理解您的问题。我们将尽快安排专人与您联系。"
            }
          }
        }
      };
      writeLS(STORAGE_KEYS.settings, defaultSettings);
      console.log('✅ DatabaseConnectionService: Default settings created');
    }
    
    // Initialize other data
    if (!localStorage.getItem(STORAGE_KEYS.homestays)) {
      writeLS(STORAGE_KEYS.homestays, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.faqs)) {
      writeLS(STORAGE_KEYS.faqs, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.logs)) {
      writeLS(STORAGE_KEYS.logs, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.conversationMemory)) {
      writeLS(STORAGE_KEYS.conversationMemory, {});
    }
    if (!localStorage.getItem(STORAGE_KEYS.homestayGeneralKnowledge)) {
      writeLS(STORAGE_KEYS.homestayGeneralKnowledge, '');
    }
    
    console.log('✅ DatabaseConnectionService: Fallback data initialized');
  }
}

// Create singleton instance
export const databaseConnectionService = new DatabaseConnectionService();
export default databaseConnectionService;
