// NLP utilities: tokenization, similarity, synonyms
import { SYNONYMS } from './constants.js';

export function tokenize(text) {
  const result = (text||"")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  
  // Debug logging for check-in questions
  if (text && text.toLowerCase().includes('check')) {
    console.log('Tokenize debug:', {
      input: text,
      output: result
    });
  }
  
  return result;
}

export function jaccardSimilarity(aTokens, bTokens) {
  const a = new Set(aTokens); 
  const b = new Set(bTokens);
  const inter = [...a].filter(x => b.has(x)).length; 
  const union = new Set([...a, ...b]).size || 1;
  const score = inter / union; // 0~1
  
  // Debug logging for check-in questions
  if (aTokens.some(token => token.includes('check')) || bTokens.some(token => token.includes('check'))) {
    console.log('Jaccard similarity debug:', {
      aTokens,
      bTokens,
      inter,
      union,
      score,
      aSet: Array.from(a),
      bSet: Array.from(b)
    });
  }
  
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
