/**
 * Unified AI Processing Service with PostgreSQL Integration
 * Centralized AI processing for Chat Tester, Messages, and Webhook
 * Uses smart syncing to minimize database queries
 */

import { smartSyncService } from './smartSyncService.js';
import { simpleSimilarityScore, tagBasedMatch } from '../utils/nlp.js';
import { rerankWithSignals, callChatModel } from '../utils/rag.js';
import { buildEmbedding, cosineSim } from '../utils/embedding.js';
import { nowISO } from '../utils/helpers.js';
import { conversationMemoryService } from './conversationMemoryService.js';

class AIServicePostgres {
  constructor() {
    this.settings = {};
    this.faqs = [];
    this.homestays = [];
    this.homestayGeneralKnowledge = "";
    this.apiKey = null;
    this.apiKeyLoaded = false;
    this.dataLoaded = false;
    
    console.log('🏗️ AIServicePostgres: Initialized with PostgreSQL integration');
    
    // Load data asynchronously
    this.loadData();
  }

  // Load data from PostgreSQL with smart syncing
  async loadData() {
    try {
      console.log('🔄 AIServicePostgres: Loading data from PostgreSQL...');
      
      // Load all required data with smart syncing
      const data = await smartSyncService.getMultipleData([
        'settings',
        'faqs', 
        'homestays',
        'general_knowledge'
      ], 'ai-service-init');
      
      // Process settings
      this.settings = data.settings?.[0]?.value || {};
      
      // Process FAQs
      this.faqs = data.faqs || [];
      
      // Process homestays
      this.homestays = data.homestays || [];
      
      // Process general knowledge
      this.homestayGeneralKnowledge = data.general_knowledge?.[0]?.content || "";
      
      // Ensure we have valid settings
      this.initializeSettings();
      
      // Load API key from settings
      this.loadApiKey();
      
      this.dataLoaded = true;
      
      console.log('✅ AIServicePostgres: Data loaded - FAQs:', this.faqs.length, 'Homestays:', this.homestays.length);
      console.log('✅ AIServicePostgres: Active FAQs:', this.getActiveFAQs().length);
      console.log('✅ AIServicePostgres: General Knowledge Length:', this.homestayGeneralKnowledge.length, 'characters');
      
    } catch (error) {
      console.error('❌ AIServicePostgres: Error loading data:', error);
      this.dataLoaded = false;
    }
  }

  // Ensure data is loaded before processing
  async ensureDataLoaded() {
    if (!this.dataLoaded) {
      console.log('🔄 AIServicePostgres: Data not loaded, loading now...');
      await this.loadData();
    }
  }

  // Initialize settings with defaults if missing
  initializeSettings() {
    const defaultSettings = {
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
      },
      businessHours: {
        alwaysOn: true,
        tz: "Asia/Kuala_Lumpur",
        start: "09:00",
        end: "18:00"
      }
    };

