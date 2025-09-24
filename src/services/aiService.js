/**
 * Unified AI Processing Service
 * Centralized AI processing for Chat Tester, Messages, and Webhook
 */

import { readLS, writeLS, STORAGE_KEYS } from '../services/storage.js';
import { simpleSimilarityScore } from '../utils/nlp.js';
import { rerankWithSignals, callChatModel } from '../utils/rag.js';
import { buildEmbedding, cosineSim } from '../utils/embedding.js';
import { nowISO } from '../utils/helpers.js';

class AIService {
  constructor() {
    this.settings = readLS(STORAGE_KEYS.settings, {});
    this.faqs = readLS(STORAGE_KEYS.faqs, []);
    this.homestays = readLS(STORAGE_KEYS.homestays, []);
  }

  // Update data from localStorage
  refreshData() {
    this.settings = readLS(STORAGE_KEYS.settings, {});
    this.faqs = readLS(STORAGE_KEYS.faqs, []);
    this.homestays = readLS(STORAGE_KEYS.homestays, []);
  }

  // Get active FAQs only
  getActiveFAQs() {
    return this.faqs.filter(faq => faq.is_active === true);
  }

  // Process message with unified AI logic
  async processMessage(userMessage, options = {}) {
    const startTime = Date.now();
    
    console.log('🤖 AIService: Processing message:', userMessage);
    console.log('🤖 AIService: Available FAQs:', this.faqs.length);
    console.log('🤖 AIService: Active FAQs:', this.getActiveFAQs().length);
    
    // Refresh data to get latest changes
    this.refreshData();
    
    const activeFAQs = this.getActiveFAQs();
    let candidates = [];
    
    // Initialize processing details for logging
    const processingDetails = {
      totalFaqs: this.faqs.length,
      activeFaqs: activeFAQs.length,
      candidatesFound: 0,
      topCandidates: [],
      confidenceThreshold: this.settings.confidenceThreshold || 0.6,
      finalDecision: 'unknown',
      contextItems: [],
      processingSteps: []
    };
    
    try {
      // Use embedding-based search if available
      if (this.settings.aiProvider && this.settings.aiProvider !== 'LocalMock') {
        const queryEmbedding = await buildEmbedding(userMessage, this.settings);
        
        candidates = await Promise.all(
          activeFAQs.map(async (faq) => {
            let similarity = 0;
            
            if (faq.embedding && Array.isArray(faq.embedding) && faq.embedding.length > 0) {
              // Use stored embedding if available
              similarity = cosineSim(queryEmbedding, faq.embedding);
              console.log(`🤖 FAQ "${faq.question}" - Embedding similarity: ${similarity}`);
            } else {
              // Fallback to simple similarity if no embedding
              similarity = simpleSimilarityScore(userMessage, faq);
              console.log(`🤖 FAQ "${faq.question}" - Simple similarity: ${similarity}`);
            }
            
            return { faq, sim: similarity };
          })
        );
        
        candidates = candidates
          .filter(c => c.sim > 0)
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 10);
          
        console.log('🤖 Candidates found:', candidates.length);
        
        // Update processing details
        processingDetails.candidatesFound = candidates.length;
        processingDetails.processingSteps.push('Embedding-based search completed');
      } else {
        // Use simple similarity for LocalMock or when no AI provider
        candidates = activeFAQs
          .map(faq => {
            const sim = simpleSimilarityScore(userMessage, faq);
            console.log(`🤖 FAQ "${faq.question}" - Simple similarity: ${sim}`);
            return { faq, sim };
          })
          .filter(c => c.sim > 0)
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 10);
          
        console.log('🤖 Simple candidates found:', candidates.length);
        
        // Update processing details
        processingDetails.candidatesFound = candidates.length;
        processingDetails.processingSteps.push('Simple similarity search completed');
      }
    } catch (error) {
      console.error('🤖 Embedding search error:', error);
      // Fallback to simple similarity
      candidates = activeFAQs
        .map(faq => {
          const sim = simpleSimilarityScore(userMessage, faq);
          console.log(`🤖 Fallback FAQ "${faq.question}" - similarity: ${sim}`);
          return { faq, sim };
        })
        .filter(c => c.sim > 0)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 10);
        
      console.log('🤖 Fallback candidates found:', candidates.length);
      
      // Update processing details
      processingDetails.candidatesFound = candidates.length;
      processingDetails.processingSteps.push('Fallback similarity search completed');
    }

    // Rerank with signals
    const reranked = rerankWithSignals({
      query: userMessage,
      homestays: this.homestays,
      candidates
    });

    console.log('🤖 Reranked count:', reranked.length);
    console.log('🤖 Top candidates:', reranked.slice(0, 3).map(r => ({ 
      question: r.faq.question, 
      final: r.final 
    })));
    
    // Update processing details with top candidates
    processingDetails.topCandidates = reranked.slice(0, 5).map(r => ({
      question: r.faq.question,
      similarity: r.sim,
      finalScore: r.final,
      isActive: r.faq.is_active
    }));
    processingDetails.processingSteps.push('Reranking with signals completed');

    const processingTime = Date.now() - startTime;

    // Get the best match
    const bestMatch = reranked[0];
    const confidence = bestMatch?.final || 0;
    const matchedQuestion = bestMatch?.faq?.question || null;

    console.log('🤖 Best match:', { question: matchedQuestion, confidence });

    // Prepare context for chat model
    const contextItems = reranked.slice(0, 3).map(r => ({
      question: r.faq.question,
      answer: r.faq.answer,
      confidence: r.final
    }));

    console.log('🤖 Context items:', contextItems.length);

    let answer;
    
    // Get confidence threshold from settings
    const confidenceThreshold = this.settings.confidenceThreshold || 0.6;
    console.log('🤖 Using confidence threshold:', confidenceThreshold);
    
    // Update processing details
    processingDetails.confidenceThreshold = confidenceThreshold;
    processingDetails.contextItems = contextItems;
    
    // Use chat model if available and confidence is high enough
    if (this.settings.aiProvider && this.settings.aiProvider !== 'LocalMock' && confidence > confidenceThreshold) {
      try {
        answer = await callChatModel({
          settings: this.settings,
          systemPrompt: "You are a professional homestay customer service assistant. Please answer customer questions based on the provided FAQ information. FAQ information takes TOP PRIORITY. Only use homestay data to supplement FAQ answers when relevant. If no FAQ matches, provide general homestay information. Always prioritize FAQ knowledge over general homestay data.",
          contextItems,
          userMessage,
          homestays: this.homestays
        });
        console.log('🤖 Chat model response generated (confidence > threshold)');
        processingDetails.finalDecision = 'Chat model (high confidence)';
        processingDetails.processingSteps.push('Chat model response generated');
      } catch (error) {
        console.error('🤖 Chat model error:', error);
        answer = this.getFallbackAnswer(userMessage, contextItems);
        processingDetails.finalDecision = 'Fallback (chat model error)';
        processingDetails.processingSteps.push('Chat model failed, using fallback');
      }
    } else {
      // Use simple answer or fallback based on confidence threshold
      if (bestMatch && confidence > confidenceThreshold) {
        answer = bestMatch.faq.answer;
        console.log('🤖 Using FAQ answer (confidence > threshold)');
        processingDetails.finalDecision = 'FAQ answer (high confidence)';
        processingDetails.processingSteps.push('FAQ answer selected');
      } else {
        answer = this.getFallbackAnswer(userMessage, contextItems);
        console.log('🤖 Using fallback answer (confidence < threshold)');
        processingDetails.finalDecision = 'Fallback (low confidence)';
        processingDetails.processingSteps.push('Fallback answer selected');
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

    console.log('🤖 Final result:', {
      answer: answer.substring(0, 100) + '...',
      confidence,
      matchedQuestion,
      processingTime,
      finalDecision: processingDetails.finalDecision
    });

    return result;
  }

  // Get fallback answer
  getFallbackAnswer(userMessage, contextItems) {
    const fallbackMessages = {
      en: "Sorry, I couldn't understand your question. We will have someone contact you soon.",
      zh: "抱歉，我没有理解您的问题。我们会尽快安排人员联系您。"
    };

    // Simple language detection
    const isChinese = /[\u4e00-\u9fa5]/.test(userMessage);
    const language = isChinese ? 'zh' : 'en';
    
    let answer = fallbackMessages[language] || fallbackMessages.en;

    // Add greeting for first message
    const greetingKeywords = ['hello', 'hi', 'help', '你好', '嗨', '帮助'];
    if (greetingKeywords.some(keyword => userMessage.toLowerCase().includes(keyword))) {
      const greetings = {
        en: "Hello! Welcome to our homestay service. ",
        zh: "您好！欢迎咨询我们的民宿服务。"
      };
      answer = greetings[language] + answer;
    }

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
    const response = await this.processMessage(userMessage);
    const logEntry = this.logInteraction(userMessage, response, channel, response.processingDetails);
    return { ...response, logEntry };
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;
