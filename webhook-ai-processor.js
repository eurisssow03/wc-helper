/**
 * Webhook AI Processor
 * Uses the same logic as the web app's AI service
 */

// Simple similarity scoring (matching the web app logic)
function tokenize(text) {
  const result = (text||"")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return result;
}

function jaccardSimilarity(aTokens, bTokens) {
  const a = new Set(aTokens); 
  const b = new Set(bTokens);
  const inter = [...a].filter(x => b.has(x)).length; 
  const union = new Set([...a, ...b]).size || 1;
  const score = inter / union; // 0~1
  return score;
}

function simpleSimilarityScore(query, faq) {
  if (!faq.is_active) return 0;
  const qTokens = tokenize(query);
  const corpus = [faq.question, faq.answer, (faq.tags||[]).join(" ")].join(" ");
  const fTokens = tokenize(corpus);
  let score = jaccardSimilarity(qTokens, fTokens);
  
  // Boost score for exact matches
  if (query.toLowerCase().includes(faq.question.toLowerCase())) {
    score += 0.3;
  }
  
  return Math.min(score, 1);
}

// Rerank with signals (simplified version)
function rerankWithSignals({ query, homestays, candidates }) {
  return candidates.map(candidate => {
    let finalScore = candidate.sim;
    
    // Boost for exact question match
    if (query.toLowerCase().includes(candidate.faq.question.toLowerCase())) {
      finalScore += 0.2;
    }
    
    // Boost for tag matches
    const queryLower = query.toLowerCase();
    const tagMatches = (candidate.faq.tags || []).filter(tag => 
      queryLower.includes(tag.toLowerCase())
    ).length;
    finalScore += tagMatches * 0.1;
    
    return {
      ...candidate,
      final: Math.min(finalScore, 1),
      _signals: {
        exactMatch: query.toLowerCase().includes(candidate.faq.question.toLowerCase()),
        tagMatches: tagMatches
      }
    };
  }).sort((a, b) => b.final - a.final);
}

// Tag-based matching function (highest priority)
function tagBasedMatch(query, faq) {
  if (!faq.is_active || !faq.tags || faq.tags.length === 0) {
    return { matched: false, score: 0, matchedTags: [] };
  }
  
  const queryLower = query.toLowerCase();
  const queryTokens = tokenize(query);
  const matchedTags = [];
  let totalScore = 0;
  
  // Check each tag for matches
  faq.tags.forEach(tag => {
    const tagLower = tag.toLowerCase();
    
    // Exact tag match (highest score)
    if (queryLower === tagLower) {
      matchedTags.push(tag);
      totalScore += 1.0;
    }
    // Tag contains query (high score)
    else if (tagLower.includes(queryLower)) {
      matchedTags.push(tag);
      totalScore += 0.8;
    }
    // Query contains tag (medium-high score)
    else if (queryLower.includes(tagLower)) {
      matchedTags.push(tag);
      totalScore += 0.7;
    }
    // Partial token match (medium score)
    else {
      const tagTokens = tokenize(tag);
      const tokenSimilarity = jaccardSimilarity(queryTokens, tagTokens);
      if (tokenSimilarity > 0.3) {
        matchedTags.push(tag);
        totalScore += tokenSimilarity * 0.6;
      }
    }
  });
  
  // Normalize score (max 1.0)
  const normalizedScore = Math.min(1.0, totalScore);
  
  return {
    matched: matchedTags.length > 0,
    score: normalizedScore,
    matchedTags: matchedTags
  };
}

