/**
 * Message Sync Service
 * Syncs messages between web app and webhook server
 */

import { readLS, writeLS, STORAGE_KEYS } from './storage.js';

class MessageSyncService {
  constructor() {
    this.webhookUrl = process.env.REACT_APP_WEBHOOK_URL || 'http://localhost:3001';
    this.syncInterval = null;
  }

  // Start automatic syncing
  startAutoSync(intervalMs = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncMessagesToWebhook();
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
    try {
      const response = await fetch(`${this.webhookUrl}/api/messages?limit=100`);
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
          console.log('📨 Synced', newMessages.length, 'new messages from webhook');
        }
        
        return newMessages;
      }
    } catch (error) {
      console.error('❌ Error syncing messages from webhook:', error);
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
      console.error('❌ Error syncing messages to webhook:', error);
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
      console.error('❌ Error syncing logs to webhook:', error);
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
