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
  
  let answer = templates[language]?.fallback || templates.en?.fallback || defaultTemplates.en.fallback;

  // Add greeting for first message
  const greetingKeywords = ['hello', 'hi', 'help', '你好', '嗨', '帮助'];
  if (greetingKeywords.some(keyword => userMessage.toLowerCase().includes(keyword))) {
    const greeting = templates[language]?.greeting || templates.en?.greeting || defaultTemplates.en.greeting;
    answer = greeting + answer;
  }

  return answer;
}

// Main processing function (matching web app logic)
async function processMessageWithAI(userMessage, fromNumber, faqs, homestays = []) {
  console.log('🤖 Webhook AI: Processing message:', userMessage);
  console.log('🤖 Webhook AI: Available FAQs:', faqs.length);
  
  const startTime = Date.now();
  
  // Filter only active FAQs
  const activeFAQs = faqs.filter(faq => faq.is_active === true);
  console.log('🤖 Webhook AI: Active FAQs:', activeFAQs.length);
  
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

  let answer;
  
  // Always use the best match if available, regardless of confidence threshold
  if (bestMatch && confidence > 0) {
    answer = bestMatch.faq.answer;
    console.log(`🤖 Webhook AI: Using FAQ answer (confidence: ${confidence.toFixed(3)})`);
  } else {
    answer = getFallbackAnswer(userMessage);
    console.log('🤖 Webhook AI: Using fallback answer (no matches found)');
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
      confidenceThreshold: 0.6, // Default threshold for webhook
      similarityThreshold: 0.3, // Default similarity threshold
      searchMethod: 'Simple similarity',
      rerankingApplied: true,
      confidenceCategory: confidence >= 0.8 ? 'High' : confidence >= 0.5 ? 'Medium' : 'Low',
      finalDecision: confidence > 0.6 ? 'FAQ answer (high confidence)' : 'Fallback (low confidence)',
      contextItems: [],
      processingSteps: [
        'FAQ filtering completed',
        'Simple similarity search completed (threshold: 0.3)',
        'Reranking with signals completed',
        confidence > 0.6 ? 'FAQ answer selected' : 'Fallback answer selected'
      ]
    }
  };

  console.log('🤖 Webhook AI: Final result:', {
    answer: answer.substring(0, 100) + '...',
    confidence,
    matchedQuestion,
    processingTime,
    finalDecision: result.processingDetails.finalDecision
  });

  return result;
}

export {
  processMessageWithAI,
  simpleSimilarityScore,
  getFallbackAnswer
};
