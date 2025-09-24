/**
 * Message Sync Service
 * Syncs messages between web app and webhook server
 */

import { readLS, writeLS, STORAGE_KEYS } from './storage.js';

class MessageSyncService {
  constructor() {
    this.webhookUrl = process.env.REACT_APP_WEBHOOK_URL || 'https://wc-helper.onrender.com';
    this.syncInterval = null;
    this.serverAvailable = true;
    this.lastCheck = 0;
  }

  // Check if webhook server is available
  async checkServerAvailability() {
    const now = Date.now();
    // Only check every 30 seconds to avoid excessive requests
    if (now - this.lastCheck < 30000) {
      return this.serverAvailable;
    }
    
    try {
      const response = await fetch(`${this.webhookUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      this.serverAvailable = response.ok;
      this.lastCheck = now;
      return this.serverAvailable;
    } catch (error) {
      this.serverAvailable = false;
      this.lastCheck = now;
      return false;
    }
  }

  // Start automatic syncing
  startAutoSync(intervalMs = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      // Only sync if server is available
      if (await this.checkServerAvailability()) {
        this.syncMessagesToWebhook();
      }
    }, intervalMs);
    
    console.log('📨 Message sync started (every', intervalMs, 'ms)');
  }

  // Stop automatic syncing
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('📨 Message sync stopped');
    }
  }

  // Sync messages from webhook server to web app
  async syncMessagesFromWebhook() {
    // Check if server is available first
    if (!(await this.checkServerAvailability())) {
      console.warn('🔌 Webhook server not available - skipping sync');
      return [];
    }
    
    try {
      const response = await fetch(`${this.webhookUrl}/api/messages?limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.messages) {
        // Store messages in localStorage for Dashboard and Logs
        const existingMessages = readLS(STORAGE_KEYS.messages, []);
        const newMessages = data.messages.filter(webhookMsg => 
          !existingMessages.some(existing => existing.id === webhookMsg.id)
        );
        
        if (newMessages.length > 0) {
          const updatedMessages = [...newMessages, ...existingMessages];
          writeLS(STORAGE_KEYS.messages, updatedMessages);
          
          // Also create log entries for webhook messages
          const existingLogs = readLS(STORAGE_KEYS.logs, []);
          const newLogs = newMessages.map(msg => ({
            id: `log_${msg.id}_${Date.now()}`,
            created_at: msg.receivedAt || new Date().toISOString(),
            channel: 'Webhook',
            incoming_text: msg.text,
            matched_question: msg.matchedQuestion,
            confidence: msg.confidence || 0,
            answer: msg.aiResponse,
            processing_time: msg.processingTime || 0,
            source: msg.source || 'webhook',
            ai_processing: msg.ai_processing || null
          }));
          
          // Filter out duplicate logs
          const uniqueNewLogs = newLogs.filter(newLog => 
            !existingLogs.some(existing => existing.incoming_text === newLog.incoming_text && 
                                         existing.created_at === newLog.created_at)
          );
          
          if (uniqueNewLogs.length > 0) {
            const updatedLogs = [...uniqueNewLogs, ...existingLogs];
            writeLS(STORAGE_KEYS.logs, updatedLogs);
            console.log('📝 Created', uniqueNewLogs.length, 'log entries from webhook messages');
          }
          
          console.log('📨 Synced', newMessages.length, 'new messages from webhook');
        }
        
        return newMessages;
      }
    } catch (error) {
      // Handle different types of errors gracefully
      if (error.name === 'AbortError') {
        console.warn('⏰ Webhook sync timeout - server may be slow or unavailable');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.warn('🔌 Webhook server not available - working in offline mode');
      } else {
        console.error('❌ Error syncing messages from webhook:', error);
      }
    }
    return [];
  }

  // Sync messages from web app to webhook server
  async syncMessagesToWebhook() {
    try {
      const messages = readLS(STORAGE_KEYS.messages, []);
      
      if (messages.length > 0) {
        const response = await fetch(`${this.webhookUrl}/api/sync/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messages })
        });
        
        if (response.ok) {
          console.log('📨 Synced', messages.length, 'messages to webhook server');
        }
      }
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.warn('🔌 Webhook server not available - messages will sync when server is online');
      } else {
        console.error('❌ Error syncing messages to webhook:', error);
      }
    }
  }

  // Sync logs from web app to webhook server
  async syncLogsToWebhook() {
    try {
      const logs = readLS(STORAGE_KEYS.logs, []);
      
      if (logs.length > 0) {
        const response = await fetch(`${this.webhookUrl}/api/sync/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ logs })
        });
        
        if (response.ok) {
          console.log('📋 Synced', logs.length, 'logs to webhook server');
        }
      }
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.warn('🔌 Webhook server not available - logs will sync when server is online');
      } else {
        console.error('❌ Error syncing logs to webhook:', error);
      }
    }
  }

  // Get all messages (from localStorage)
  getMessages() {
    return readLS(STORAGE_KEYS.messages, []);
  }

  // Get all logs (from localStorage)
  getLogs() {
    return readLS(STORAGE_KEYS.logs, []);
  }

  // Add a new message
  addMessage(message) {
    const messages = readLS(STORAGE_KEYS.messages, []);
    messages.unshift(message);
    writeLS(STORAGE_KEYS.messages, messages);
  }

  // Add a new log entry
  addLog(logEntry) {
    const logs = readLS(STORAGE_KEYS.logs, []);
    logs.unshift(logEntry);
    writeLS(STORAGE_KEYS.logs, logs);
  }
}

// Create singleton instance
const messageSyncService = new MessageSyncService();

export default messageSyncService;
