import { readLS, writeLS, STORAGE_KEYS } from './storage.js';
import { nowISO } from '../utils/helpers.js';

class ConversationMemoryService {
  constructor() {
    this.memory = readLS(STORAGE_KEYS.conversationMemory, {});
  }

  // Get conversation memory for a specific phone number
  getConversationMemory(phoneNumber) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    return this.memory[normalizedPhone] || {
      messages: [],
      lastUpdated: null,
      context: {},
      summary: ""
    };
  }

  // Add a message to conversation memory
  addMessage(phoneNumber, message, isFromCustomer = true, metadata = {}) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    if (!this.memory[normalizedPhone]) {
      this.memory[normalizedPhone] = {
        messages: [],
        lastUpdated: null,
        context: {},
        summary: ""
      };
    }

    const messageEntry = {
      id: Date.now() + Math.random(),
      message: message,
      isFromCustomer: isFromCustomer,
      timestamp: nowISO(),
      metadata: metadata
    };

    this.memory[normalizedPhone].messages.push(messageEntry);
    this.memory[normalizedPhone].lastUpdated = nowISO();

    // Keep only last 20 messages to prevent memory bloat
    if (this.memory[normalizedPhone].messages.length > 20) {
      this.memory[normalizedPhone].messages = this.memory[normalizedPhone].messages.slice(-20);
    }

    // Update context based on message content
    this.updateContext(normalizedPhone, message, isFromCustomer);

    this.saveMemory();
    console.log(`💾 Memory: Added message to conversation ${normalizedPhone}`);
  }

  // Update conversation context based on message content
  updateContext(phoneNumber, message, isFromCustomer) {
    const conversation = this.memory[phoneNumber];
    if (!conversation) return;

    // Extract key information from customer messages
    if (isFromCustomer) {
      const lowerMessage = message.toLowerCase();
      
      // Extract preferences
      if (lowerMessage.includes('prefer') || lowerMessage.includes('like') || lowerMessage.includes('want')) {
        conversation.context.preferences = conversation.context.preferences || [];
        conversation.context.preferences.push({
          text: message,
          timestamp: nowISO()
        });
      }

      // Extract questions/concerns
      if (lowerMessage.includes('?') || lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('when') || lowerMessage.includes('where')) {
        conversation.context.questions = conversation.context.questions || [];
        conversation.context.questions.push({
          text: message,
          timestamp: nowISO()
        });
      }

      // Extract booking information
      if (lowerMessage.includes('book') || lowerMessage.includes('reserve') || lowerMessage.includes('check-in') || lowerMessage.includes('check-out')) {
        conversation.context.bookingInfo = conversation.context.bookingInfo || [];
        conversation.context.bookingInfo.push({
          text: message,
          timestamp: nowISO()
        });
      }

      // Extract personal information
      if (lowerMessage.includes('name') || lowerMessage.includes('email') || lowerMessage.includes('phone') || lowerMessage.includes('address')) {
        conversation.context.personalInfo = conversation.context.personalInfo || [];
        conversation.context.personalInfo.push({
          text: message,
          timestamp: nowISO()
        });
      }
    }
  }

  // Get recent conversation context for AI
  getConversationContext(phoneNumber, maxMessages = 10) {
    const conversation = this.getConversationMemory(phoneNumber);
    const recentMessages = conversation.messages.slice(-maxMessages);
    
    return {
      recentMessages: recentMessages,
      context: conversation.context,
      summary: conversation.summary,
      totalMessages: conversation.messages.length,
      lastUpdated: conversation.lastUpdated
    };
  }

  // Generate conversation summary
  generateSummary(phoneNumber) {
    const conversation = this.getConversationMemory(phoneNumber);
    if (conversation.messages.length === 0) return "";

    const customerMessages = conversation.messages.filter(m => m.isFromCustomer);
    const recentMessages = customerMessages.slice(-5); // Last 5 customer messages
    
    const topics = [];
    const preferences = [];
    const questions = [];

    recentMessages.forEach(msg => {
      const lowerMsg = msg.message.toLowerCase();
      
      // Extract topics
      if (lowerMsg.includes('room') || lowerMsg.includes('suite')) topics.push('room preferences');
      if (lowerMsg.includes('amenity') || lowerMsg.includes('wifi') || lowerMsg.includes('parking')) topics.push('amenities');
      if (lowerMsg.includes('location') || lowerMsg.includes('nearby') || lowerMsg.includes('attraction')) topics.push('location');
      if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('rate')) topics.push('pricing');
      if (lowerMsg.includes('policy') || lowerMsg.includes('rule') || lowerMsg.includes('term')) topics.push('policies');
      
      // Extract preferences
      if (lowerMsg.includes('prefer') || lowerMsg.includes('like')) {
        preferences.push(msg.message);
      }
      
      // Extract questions
      if (lowerMsg.includes('?')) {
        questions.push(msg.message);
      }
    });

    let summary = `Customer has discussed: ${[...new Set(topics)].join(', ')}`;
    if (preferences.length > 0) {
      summary += `\nPreferences mentioned: ${preferences.slice(-2).join('; ')}`;
    }
    if (questions.length > 0) {
      summary += `\nRecent questions: ${questions.slice(-2).join('; ')}`;
    }

    conversation.summary = summary;
    this.saveMemory();
    
    return summary;
  }

  // Clear conversation memory for a phone number
  clearConversation(phoneNumber) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    delete this.memory[normalizedPhone];
    this.saveMemory();
    console.log(`🗑️ Memory: Cleared conversation for ${normalizedPhone}`);
  }

  // Get all conversations (for debugging)
  getAllConversations() {
    return this.memory;
  }

  // Normalize phone number for consistent storage
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return 'unknown';
    return phoneNumber.replace(/[^\d]/g, ''); // Remove all non-digits
  }

  // Save memory to localStorage
  saveMemory() {
    writeLS(STORAGE_KEYS.conversationMemory, this.memory);
  }

  // Get conversation statistics
  getStats() {
    const conversations = Object.keys(this.memory);
    const totalMessages = conversations.reduce((sum, phone) => {
      return sum + (this.memory[phone].messages?.length || 0);
    }, 0);

    return {
      totalConversations: conversations.length,
      totalMessages: totalMessages,
      activeConversations: conversations.filter(phone => {
        const lastUpdate = this.memory[phone].lastUpdated;
        if (!lastUpdate) return false;
        const daysSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 7; // Active within last 7 days
      }).length
    };
  }
}

// Export singleton instance
export const conversationMemoryService = new ConversationMemoryService();
