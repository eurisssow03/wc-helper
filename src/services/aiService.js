/**
 * Unified AI Processing Service
 * Centralized AI processing for Chat Tester, Messages, and Webhook
 */

import { readLS, writeLS, STORAGE_KEYS } from '../services/storage.js';
import { simpleSimilarityScore, tagBasedMatch } from '../utils/nlp.js';
import { rerankWithSignals, callChatModel } from '../utils/rag.js';
import { buildEmbedding, cosineSim } from '../utils/embedding.js';
import { nowISO } from '../utils/helpers.js';
import { conversationMemoryService } from './conversationMemoryService.js';

class AIService {
  constructor() {
    this.settings = readLS(STORAGE_KEYS.settings, {});
    this.faqs = readLS(STORAGE_KEYS.faqs, []);
    this.homestays = readLS(STORAGE_KEYS.homestays, []);
    this.homestayGeneralKnowledge = readLS(STORAGE_KEYS.homestayGeneralKnowledge, "");
    this.apiKey = null;
    this.apiKeyLoaded = false;
    
    console.log('🏗️ AIService: Constructor - FAQs:', this.faqs.length, 'Homestays:', this.homestays.length);
    console.log('🏗️ AIService: Active FAQs:', this.getActiveFAQs().length);
    console.log('🏗️ AIService: General Knowledge Length:', this.homestayGeneralKnowledge.length, 'characters');
    
    // Ensure we have valid settings
    this.initializeSettings();
  }

  // Initialize settings with defaults if missing
  initializeSettings() {
    const defaultSettings = {
      confidenceThreshold: 0.6,
      similarityThreshold: 0.3,
      alwaysOn: true
    };

    let settingsUpdated = false;
    Object.keys(defaultSettings).forEach(key => {
      if (this.settings[key] === undefined || this.settings[key] === null) {
        this.settings[key] = defaultSettings[key];
        settingsUpdated = true;
      }
    });

    // Only set aiProvider to OpenAI if it's completely missing
    if (!this.settings.aiProvider) {
      this.settings.aiProvider = 'OpenAI';
      settingsUpdated = true;
    }

    if (settingsUpdated) {
      console.log('🔧 Initializing AI service with default settings');
      writeLS(STORAGE_KEYS.settings, this.settings);
    }
  }

  // Update data from localStorage
  refreshData() {
    this.settings = readLS(STORAGE_KEYS.settings, {});
    this.faqs = readLS(STORAGE_KEYS.faqs, []);
    this.homestays = readLS(STORAGE_KEYS.homestays, []);
    this.homestayGeneralKnowledge = readLS(STORAGE_KEYS.homestayGeneralKnowledge, "");
    
    console.log('🔄 AIService: Data refreshed - FAQs:', this.faqs.length, 'Homestays:', this.homestays.length);
    console.log('🔄 AIService: Active FAQs:', this.getActiveFAQs().length);
    console.log('🔄 AIService: General Knowledge Length:', this.homestayGeneralKnowledge.length, 'characters');
  }

  // Force refresh data (public method)
  forceRefresh() {
    this.refreshData();
    console.log('🔄 AIService: Force refresh completed');
  }

  // Load API key from frontend settings
  async loadApiKey() {
    if (this.apiKeyLoaded) {
      return this.apiKey;
    }

    // Get API key from frontend settings (encrypted in localStorage)
    const apiKey = this.settings.apiKeyEnc ? atob(this.settings.apiKeyEnc) : '';
    
    if (apiKey && apiKey.trim()) {
      this.apiKey = apiKey.trim();
      this.apiKeyLoaded = true;
      console.log('🤖 OpenAI API key loaded from frontend settings');
      return this.apiKey;
    } else {
      console.warn('⚠️ No API key found in settings');
      console.log('🔄 AI will not function without API key');
      this.apiKeyLoaded = true; // Mark as loaded to prevent retry
      return null;
    }
  }

  // Get active FAQs only
  getActiveFAQs() {
    return this.faqs.filter(faq => faq.is_active === true);
  }