// Combined matching: Tags first, then question similarity
function calculateCombinedSimilarity(userMessage, faq) {
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

// Get fallback answer
function getFallbackAnswer(userMessage, responseTemplates = null) {
  // Use provided response templates or default fallback messages
  const defaultTemplates = {
    en: {
      fallback: "Sorry, I couldn't understand your question. We will have someone contact you soon.",
      greeting: "Hello! Welcome to our homestay service. "
    },
    zh: {
      fallback: "抱歉，我没有理解您的问题。我们会尽快安排人员联系您。",
      greeting: "您好！欢迎咨询我们的民宿服务。"
    }
  };

  const templates = responseTemplates || defaultTemplates;

  // Simple language detection
  const isChinese = /[\u4e00-\u9fa5]/.test(userMessage);
  const language = isChinese ? 'zh' : 'en';
  
  // Check if this is a greeting message
  const greetingKeywords = ['hello', 'hi', 'help', '你好', '嗨', '帮助'];
  const isGreeting = greetingKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  
  if (isGreeting) {
    // For greeting messages, only return the greeting (no fallback)
    const greeting = templates[language]?.greeting || templates.en?.greeting || defaultTemplates.en.greeting;
    console.log('  👋 Detected greeting message, returning greeting only');
    return greeting;
  }
  
  // For non-greeting messages, return fallback message
  const answer = templates[language]?.fallback || templates.en?.fallback || defaultTemplates.en.fallback;
  console.log('  🔄 Returning fallback message for non-greeting');

  return answer;
}

// Import conversation memory service (we'll need to create a simplified version for webhook)
// For now, we'll use a simple in-memory storage for webhook
const webhookMemory = {};

// Simple memory functions for webhook
function getWebhookMemory(phoneNumber) {
  const normalizedPhone = phoneNumber.replace(/[^\d]/g, '');
  return webhookMemory[normalizedPhone] || {
    messages: [],
    lastUpdated: null,
    context: {}
  };
}

function addWebhookMessage(phoneNumber, message, isFromCustomer = true) {
  const normalizedPhone = phoneNumber.replace(/[^\d]/g, '');
  
  if (!webhookMemory[normalizedPhone]) {
    webhookMemory[normalizedPhone] = {
      messages: [],
      lastUpdated: null,
      context: {}
    };
  }

  const messageEntry = {
    id: Date.now() + Math.random(),
    message: message,
    isFromCustomer: isFromCustomer,
    timestamp: new Date().toISOString()
  };

  webhookMemory[normalizedPhone].messages.push(messageEntry);
  webhookMemory[normalizedPhone].lastUpdated = new Date().toISOString();

  // Extract property context from customer messages
  if (isFromCustomer) {
    const lowerMessage = message.toLowerCase();
    const propertyKeywords = [
      { name: 'Trefoil Shah Alam', keywords: ['trefoil', 'shah alam', 'trefoil shah alam'] },
      { name: 'Palas Horizon Cameron', keywords: ['palas', 'horizon', 'cameron', 'palas horizon', 'cameron highlands'] },
      { name: 'Condo Manhattan Ipoh', keywords: ['manhattan', 'ipoh', 'condo manhattan', 'manhattan ipoh'] }
    ];

    for (const property of propertyKeywords) {
      const isPropertyMentioned = property.keywords.some(keyword => 
        lowerMessage.includes(keyword)
      );
      
      if (isPropertyMentioned) {
        webhookMemory[normalizedPhone].context.currentProperty = {
          name: property.name,
          mentionedIn: message,
          timestamp: new Date().toISOString(),
          confidence: 'high'
        };
        console.log(`🏨 Webhook: Property context updated: ${property.name} mentioned in conversation`);
        break;
      }
    }
  }

  // Keep only last 10 messages for webhook
  if (webhookMemory[normalizedPhone].messages.length > 10) {
    webhookMemory[normalizedPhone].messages = webhookMemory[normalizedPhone].messages.slice(-10);
  }
}

// Main processing function (matching web app logic)
async function processMessageWithAI(userMessage, fromNumber, faqs, homestays = [], homestayGeneralKnowledge = "") {
  console.log('🚀 ===== WEBHOOK AI PROCESSING STARTED =====');
  console.log('📝 Input Message:', `"${userMessage}"`);
  console.log('📞 From Number:', fromNumber);
  console.log('⏰ Start Time:', new Date().toISOString());
  // Load conversation memory for this phone number
  const conversationMemory = getWebhookMemory(fromNumber);
  console.log('💾 Conversation Memory:');
  console.log('  📱 Phone Number:', fromNumber);
  console.log('  💬 Recent Messages:', conversationMemory.messages.length);
  console.log('  📋 Context Keys:', Object.keys(conversationMemory.context).length);
  
  console.log('📊 Data Status:');
  console.log('  📚 Total FAQs:', faqs.length);
  console.log('  🏨 Homestays:', homestays.length);
  console.log('  🧠 General Knowledge:', homestayGeneralKnowledge.length, 'characters');
  
  const startTime = Date.now();
  
  // Filter only active FAQs
  const activeFAQs = faqs.filter(faq => faq.is_active === true);
  console.log('  ✅ Active FAQs:', activeFAQs.length);
  
  // Check if this is a greeting message first
  const greetingKeywords = ['hello', 'hi', 'help', '你好', '嗨', '帮助'];
  const isGreeting = greetingKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  
  if (isGreeting) {
    console.log('👋 Detected greeting message, skipping similarity search');
    const isChinese = /[\u4e00-\u9fa5]/.test(userMessage);
    const language = isChinese ? 'zh' : 'en';
    
    const greeting = language === 'zh' 
      ? "您好！欢迎咨询我们的民宿服务。"
      : "Hello! Welcome to our homestay service. How can I help you today?";
    
    const processingTime = Date.now() - startTime;
    const result = {
      answer: greeting,
      confidence: 1.0, // Perfect confidence for greeting
      matchedQuestion: null,
      processingTime,
      source: 'WebhookAI',
      processingDetails: {
        totalFaqs: faqs.length,
        activeFaqs: activeFAQs.length,
        candidatesFound: 0,
        topCandidates: [],
        confidenceThreshold: 'Greeting detected (no threshold)',
        similarityThreshold: 0.3,
        finalDecision: 'Greeting response',
        contextItems: [],
        processingSteps: ['Greeting message detected', 'Greeting response generated'],
        searchMethod: 'Greeting Detection',
        rerankingApplied: false,
        confidenceCategory: 'High'
      }
    };
    
    console.log('🏁 ===== WEBHOOK AI PROCESSING COMPLETED (GREETING) =====');
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
    console.log('==========================================');
    
    return result;
  }
  
  if (activeFAQs.length === 0) {
    console.log('🤖 Webhook AI: No active FAQs, using fallback');
    return {
      answer: getFallbackAnswer(userMessage),
      confidence: 0,
      matchedQuestion: null,
      processingTime: Date.now() - startTime,
      source: 'WebhookAI'
    };
  }
  
  // Get candidates using combined similarity (tags first, then question)
  let candidates = activeFAQs
    .map(faq => {
      const combinedMatch = calculateCombinedSimilarity(userMessage, faq);
      console.log(`🤖 FAQ "${faq.question}" - similarity: ${combinedMatch.score} (${combinedMatch.method})`);
      return { faq, sim: combinedMatch.score, matchMethod: combinedMatch.method };
    })
    .filter(c => c.sim > 0)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 10);
    
  console.log('🤖 Webhook AI: Candidates found:', candidates.length);
  
  // Rerank with signals
  const reranked = rerankWithSignals({
    query: userMessage,
    homestays: homestays,
    candidates
  });

  console.log('🤖 Webhook AI: Reranked count:', reranked.length);
  console.log('🤖 Webhook AI: Top candidates:', reranked.slice(0, 3).map(r => ({ 
    question: r.faq.question, 
    final: r.final 
  })));

  const processingTime = Date.now() - startTime;

  // Get the best match
  const bestMatch = reranked[0];
  const confidence = bestMatch?.final || 0;
  const matchedQuestion = bestMatch?.faq?.question || null;

  console.log('🤖 Webhook AI: Best match:', { question: matchedQuestion, confidence });

  // ===== KNOWLEDGE BASE LOGGING =====
  console.log('🧠 ===== WEBHOOK AI KNOWLEDGE BASE FOR THIS QUERY =====');
  console.log('  📚 FAQ Knowledge Base:');
  console.log('    • Total FAQs:', faqs.length);
  console.log('    • Active FAQs:', activeFAQs.length);
  console.log('    • Top FAQ Match:', bestMatch ? bestMatch.faq.question : 'None');
  if (bestMatch) {
    console.log('    • FAQ Answer Preview:', bestMatch.faq.answer?.substring(0, 100) + '...');
  }
  
  console.log('  🏨 Homestay Data:');
  console.log('    • Total Homestays:', homestays.length);
  console.log('    • Homestay Names:', homestays.map(h => h.name).join(', '));
  if (homestays.length > 0) {
    console.log('    • Sample Homestay:', JSON.stringify(homestays[0], null, 2));
  }
  
  console.log('  🧠 General Knowledge Base:');
  console.log('    • Length:', homestayGeneralKnowledge.length, 'characters');
  console.log('    • Preview:', homestayGeneralKnowledge.substring(0, 200) + '...');
  
  console.log('  💾 Conversation Memory:');
  console.log('    • Phone Number:', fromNumber);
  console.log('    • Message Count:', conversationMemory.messages.length);
  console.log('    • Has History:', conversationMemory.messages.length > 0);
  console.log('    • Recent Messages:', conversationMemory.messages.slice(-3).map(msg => 
    `${msg.isFromCustomer ? 'Customer' : 'Assistant'}: ${msg.message}`
  ).join('\n'));
  
  console.log('  🏨 Property Context:');
  const currentProperty = conversationMemory.context?.currentProperty;
  if (currentProperty) {
    console.log('    • Current Property:', currentProperty.name);
    console.log('    • Mentioned In:', currentProperty.mentionedIn);
    console.log('    • Confidence:', currentProperty.confidence);
    console.log('    • Timestamp:', currentProperty.timestamp);
  } else {
    console.log('    • No specific property context');
  }
  
  console.log('  📋 Context Items for AI:');
  const topContext = bestMatch ? [{
    question: bestMatch.faq.question,
    answer: bestMatch.faq.answer,
    confidence: bestMatch.final,
    isTopMatch: true
  }] : [];
  
  const additionalContext = reranked.slice(1, 3).map(r => ({
    question: r.faq.question,
    answer: r.faq.answer,
    confidence: r.final,
    isTopMatch: false
  }));
  
  const contextItems = [...topContext, ...additionalContext];
  contextItems.forEach((item, index) => {
    console.log(`    ${index + 1}. ${item.question}`);
    console.log(`       Answer: ${item.answer?.substring(0, 100)}...`);
    console.log(`       Confidence: ${item.confidence?.toFixed(3)}`);
    console.log(`       Is Top Match: ${item.isTopMatch}`);
  });
  
  console.log('  🎯 Final Knowledge Base Summary:');
  console.log('    • FAQ Context Items:', contextItems.length);
  console.log('    • Homestay Properties:', homestays.length);
  console.log('    • General Knowledge Length:', homestayGeneralKnowledge.length);
  console.log('    • Conversation History Length:', conversationMemory.messages.length);
  console.log('    • Recent Messages Count:', conversationMemory.messages.length);
  console.log('🧠 ===== END WEBHOOK KNOWLEDGE BASE =====');

  // Context items are already prepared above in the knowledge base logging section
  console.log('  📝 Context Items:', contextItems.length);
  console.log('  🏆 Top Context:', topContext.length > 0 ? `"${topContext[0].question}"` : 'None');
  console.log('  📚 Additional Context:', additionalContext.length);

  let answer;
  
  // Webhook mode - no API key available, so no response
  console.log('⚙️ Strategy: Webhook mode - no API key available');
  console.error('🚨 CRITICAL: Webhook AI requires API key for response generation');
  console.error('🔧 Developer Alert: Webhook server needs OpenAI API key configuration');
  console.error('❌ No response will be generated from webhook');
  
  // Return null answer - no response
  answer = null;

  // Save conversation memory (even for no response)
  addWebhookMessage(fromNumber, userMessage, true);
  if (answer) {
    addWebhookMessage(fromNumber, answer, false);
  }

  const result = {
    answer,
    confidence,
    matchedQuestion,
    processingTime,
    source: 'WebhookAI',
    processingDetails: {
      totalFaqs: faqs.length,
      activeFaqs: activeFAQs.length,
      candidatesFound: candidates.length,
      topCandidates: candidates.slice(0, 5).map(c => ({
        question: c.faq.question,
        similarity: c.sim,
        finalScore: c.final,
        isActive: c.faq.is_active
      })),
      confidenceThreshold: 'API key required',
      similarityThreshold: 0.3, // Default similarity threshold
      searchMethod: 'Simple similarity',
      rerankingApplied: true,
      confidenceCategory: 'Error',
      finalDecision: 'No response - API key required',
      contextItems: contextItems,
      processingSteps: [
        'FAQ filtering completed',
        'Simple similarity search completed (threshold: 0.3)',
        'Reranking with signals completed',
        'Top ranking FAQ selected as primary context',
        'Homestay data available as knowledge base',
        `General knowledge available (${homestayGeneralKnowledge.length} characters)`,
        'API key validation failed - no response generated'
      ]
    }
  };

  const totalProcessingTime = Date.now() - startTime;
  
  console.log('🏁 ===== WEBHOOK AI PROCESSING COMPLETED =====');
  console.log('  ⏱️ Total Processing Time:', totalProcessingTime + 'ms');
  console.log('  📊 Final Confidence:', confidence.toFixed(4));
  console.log('  📝 Answer Length:', answer.length + ' characters');
  console.log('  🔍 Match Method:', bestMatch?.matchMethod || 'unknown');
  console.log('  ✅ Result Summary:', {
    hasAnswer: !!answer,
    hasMatch: !!matchedQuestion,
    confidence: confidence.toFixed(4),
    processingTime: totalProcessingTime + 'ms',
    answerPreview: answer.substring(0, 100) + (answer.length > 100 ? '...' : ''),
    finalDecision: result.processingDetails?.finalDecision || 'unknown'
  });
  console.log('==========================================');

  return result;
}

export {
  processMessageWithAI,
  simpleSimilarityScore,
  getFallbackAnswer
};