    // Merge with defaults
    this.settings = { ...defaultSettings, ...this.settings };
  }

  // Load API key from settings
  loadApiKey() {
    if (this.settings.apiKeyEnc) {
      try {
        this.apiKey = atob(this.settings.apiKeyEnc);
        this.apiKeyLoaded = true;
        console.log('🔑 AIServicePostgres: API key loaded from settings');
      } catch (error) {
        console.error('❌ AIServicePostgres: Error decoding API key:', error);
        this.apiKey = null;
        this.apiKeyLoaded = false;
      }
    } else {
      console.warn('⚠️ AIServicePostgres: No API key found in settings');
      this.apiKey = null;
      this.apiKeyLoaded = false;
    }
  }

  // Get active FAQs
  getActiveFAQs() {
    return this.faqs.filter(faq => faq.is_active !== false);
  }

  // Force refresh data from PostgreSQL
  async forceRefresh() {
    console.log('🔄 AIServicePostgres: Force refreshing data...');
    this.dataLoaded = false;
    await this.loadData();
  }

  // Process message with AI
  async processMessage(userMessage, options = {}) {
    console.log('🤖 AIServicePostgres: Processing message:', userMessage.substring(0, 50) + '...');
    
    // Ensure data is loaded
    await this.ensureDataLoaded();
    
    const phoneNumber = options.phoneNumber || 'chat-tester';
    const conversationContext = conversationMemoryService.getConversationContext(phoneNumber);
    const currentProperty = conversationContext.currentProperty;
    
    const startTime = Date.now();
    
    // ===== API KEY VALIDATION =====
    if (!this.apiKey || !this.apiKeyLoaded) {
      console.error('❌ AIServicePostgres: No valid API key available');
      console.error('❌ AIServicePostgres: API Key Status - Loaded:', this.apiKeyLoaded, 'Present:', !!this.apiKey);
      return {
        answer: null,
        confidence: 0,
        matchedQuestion: null,
        processingTime: Date.now() - startTime,
        source: 'AIServicePostgres',
        processingDetails: {
          error: 'No valid API key available',
          finalDecision: 'No response - API key required'
        }
      };
    }

    // ===== GREETING DETECTION =====
    const greetingPatterns = [
      /^(hi|hello|hey|good morning|good afternoon|good evening)$/i,
      /^(你好|您好|嗨|早上好|下午好|晚上好)$/i,
      /^(selamat|hai|helo)$/i
    ];
    
    const isGreeting = greetingPatterns.some(pattern => pattern.test(userMessage.trim()));
    
    if (isGreeting) {
      console.log('👋 AIServicePostgres: Greeting detected, returning greeting only');
      
      const greeting = this.settings.aiRules?.responseTemplates?.en?.greeting || 
                     this.settings.aiRules?.responseTemplates?.zh?.greeting || 
                     "Hello! How can I help you today?";
      
      // Save conversation memory
      conversationMemoryService.addMessage(phoneNumber, userMessage, true);
      conversationMemoryService.addMessage(phoneNumber, greeting, false);
      
      return {
        answer: greeting,
        confidence: 1.0,
        matchedQuestion: "Greeting",
        processingTime: Date.now() - startTime,
        source: 'AIServicePostgres',
        processingDetails: {
          finalDecision: 'Greeting Response',
          greetingDetected: true
        }
      };
    }

    // ===== SIMILARITY SEARCH =====
    console.log('🔍 AIServicePostgres: Starting similarity search...');
    
    const activeFAQs = this.getActiveFAQs();
    console.log('📚 AIServicePostgres: Searching through', activeFAQs.length, 'active FAQs');
    
    let candidates = [];
    
    try {
      // Try embedding-based search first
      console.log('🧠 AIServicePostgres: Attempting embedding-based search...');
      const queryEmbedding = await buildEmbedding(userMessage, this.apiKey);
      
      for (const faq of activeFAQs) {
        const questionEmbedding = await buildEmbedding(faq.question, this.apiKey);
        const similarity = cosineSim(queryEmbedding, questionEmbedding);
        
        candidates.push({
          faq,
          sim: similarity,
          method: 'embedding'
        });
      }
      
      console.log('✅ AIServicePostgres: Embedding search completed');
      
    } catch (error) {
      console.warn('⚠️ AIServicePostgres: Embedding search failed, falling back to combined similarity:', error.message);
      
      // Fallback to combined similarity
      for (const faq of activeFAQs) {
        const combinedSim = this.calculateCombinedSimilarity(userMessage, faq);
        candidates.push({
          faq,
          sim: combinedSim,
          method: 'combined'
        });
      }
    }
    
    // Sort by similarity
    candidates.sort((a, b) => b.sim - a.sim);
    
    // Apply reranking with signals
    const rerankedCandidates = rerankWithSignals(candidates, this.homestays);
    
    // Get best match
    const bestMatch = rerankedCandidates[0];
    const confidence = bestMatch ? bestMatch.final : 0;
    
    console.log('🎯 AIServicePostgres: Best match confidence:', confidence.toFixed(3));
    
    // ===== KNOWLEDGE BASE LOGGING =====
    console.log('🧠 ===== AI KNOWLEDGE BASE FOR THIS QUERY =====');
    console.log('  📚 FAQ Knowledge Base:');
    console.log('    • Total FAQs:', this.faqs.length);
    console.log('    • Active FAQs:', activeFAQs.length);
    console.log('    • Top FAQ Context:', bestMatch ? bestMatch.faq.question : 'None');
    if (bestMatch) {
      console.log('    • FAQ Answer Preview:', bestMatch.faq.answer?.substring(0, 100) + '...');
    }
    
    console.log('  🏨 Homestay Data:');
    console.log('    • Total Homestays:', this.homestays.length);
    console.log('    • Homestay Names:', this.homestays.map(h => h.name).join(', '));
    
    console.log('  🧠 General Knowledge Base:');
    console.log('    • Length:', this.homestayGeneralKnowledge.length, 'characters');
    console.log('    • Preview:', this.homestayGeneralKnowledge.substring(0, 200) + '...');
    
    console.log('  💾 Conversation Memory:');
    console.log('    • Phone Number:', phoneNumber);
    console.log('    • Message Count:', conversationContext.recentMessages.length);
    console.log('    • Has History:', conversationContext.recentMessages.length > 0);
    
    console.log('  🏨 Property Context:');
    if (currentProperty) {
      console.log('    • Current Property:', currentProperty.name);
      console.log('    • Mentioned In:', currentProperty.mentionedIn);
    } else {
      console.log('    • No specific property context');
    }
    console.log('🧠 ===== END KNOWLEDGE BASE =====');

    // ===== RESPONSE GENERATION =====
    let answer = null;
    let finalDecision = 'Unknown';
    
    if (bestMatch && confidence > 0) {
      console.log('🤖 AIServicePostgres: Generating response with chat model...');
      
      try {
        // Prepare context for AI
        const contextItems = rerankedCandidates.slice(0, 3).map(c => ({
          question: c.faq.question,
          answer: c.faq.answer,
          confidence: c.final,
          tags: c.faq.tags || []
        }));
        
        // Enhanced system prompt with homestay data, general knowledge, and conversation memory
        const systemPrompt = `You are a professional homestay customer service assistant. 
        
        FAQ KNOWLEDGE BASE (TOP PRIORITY):
        ${contextItems.map((item, index) => `
        ${index + 1}. Q: ${item.question}
           A: ${item.answer}
           Tags: ${item.tags.join(', ')}
           Confidence: ${(item.confidence * 100).toFixed(1)}%
        `).join('\n')}
        
        HOMESTAY PROPERTIES:
        ${this.homestays.map(h => `
        • ${h.name} (${h.location})
          Amenities: ${h.amenities?.join(', ') || 'N/A'}
          Description: ${h.description || 'N/A'}
        `).join('\n')}
        
        GENERAL KNOWLEDGE BASE:
        ${this.homestayGeneralKnowledge || 'No general knowledge available.'}
        
        CONVERSATION HISTORY:
        ${conversationContext.recentMessages.slice(-5).map(msg => 
          `${msg.isFromCustomer ? 'Customer' : 'Assistant'}: ${msg.message}`
        ).join('\n')}
        
        PROPERTY CONTEXT:
        ${currentProperty ? `The customer is asking about: ${currentProperty.name}
        Property mentioned in: "${currentProperty.mentionedIn}"
        Focus ALL responses on this specific property and provide property-specific information.` : 'No specific property context - provide general information.'}
        
        GUIDELINES:
        1. Use FAQ information as your PRIMARY source for answers
        2. Integrate homestay data to provide comprehensive information
        3. Be helpful, professional, and friendly
        4. If unsure, ask clarifying questions
        5. Provide specific details about properties when relevant
        6. Use conversation history for context
        7. Focus on the mentioned property if property context exists
        8. Keep responses concise but informative
        9. Always end with "Is there anything else I can help you with?"
        10. If the question is not related to homestays, politely redirect
        
        IMPORTANT: FAQ information takes TOP PRIORITY, but homestay data, general knowledge, and conversation memory should be used to make responses more comprehensive and personalized.`;

        // Call chat model
        answer = await callChatModel(userMessage, systemPrompt, this.apiKey);
        finalDecision = 'Chat Model Response';
        
        console.log('✅ AIServicePostgres: Chat model response generated');
        
      } catch (error) {
        console.error('❌ AIServicePostgres: Chat model error:', error);
        answer = null;
        finalDecision = 'Chat Model Error';
      }
    } else {
      console.log('❌ AIServicePostgres: No suitable match found, using fallback');
      answer = this.settings.aiRules?.responseTemplates?.en?.fallback || 
               this.settings.aiRules?.responseTemplates?.zh?.fallback || 
               "Sorry, I couldn't understand your question. We will have someone contact you soon.";
      finalDecision = 'Fallback Response';
    }

    // ===== SAVE CONVERSATION MEMORY =====
    if (answer) {
      conversationMemoryService.addMessage(phoneNumber, userMessage, true);
      conversationMemoryService.addMessage(phoneNumber, answer, false);
    }

    // ===== LOGGING =====
    const processingTime = Date.now() - startTime;
    console.log('⏱️ AIServicePostgres: Processing completed in', processingTime, 'ms');
    console.log('🎯 AIServicePostgres: Final decision:', finalDecision);
    console.log('📝 AIServicePostgres: Answer length:', answer?.length || 0, 'characters');

    // ===== SAVE LOG =====
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: nowISO(),
      channel: 'ChatTester',
      incoming_text: userMessage,
      matched_question: bestMatch?.faq?.question || null,
      confidence: confidence,
      answer: answer,
      processing_time: processingTime,
      source: 'AIServicePostgres',
      ai_processing: {
        totalFaqs: this.faqs.length,
        activeFaqs: activeFAQs.length,
        candidatesFound: candidates.length,
        topCandidates: rerankedCandidates.slice(0, 5).map(c => ({
          question: c.faq.question,
          similarity: c.sim,
          finalScore: c.final,
          isActive: c.faq.is_active
        })),
        confidenceThreshold: "No threshold (using best match)",
        similarityThreshold: this.settings.similarityThreshold || 0.3,
        searchMethod: bestMatch?.method || 'Unknown',
        rerankingApplied: true,
        confidenceCategory: confidence >= 0.8 ? 'High' : confidence >= 0.5 ? 'Medium' : 'Low',
        finalDecision: finalDecision,
        contextItems: rerankedCandidates.slice(0, 3).map(c => ({
          question: c.faq.question,
          answer: c.faq.answer,
          confidence: c.final,
          tags: c.faq.tags || []
        })),
        generalKnowledgeLength: this.homestayGeneralKnowledge.length,
        conversationMemory: {
          phoneNumber: phoneNumber,
          messageCount: conversationContext.recentMessages.length,
          hasHistory: conversationContext.recentMessages.length > 0,
          currentProperty: currentProperty
        },
        processingSteps: [
          'Data loaded from PostgreSQL',
          'API key validation completed',
          'Greeting detection completed',
          'Similarity search completed',
          'Reranking with signals completed',
          'Top ranking FAQ selected as primary context',
          'Homestay data integrated as knowledge base',
          'General knowledge integrated',
          'Conversation memory loaded',
          'Property context checked',
          'Chat model response generated'
        ]
      }
    };

    // Save log to PostgreSQL
    try {
      await smartSyncService.saveData('logs', logEntry);
      console.log('📝 AIServicePostgres: Log saved to PostgreSQL');
    } catch (error) {
      console.error('❌ AIServicePostgres: Error saving log:', error);
    }

    return {
      answer,
      confidence,
      matchedQuestion: bestMatch?.faq?.question || null,
      processingTime,
      source: 'AIServicePostgres',
      processingDetails: logEntry.ai_processing
    };
  }

  // Calculate combined similarity (tags + question)
  calculateCombinedSimilarity(userMessage, faq) {
    // Try tag-based matching first
    const tagScore = tagBasedMatch(userMessage, faq.tags || []);
    
    if (tagScore > 0) {
      console.log(`🏷️ AIServicePostgres: Tag match found for "${faq.question}" - Score: ${tagScore.toFixed(3)}`);
      return tagScore;
    }
    
    // Fallback to question similarity
    const questionScore = simpleSimilarityScore(userMessage, faq.question);
    console.log(`❓ AIServicePostgres: Question similarity for "${faq.question}" - Score: ${questionScore.toFixed(3)}`);
    return questionScore;
  }

  // Process and log (for compatibility)
  async processAndLog(userMessage, options = {}) {
    return this.processMessage(userMessage, options);
  }
}

// Create singleton instance
const aiServicePostgres = new AIServicePostgres();
export default aiServicePostgres;
