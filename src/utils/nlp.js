// NLP utilities: tokenization, similarity, synonyms
import { SYNONYMS } from './constants.js';

export function tokenize(text) {
  const result = (text||"")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  
  return result;
}

export function jaccardSimilarity(aTokens, bTokens) {
  const a = new Set(aTokens); 
  const b = new Set(bTokens);
  const inter = [...a].filter(x => b.has(x)).length; 
  const union = new Set([...a, ...b]).size || 1;
  const score = inter / union; // 0~1
  
  return score;
}

export function simpleSimilarityScore(q, f) {
  if (!f.is_active) return 0;
  const qTokens = tokenize(q);
  const corpus = [f.question, f.answer, (f.tags||[]).join(" ")].join(" ");
  const fTokens = tokenize(corpus);
  let score = jaccardSimilarity(qTokens, fTokens);
  const qLower = q.toLowerCase();
  const fqLower = f.question?.toLowerCase() || '';
  
  // Exact question match gets highest priority
  if (qLower === fqLower) {
    score = 1.0; // Perfect match
  } else if (fqLower.includes(qLower)) {
    score += 0.2;
  }
  
  if ((f.tags||[]).some(t => qLower.includes(t.toLowerCase()))) score += 0.15;
  
  // Debug logging for check-in questions
  if (qLower.includes('check-in') || qLower.includes('checkin') || qLower.includes('what time')) {
    console.log('Check-in similarity debug:', {
      question: q,
      faqQuestion: f.question,
      qTokens,
      fTokens,
      jaccardScore: jaccardSimilarity(qTokens, fTokens),
      questionMatch: f.question?.toLowerCase().includes(qLower),
      tagMatch: (f.tags||[]).some(t => qLower.includes(t.toLowerCase())),
      finalScore: Math.min(1, score),
      isActive: f.is_active
    });
  }
  
  return Math.min(1, score);
}

export function synonymBoost(query, text){
  const q = query.toLowerCase(); 
  let hit = false, score = 0;
  SYNONYMS.forEach(group=>{ 
    if (group.some(g=> q.includes(g))) { 
      hit = true; 
      if (group.some(g=> (text||"").toLowerCase().includes(g))) score += 0.1; 
    } 
  });
  return { hit, score: Math.min(0.2, score) };
}

// Tag-based matching function (highest priority)
export function tagBasedMatch(query, faq) {
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