  // Combined matching: Tags first, then question similarity
  calculateCombinedSimilarity(userMessage, faq) {
    // First priority: Tag-based matching
    const tagMatch = tagBasedMatch(userMessage, faq);
    
    if (tagMatch.matched) {
      console.log(`🏷️ Tag match for "${faq.question}": ${tagMatch.matchedTags.join(', ')} (score: ${tagMatch.score.toFixed(3)})`);
      return {
        score: tagMatch.score,
        method: 'tag',
        matchedTags: tagMatch.matchedTags,
        details: `Tag match: ${tagMatch.matchedTags.join(', ')}`
      };
    }
    
    // Second priority: Question similarity
    const questionSimilarity = simpleSimilarityScore(userMessage, faq);
    console.log(`❓ Question similarity for "${faq.question}": ${questionSimilarity.toFixed(3)}`);
    
    return {
      score: questionSimilarity,
      method: 'question',
      matchedTags: [],
      details: 'Question similarity'
    };
  }

  // Categorize confidence level
  getConfidenceCategory(confidence) {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  }

  // Process message with unified AI logic
  async processMessage(userMessage, options = {}) {
    const startTime = Date.now();
    const phoneNumber = options.phoneNumber || 'chat-tester';
    
    console.log('🚀 ===== AI PROCESSING STARTED =====');
    console.log('📝 Input Message:', `"${userMessage}"`);
    console.log('⏰ Start Time:', new Date().toISOString());
    
    // Refresh data to get latest changes FIRST
    this.refreshData();
    
    // Load conversation memory for this phone number
    const conversationContext = conversationMemoryService.getConversationContext(phoneNumber);
    console.log('💾 Conversation Memory:');
    console.log('  📱 Phone Number:', phoneNumber);
    console.log('  💬 Recent Messages:', conversationContext.recentMessages.length);
    console.log('  📋 Context Keys:', Object.keys(conversationContext.context).length);
    console.log('  📝 Summary Length:', conversationContext.summary.length);
    
    console.log('📊 Data Status:');
    console.log('  📚 Total FAQs:', this.faqs.length);
    console.log('  ✅ Active FAQs:', this.getActiveFAQs().length);
    console.log('  🏨 Homestays:', this.homestays.length);
    console.log('  🤖 AI Provider:', this.settings.aiProvider);
    console.log('  🔑 API Key loaded:', !!this.apiKey);
    console.log('  ⚙️ Settings:', {
      confidenceThreshold: this.settings.confidenceThreshold,
      similarityThreshold: this.settings.similarityThreshold,
      aiProvider: this.settings.aiProvider
    });
    
    // Load API key from frontend settings
    const apiKey = await this.loadApiKey();
    if (!apiKey) {
      console.error('🚨 CRITICAL: No valid API key found!');
      console.error('🔧 Developer Alert: AI functionality requires a valid OpenAI API key');
      console.error('📝 Please check Settings → AI Config → API Key');
      console.error('❌ AI processing aborted - no response will be generated');
      
      const processingTime = Date.now() - startTime;
      return {
        answer: null,
        confidence: 0,
        matchedQuestion: null,
        processingTime,
        contextItems: [],
        source: 'AIService',
        processingDetails: {
          totalFaqs: this.faqs.length,
          activeFaqs: this.getActiveFAQs().length,
          candidatesFound: 0,
          topCandidates: [],
          confidenceThreshold: 'API key required',
          similarityThreshold: this.settings.similarityThreshold || 0.3,
          finalDecision: 'No response - API key required',
          contextItems: [],
          processingSteps: ['API key validation failed', 'Processing aborted'],
          searchMethod: 'None - API key required',
          rerankingApplied: false,
          confidenceCategory: 'Error'
        }
      };
    }
    
    // Log final AI provider after potential fallback
    console.log('🤖 Final AI Provider:', this.settings.aiProvider);
    
    const activeFAQs = this.getActiveFAQs();
    console.log('🔍 Starting similarity search with', activeFAQs.length, 'active FAQs');
    
    // Check if this is a greeting message first
    const greetingKeywords = ['hello', 'hi', 'help', '你好', '嗨', '帮助'];
    const isGreeting = greetingKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    
    if (isGreeting) {
      console.log('👋 Detected greeting message, skipping similarity search');
      const responseTemplates = this.settings.aiRules?.responseTemplates || {};
      const isChinese = /[\u4e00-\u9fa5]/.test(userMessage);
      const language = isChinese ? 'zh' : 'en';
      
      const greeting = responseTemplates[language]?.greeting || 
                      responseTemplates.en?.greeting || 
                      "Hello! Welcome to our homestay service. How can I help you today?";
      
      const processingTime = Date.now() - startTime;
      const result = {
        answer: greeting,
        confidence: 1.0, // Perfect confidence for greeting
        matchedQuestion: null,
        processingTime,
        contextItems: [],
        source: 'AIService',
        processingDetails: {
          totalFaqs: this.faqs.length,
          activeFaqs: activeFAQs.length,
          candidatesFound: 0,
          topCandidates: [],
          confidenceThreshold: 'Greeting detected (no threshold)',
          similarityThreshold: this.settings.similarityThreshold || 0.3,
          finalDecision: 'Greeting response',
          contextItems: [],
          processingSteps: ['Greeting message detected', 'Greeting response generated'],
          searchMethod: 'Greeting Detection',
          rerankingApplied: false,
          confidenceCategory: 'High'
        }
      };
      
      console.log('🏁 ===== AI PROCESSING COMPLETED (GREETING) =====');
      console.log('  ⏱️ Total Processing Time:', processingTime + 'ms');
      console.log('  📊 Final Confidence: 1.0000 (Greeting)');
      console.log('  🏷️ Confidence Category: High');
      console.log('  📝 Answer Length:', greeting.length + ' characters');
      console.log('  🔍 Match Method: greeting');
      console.log('  ✅ Result Summary:', {
        hasAnswer: true,
        hasMatch: false,
        confidence: '1.0000',
        processingTime: processingTime + 'ms',
        answerPreview: greeting.substring(0, 100) + (greeting.length > 100 ? '...' : ''),
        finalDecision: 'Greeting response'
      });
      console.log('=====================================');
      
      return result;
    }
    
    let candidates = [];
    
    // Initialize processing details for logging
    const processingDetails = {
      totalFaqs: this.faqs.length,
      activeFaqs: activeFAQs.length,
      candidatesFound: 0,
      topCandidates: [],
      confidenceThreshold: 'No threshold (using best match)',
      similarityThreshold: this.settings.similarityThreshold || 0.3,
      finalDecision: 'unknown',
      contextItems: [],
      processingSteps: [],
      searchMethod: 'unknown',
      rerankingApplied: false,
      confidenceCategory: 'unknown'
    };
    
    try {
      // Use embedding-based search if we have API key
      if (this.apiKey) {
        console.log('🔮 Using embedding-based search with API key');
        console.log('  📡 API Provider:', this.settings.aiProvider);
        console.log('  🔑 API Key available:', !!this.apiKey);
        try {
          console.log('  ⏳ Building query embedding...');
          const queryEmbedding = await buildEmbedding(userMessage, this.settings, this.apiKey);
          console.log('  ✅ Query embedding built, dimensions:', queryEmbedding.length);
        
        candidates = await Promise.all(
          activeFAQs.map(async (faq) => {
            let similarity = 0;
            let matchMethod = 'embedding';
            
            if (faq.embedding && Array.isArray(faq.embedding) && faq.embedding.length > 0) {
              // Use stored embedding if available
              similarity = cosineSim(queryEmbedding, faq.embedding);
              console.log(`  🔮 FAQ "${faq.question}" - Embedding similarity: ${similarity.toFixed(4)}`);
            } else {
              // Fallback to combined similarity if no embedding
              const combinedMatch = this.calculateCombinedSimilarity(userMessage, faq);
              similarity = combinedMatch.score;
              matchMethod = combinedMatch.method;
              console.log(`  🔄 FAQ "${faq.question}" - Combined similarity: ${similarity.toFixed(4)} (${combinedMatch.method})`);
            }
            
            return { faq, sim: similarity, matchMethod };
          })
        );
        
        // Apply similarity threshold
        const similarityThreshold = this.settings.similarityThreshold || 0.3;
        console.log('  🔍 Filtering candidates with similarity threshold:', similarityThreshold);
        
        const beforeFilter = candidates.length;
        candidates = candidates
          .filter(c => c.sim > similarityThreshold)
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 10);
        
        console.log(`  📊 Filtered ${beforeFilter} → ${candidates.length} candidates (similarity > ${similarityThreshold})`);
        
        if (candidates.length > 0) {
          console.log('  🏆 Top candidates:');
          candidates.slice(0, 3).forEach((c, i) => {
            console.log(`    ${i + 1}. "${c.faq.question}" - ${c.sim.toFixed(4)} (${c.matchMethod})`);
          });
        }
        
          // Update processing details
          processingDetails.candidatesFound = candidates.length;
          processingDetails.similarityThreshold = similarityThreshold;
          processingDetails.searchMethod = 'Embedding-based';
          processingDetails.processingSteps.push(`Embedding-based search completed (threshold: ${similarityThreshold})`);
        } catch (embeddingError) {
          console.error('❌ Embedding search failed:', embeddingError.message);
          console.log('🔄 Falling back to simple similarity search');
          // Use simple similarity as fallback
          
          // Use combined similarity as fallback
          candidates = activeFAQs
            .map(faq => {
              const combinedMatch = this.calculateCombinedSimilarity(userMessage, faq);
              console.log(`🤖 FAQ "${faq.question}" - Fallback similarity: ${combinedMatch.score} (${combinedMatch.method})`);
              return { faq, sim: combinedMatch.score, matchMethod: combinedMatch.method };
            })
            .filter(c => c.sim > (this.settings.similarityThreshold || 0.3))
            .sort((a, b) => b.sim - a.sim)
            .slice(0, 10);
          
          processingDetails.candidatesFound = candidates.length;
          processingDetails.similarityThreshold = this.settings.similarityThreshold || 0.3;
          processingDetails.searchMethod = 'Simple similarity (embedding fallback)';
          processingDetails.processingSteps.push(`Embedding failed, used simple similarity fallback`);
        }
      } else {
        // This should never happen since we check API key at the beginning
        console.error('🚨 CRITICAL ERROR: No API key but reached similarity search!');
        console.error('🔧 Developer Alert: This indicates a logic error in the code');
        throw new Error('API key validation failed - this should not happen');
      }
    } catch (error) {
      console.error('🤖 Embedding search error:', error);
      console.log('🔄 Falling back to simple similarity search');
      // Fallback to combined similarity
      candidates = activeFAQs
        .map(faq => {
          const combinedMatch = this.calculateCombinedSimilarity(userMessage, faq);
          console.log(`🤖 Fallback FAQ "${faq.question}" - similarity: ${combinedMatch.score} (${combinedMatch.method})`);
          return { faq, sim: combinedMatch.score, matchMethod: combinedMatch.method };
        })
        .filter(c => c.sim > (this.settings.similarityThreshold || 0.3))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 10);
        
