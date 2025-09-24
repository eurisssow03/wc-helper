/**
 * Unified AI Processing Service
 * Centralized AI processing for Chat Tester, Messages, and Webhook
 */

import { readLS, writeLS, STORAGE_KEYS } from '../services/storage.js';
import { simpleSimilarityScore, tagBasedMatch } from '../utils/nlp.js';
import { rerankWithSignals, callChatModel } from '../utils/rag.js';
import { buildEmbedding, cosineSim } from '../utils/embedding.js';
import { nowISO } from '../utils/helpers.js';

class AIService {
  constructor() {
    this.settings = readLS(STORAGE_KEYS.settings, {});
    this.faqs = readLS(STORAGE_KEYS.faqs, []);
    this.homestays = readLS(STORAGE_KEYS.homestays, []);
    this.apiKey = null;
    this.apiKeyLoaded = false;
    
    console.log('🏗️ AIService: Constructor - FAQs:', this.faqs.length, 'Homestays:', this.homestays.length);
    console.log('🏗️ AIService: Active FAQs:', this.getActiveFAQs().length);
    
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

    // Only set aiProvider to LocalMock if it's completely missing
    if (!this.settings.aiProvider) {
      this.settings.aiProvider = 'LocalMock';
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
    
    console.log('🔄 AIService: Data refreshed - FAQs:', this.faqs.length, 'Homestays:', this.homestays.length);
    console.log('🔄 AIService: Active FAQs:', this.getActiveFAQs().length);
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
      console.log('🔄 Switching to LocalMock mode');
      this.settings.aiProvider = 'LocalMock';
      writeLS(STORAGE_KEYS.settings, this.settings);
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
    
    console.log('🚀 ===== AI PROCESSING STARTED =====');
    console.log('📝 Input Message:', `"${userMessage}"`);
    console.log('⏰ Start Time:', new Date().toISOString());
    
    // Refresh data to get latest changes FIRST
    this.refreshData();
    
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
    
    // Load API key from backend if needed
    if (this.settings.aiProvider && this.settings.aiProvider !== 'LocalMock') {
      const apiKey = await this.loadApiKey();
      if (!apiKey) {
        console.log('🔄 No API key available, forcing LocalMock mode');
        this.settings.aiProvider = 'LocalMock';
        // Update settings in localStorage
        writeLS(STORAGE_KEYS.settings, this.settings);
        // Refresh settings to ensure the change is applied
        this.refreshData();
      }
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
      // Use embedding-based search if available and we have API key
      if (this.settings.aiProvider && this.settings.aiProvider !== 'LocalMock' && this.apiKey) {
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
          // Force switch to LocalMock and use simple similarity
          this.settings.aiProvider = 'LocalMock';
          writeLS(STORAGE_KEYS.settings, this.settings);
          
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
        // Use combined similarity for LocalMock or when no AI provider
        console.log('🤖 Using combined similarity search (LocalMock or no API key)');
        candidates = activeFAQs
          .map(faq => {
            const combinedMatch = this.calculateCombinedSimilarity(userMessage, faq);
            console.log(`🤖 FAQ "${faq.question}" - Combined similarity: ${combinedMatch.score} (${combinedMatch.method})`);
            return { faq, sim: combinedMatch.score, matchMethod: combinedMatch.method };
          })
          .filter(c => c.sim > (this.settings.similarityThreshold || 0.3))
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 10);
          
        console.log('🤖 Simple candidates found:', candidates.length, `(similarity > ${this.settings.similarityThreshold || 0.3})`);
        
        // Update processing details
        processingDetails.candidatesFound = candidates.length;
        processingDetails.similarityThreshold = this.settings.similarityThreshold || 0.3;
        processingDetails.searchMethod = 'Simple similarity';
        processingDetails.processingSteps.push(`Simple similarity search completed (threshold: ${this.settings.similarityThreshold || 0.3})`);
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

    // Prepare context for chat model
    const contextItems = reranked.slice(0, 3).map(r => ({
      question: r.faq.question,
      answer: r.faq.answer,
      confidence: r.final
    }));

    console.log('  📝 Context Items:', contextItems.length);

    let answer;
    
    // No confidence threshold - always use best match
    console.log('⚙️ Strategy: Using best match (no threshold)');
    
    // Update processing details
    processingDetails.confidenceThreshold = 'No threshold (using best match)';
    processingDetails.contextItems = contextItems;
    
    // Use chat model if available (no confidence threshold)
    if (this.settings.aiProvider && this.settings.aiProvider !== 'LocalMock' && confidence > 0) {
      console.log('🤖 Using Chat Model for response generation');
      console.log('  📡 Provider:', this.settings.aiProvider);
      console.log('  🔑 API Key:', !!this.apiKey);
      try {
        answer = await callChatModel({
          settings: this.settings,
          apiKey: this.apiKey,
          systemPrompt: "You are a professional homestay customer service assistant. Please answer customer questions based on the provided FAQ information. FAQ information takes TOP PRIORITY. Only use homestay data to supplement FAQ answers when relevant. If no FAQ matches, provide general homestay information. Always prioritize FAQ knowledge over general homestay data.",
          contextItems,
          userMessage,
          homestays: this.homestays
        });
        console.log('  ✅ Chat model response generated');
        processingDetails.finalDecision = 'Chat model (high confidence)';
        processingDetails.processingSteps.push('Chat model response generated');
      } catch (error) {
        console.error('  ❌ Chat model error:', error);
        answer = this.getFallbackAnswer(userMessage, contextItems);
        processingDetails.finalDecision = 'Fallback (chat model error)';
        processingDetails.processingSteps.push('Chat model failed, using fallback');
      }
    } else {
      // Always use the best match if available, regardless of confidence threshold
      if (bestMatch && confidence > 0) {
        answer = bestMatch.faq.answer;
        console.log(`📝 Using FAQ answer (confidence: ${confidence.toFixed(3)})`);
        console.log(`  ❓ Question: "${matchedQuestion}"`);
        console.log(`  💬 Answer: "${answer.substring(0, 100)}${answer.length > 100 ? '...' : ''}"`);
        processingDetails.finalDecision = `FAQ answer (confidence: ${confidence.toFixed(3)})`;
        processingDetails.processingSteps.push('FAQ answer selected (no threshold)');
      } else {
        answer = this.getFallbackAnswer(userMessage, contextItems);
        console.log('🔄 Using fallback answer (no matches found)');
        console.log(`  💬 Fallback: "${answer.substring(0, 100)}${answer.length > 100 ? '...' : ''}"`);
        processingDetails.finalDecision = 'Fallback (no matches)';
        processingDetails.processingSteps.push('Fallback answer selected (no matches)');
      }
    }

    const result = {
      answer,
      confidence,
      matchedQuestion,
      processingTime,
      contextItems,
      source: 'AIService',
      processingDetails
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