      console.log('🤖 Fallback candidates found:', candidates.length, `(similarity > ${this.settings.similarityThreshold || 0.3})`);
      
      // Update processing details
      processingDetails.candidatesFound = candidates.length;
      processingDetails.similarityThreshold = this.settings.similarityThreshold || 0.3;
      processingDetails.searchMethod = 'Fallback similarity';
      processingDetails.processingSteps.push(`Fallback similarity search completed (threshold: ${this.settings.similarityThreshold || 0.3})`);
    }

    // Rerank with signals
    console.log('🔄 Reranking candidates with signals...');
    console.log('  📊 Input candidates:', candidates.length);
    console.log('  🏨 Homestays available:', this.homestays.length);
    
    const reranked = rerankWithSignals({
      query: userMessage,
      homestays: this.homestays,
      candidates
    });

    console.log(`  📈 Reranked ${candidates.length} → ${reranked.length} candidates`);
    console.log('  🏆 Top reranked candidates:');
    reranked.slice(0, 3).forEach((r, i) => {
      console.log(`    ${i + 1}. "${r.faq.question}" - ${r.final.toFixed(4)} (${r.matchMethod || 'unknown'})`);
    });
    
    // Update processing details with top candidates
    processingDetails.topCandidates = reranked.slice(0, 5).map(r => ({
      question: r.faq.question,
      similarity: r.sim,
      finalScore: r.final,
      isActive: r.faq.is_active
    }));
    processingDetails.rerankingApplied = true;
    processingDetails.processingSteps.push('Reranking with signals completed');

    const processingTime = Date.now() - startTime;

    // Get the best match
    const bestMatch = reranked[0];
    const confidence = bestMatch?.final || 0;
    const matchedQuestion = bestMatch?.faq?.question || null;
    const confidenceCategory = this.getConfidenceCategory(confidence);
    
    // Update processing details
    processingDetails.confidenceCategory = confidenceCategory;

    console.log('🎯 ===== FINAL DECISION =====');
    console.log('  🏆 Best Match:', matchedQuestion || 'None');
    console.log('  📊 Confidence Score:', confidence.toFixed(4));
    console.log('  🏷️ Confidence Category:', confidenceCategory);
    console.log('  🔍 Match Method:', bestMatch?.matchMethod || 'unknown');

    // Prepare context for chat model - use top 1 ranking FAQ as primary context
    const topContext = bestMatch ? [{
      question: bestMatch.faq.question,
      answer: bestMatch.faq.answer,
      confidence: bestMatch.final,
      isTopMatch: true
    }] : [];
    
    // Add additional context from top 3 candidates
    const additionalContext = reranked.slice(1, 3).map(r => ({
      question: r.faq.question,
      answer: r.faq.answer,
      confidence: r.final,
      isTopMatch: false
    }));
    
    const contextItems = [...topContext, ...additionalContext];
    console.log('  📝 Context Items:', contextItems.length);
    console.log('  🏆 Top Context:', topContext.length > 0 ? `"${topContext[0].question}"` : 'None');
    console.log('  📚 Additional Context:', additionalContext.length);

    let answer;
    
    // Always use chat model for response generation
    console.log('⚙️ Strategy: Always using Chat Model for response generation');
    
    // Update processing details
    processingDetails.confidenceThreshold = 'Always use Chat Model';
    processingDetails.contextItems = contextItems;
    
    // Always use chat model (API key already validated)
    console.log('🤖 Using Chat Model for response generation');
    console.log('  📡 Provider:', this.settings.aiProvider);
    console.log('  🔑 API Key:', !!this.apiKey);
    console.log('  🏨 Homestay Data:', this.homestays.length, 'properties');
    console.log('  📊 Top Match Confidence:', confidence.toFixed(4));
    
    try {
      // Enhanced system prompt with homestay data, general knowledge, and conversation memory
      const conversationSummary = conversationContext.summary || 'No previous conversation history.';
      const recentMessages = conversationContext.recentMessages.slice(-3).map(msg => 
        `${msg.isFromCustomer ? 'Customer' : 'Assistant'}: ${msg.message}`
      ).join('\n');
      
      // ===== KNOWLEDGE BASE LOGGING =====
      console.log('🧠 ===== AI KNOWLEDGE BASE FOR THIS QUERY =====');
      console.log('  📚 FAQ Knowledge Base:');
      console.log('    • Total FAQs:', this.faqs.length);
      console.log('    • Active FAQs:', activeFAQs.length);
      console.log('    • Top FAQ Context:', contextItems.length > 0 ? contextItems[0]?.question : 'None');
      if (contextItems.length > 0) {
        console.log('    • FAQ Answer Preview:', contextItems[0]?.answer?.substring(0, 100) + '...');
      }
      
      console.log('  🏨 Homestay Data:');
      console.log('    • Total Homestays:', this.homestays.length);
      console.log('    • Homestay Names:', this.homestays.map(h => h.name).join(', '));
      if (this.homestays.length > 0) {
        console.log('    • Sample Homestay:', JSON.stringify(this.homestays[0], null, 2));
      }
      
      console.log('  🧠 General Knowledge Base:');
      console.log('    • Length:', this.homestayGeneralKnowledge.length, 'characters');
      console.log('    • Preview:', this.homestayGeneralKnowledge.substring(0, 200) + '...');
      
      console.log('  💾 Conversation Memory:');
      console.log('    • Phone Number:', phoneNumber);
      console.log('    • Message Count:', conversationContext.recentMessages.length);
      console.log('    • Has History:', conversationContext.recentMessages.length > 0);
      console.log('    • Conversation Summary:', conversationSummary);
      console.log('    • Recent Messages:', recentMessages);
      
      console.log('  📋 Context Items for AI:');
      contextItems.forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.question}`);
        console.log(`       Answer: ${item.answer?.substring(0, 100)}...`);
        console.log(`       Confidence: ${item.confidence?.toFixed(3)}`);
        console.log(`       Tags: ${item.tags?.join(', ') || 'None'}`);
      });
      
      console.log('  🎯 Final Knowledge Base Summary:');
      console.log('    • FAQ Context Items:', contextItems.length);
      console.log('    • Homestay Properties:', this.homestays.length);
      console.log('    • General Knowledge Length:', this.homestayGeneralKnowledge.length);
      console.log('    • Conversation History Length:', conversationSummary.length);
      console.log('    • Recent Messages Count:', conversationContext.recentMessages.length);
      console.log('🧠 ===== END KNOWLEDGE BASE =====');
      
      const systemPrompt = `You are a professional homestay customer service assistant. 

KNOWLEDGE BASE:
- FAQ Information: Use the provided FAQ context as your primary knowledge source
- Homestay Data: Use the homestay information as supplementary knowledge to enhance your responses
- General Knowledge: Use the general homestay knowledge base for additional context and information
- Conversation Memory: Use previous conversation history to provide personalized and contextual responses

RESPONSE GUIDELINES:
1. Always base your response on the FAQ information provided in the context
2. Use homestay data to supplement and enrich your FAQ-based answers
3. Use general knowledge to provide additional context and comprehensive information
4. Use conversation memory to provide personalized responses and maintain context
5. If the top FAQ match has high confidence, prioritize that information
6. If no FAQ matches well, use homestay data, general knowledge, and conversation memory
7. Be conversational, helpful, and professional
8. Provide specific details about properties, amenities, and services when relevant
9. Always maintain a welcoming and informative tone
10. Reference previous conversation when relevant to show continuity

Remember: FAQ information takes TOP PRIORITY, but homestay data, general knowledge, and conversation memory should be used to make responses more comprehensive and personalized.

GENERAL KNOWLEDGE BASE:
${this.homestayGeneralKnowledge || 'No general knowledge available.'}

CONVERSATION HISTORY:
${conversationSummary}

RECENT MESSAGES:
${recentMessages || 'No recent messages.'}`;

      answer = await callChatModel({
        settings: this.settings,
        apiKey: this.apiKey,
        systemPrompt,
        contextItems,
        userMessage,
        homestays: this.homestays
      });
      console.log('  ✅ Chat model response generated');
      processingDetails.finalDecision = `Chat model (confidence: ${confidence.toFixed(3)})`;
      processingDetails.processingSteps.push('Chat model response generated with homestay knowledge base');
    } catch (error) {
      console.error('  ❌ Chat model error:', error);
      console.error('🚨 CRITICAL: Chat model failed - no response will be generated');
      console.error('🔧 Developer Alert: Check API key validity and OpenAI service status');
      
      // Return null answer instead of fallback
      answer = null;
      processingDetails.finalDecision = 'No response - Chat model failed';
      processingDetails.processingSteps.push('Chat model failed, no response generated');
    }

    // Save conversation memory
    if (answer) {
      // Add customer message to memory
      conversationMemoryService.addMessage(phoneNumber, userMessage, true, {
        source: 'AIService',
        timestamp: nowISO()
      });
      
      // Add AI response to memory
      conversationMemoryService.addMessage(phoneNumber, answer, false, {
        source: 'AIService',
        confidence: confidence,
        matchedQuestion: matchedQuestion,
        processingTime: processingTime,
        timestamp: nowISO()
      });
      
      // Generate conversation summary
      const summary = conversationMemoryService.generateSummary(phoneNumber);
      console.log('💾 Memory: Conversation summary updated');
    }

    const result = {
      answer,
      confidence,
      matchedQuestion,
      processingTime,
      contextItems,
      source: 'AIService',
      processingDetails,
      conversationMemory: {
        phoneNumber: phoneNumber,
        messageCount: conversationContext.recentMessages.length,
        hasHistory: conversationContext.recentMessages.length > 0
      }
    };

    const totalProcessingTime = Date.now() - startTime;
    
    console.log('🏁 ===== AI PROCESSING COMPLETED =====');
    console.log('  ⏱️ Total Processing Time:', totalProcessingTime + 'ms');
    console.log('  📊 Final Confidence:', confidence.toFixed(4));
    console.log('  🏷️ Confidence Category:', confidenceCategory);
    console.log('  📝 Answer Length:', answer.length + ' characters');
    console.log('  🔍 Match Method:', bestMatch?.matchMethod || 'unknown');
    console.log('  📋 Processing Steps:', processingDetails.processingSteps.length);
    console.log('  ✅ Result Summary:', {
      hasAnswer: !!answer,
      hasMatch: !!matchedQuestion,
      confidence: confidence.toFixed(4),
      processingTime: totalProcessingTime + 'ms',
      answerPreview: answer.substring(0, 100) + (answer.length > 100 ? '...' : ''),
      finalDecision: processingDetails.finalDecision
    });
    console.log('=====================================');

    return result;
  }

  // Get fallback answer
  getFallbackAnswer(userMessage, contextItems) {
    // Get fallback messages from settings
    const responseTemplates = this.settings.aiRules?.responseTemplates || {};
    
    // Simple language detection
    const isChinese = /[\u4e00-\u9fa5]/.test(userMessage);
    const language = isChinese ? 'zh' : 'en';
    
    // Check if this is a greeting message
    const greetingKeywords = ['hello', 'hi', 'help', '你好', '嗨', '帮助'];
    const isGreeting = greetingKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    
    if (isGreeting) {
      // For greeting messages, only return the greeting (no fallback)
      const greeting = responseTemplates[language]?.greeting || 
                      responseTemplates.en?.greeting || 
                      "Hello! Welcome to our homestay service. How can I help you today?";
      console.log('  👋 Detected greeting message, returning greeting only');
      return greeting;
    }
    
    // For non-greeting messages, return fallback message
    const answer = responseTemplates[language]?.fallback || 
                   responseTemplates.en?.fallback || 
                   "Sorry, I couldn't understand your question. We will have someone contact you soon.";
    
    console.log('  🔄 Returning fallback message for non-greeting');
    return answer;
  }

  // Log interaction to localStorage with detailed AI processing info
  logInteraction(userMessage, response, channel = 'AIService', processingDetails = {}) {
    const logEntry = {
      id: Date.now(),
      created_at: nowISO(),
      channel: channel,
      incoming_text: userMessage,
      matched_question: response.matchedQuestion,
      confidence: response.confidence,
      answer: response.answer,
      processing_time: response.processingTime,
      source: response.source,
      // Detailed AI processing information
      ai_processing: {
        total_faqs: processingDetails.totalFaqs || 0,
        active_faqs: processingDetails.activeFaqs || 0,
        candidates_found: processingDetails.candidatesFound || 0,
        top_candidates: processingDetails.topCandidates || [],
        confidence_threshold: processingDetails.confidenceThreshold || 0.6,
        final_decision: processingDetails.finalDecision || 'unknown',
        context_items: processingDetails.contextItems || [],
        processing_steps: processingDetails.processingSteps || []
      }
    };

    const logs = readLS(STORAGE_KEYS.logs, []);
    logs.push(logEntry);
    writeLS(STORAGE_KEYS.logs, logs);
    
    console.log('🤖 Interaction logged with AI details:', logEntry.id);
    return logEntry;
  }

  // Process message and log (convenience method)
  async processAndLog(userMessage, channel = 'AIService') {
    try {
      const response = await this.processMessage(userMessage);
      const logEntry = this.logInteraction(userMessage, response, channel, response.processingDetails);
      return { ...response, logEntry };
    } catch (error) {
      console.error('❌ Error in processAndLog:', error);
      
      // Return a fallback response using settings
      const responseTemplates = this.settings.aiRules?.responseTemplates || {};
      const fallbackMessage = responseTemplates.en?.fallback || 
                             'I apologize, but I\'m experiencing technical difficulties. Please try again later.';
      
      const fallbackResponse = {
        answer: fallbackMessage,
        confidence: 0,
        matchedQuestion: null,
        processingTime: 0,
        contextItems: [],
        source: 'AIService',
        processingDetails: {
          totalFaqs: this.faqs.length,
          activeFaqs: this.getActiveFAQs().length,
          candidatesFound: 0,
          topCandidates: [],
          confidenceThreshold: 'No threshold (using best match)',
          similarityThreshold: this.settings.similarityThreshold || 0.3,
          finalDecision: 'Error fallback',
          contextItems: [],
          processingSteps: ['Error occurred', 'Fallback response generated'],
          searchMethod: 'Error',
          rerankingApplied: false,
          confidenceCategory: 'Low'
        }
      };
      
      const logEntry = this.logInteraction(userMessage, fallbackResponse, channel, fallbackResponse.processingDetails);
      return { ...fallbackResponse, logEntry };
    }
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;
