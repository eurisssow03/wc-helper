// Language detection and AI rules utilities

// Simple language detection based on character patterns
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  
  const cleanText = text.trim().toLowerCase();
  
  // Chinese detection (Chinese characters)
  const chinesePattern = /[\u4e00-\u9fff]/;
  if (chinesePattern.test(cleanText)) {
    return 'zh';
  }
  
  // Malay/Indonesian detection (common words)
  const malayWords = ['saya', 'anda', 'terima', 'kasih', 'tolong', 'boleh', 'minta', 'maaf', 'selamat', 'pagi', 'siang', 'malam', 'terima kasih', 'sama-sama'];
  const malayCount = malayWords.filter(word => cleanText.includes(word)).length;
  if (malayCount >= 2) {
    return 'ms';
  }
  
  // Hindi/Tamil detection (common words)
  const hindiWords = ['namaste', 'dhanyawad', 'kripya', 'aap', 'main', 'hai', 'hain', 'kaise', 'kya', 'kahan'];
  const tamilWords = ['vanakkam', 'nandri', 'epdi', 'enna', 'eppadi', 'idhu', 'adhu', 'naan', 'neenga'];
  const hindiCount = hindiWords.filter(word => cleanText.includes(word)).length;
  const tamilCount = tamilWords.filter(word => cleanText.includes(word)).length;
  
  if (hindiCount >= 2) return 'hi';
  if (tamilCount >= 2) return 'ta';
  
  // Default to English
  return 'en';
}

// Get response language based on AI rules
export function getResponseLanguage(userMessage, aiRules) {
  if (!aiRules || !aiRules.languageDetection || !aiRules.autoLanguageResponse) {
    return 'en'; // Default to English
  }
  
  const detectedLang = detectLanguage(userMessage);
  
  // Find matching rule
  for (const rule of aiRules.languageRules || []) {
    if (rule.enabled && rule.triggerLanguages.includes(detectedLang)) {
      return rule.responseLanguage;
    }
  }
  
  // Fallback to English
  return 'en';
}

// Get language-specific response template
export function getLanguageTemplate(aiRules, language, templateType = 'fallback') {
  if (!aiRules || !aiRules.responseTemplates) {
    return 'Sorry, I couldn\'t understand your question.';
  }
  
  const templates = aiRules.responseTemplates[language] || aiRules.responseTemplates['en'];
  return templates[templateType] || templates.fallback || 'Sorry, I couldn\'t understand your question.';
}

// Enhanced language detection with confidence score
export function detectLanguageWithConfidence(text) {
  const detected = detectLanguage(text);
  let confidence = 0.5; // Base confidence
  
  if (!text || typeof text !== 'string') {
    return { language: 'en', confidence: 0.1 };
  }
  
  const cleanText = text.trim().toLowerCase();
  
  // Chinese detection with confidence
  const chinesePattern = /[\u4e00-\u9fff]/g;
  const chineseMatches = (cleanText.match(chinesePattern) || []).length;
  if (chineseMatches > 0) {
    confidence = Math.min(0.9, 0.5 + (chineseMatches / cleanText.length) * 0.4);
    return { language: 'zh', confidence };
  }
  
  // Malay detection with confidence
  const malayWords = ['saya', 'anda', 'terima', 'kasih', 'tolong', 'boleh', 'minta', 'maaf', 'selamat', 'pagi', 'siang', 'malam'];
  const malayCount = malayWords.filter(word => cleanText.includes(word)).length;
  if (malayCount >= 1) {
    confidence = Math.min(0.8, 0.4 + (malayCount / malayWords.length) * 0.4);
    return { language: 'ms', confidence };
  }
  
  // Hindi detection with confidence
  const hindiWords = ['namaste', 'dhanyawad', 'kripya', 'aap', 'main', 'hai', 'hain', 'kaise', 'kya', 'kahan'];
  const hindiCount = hindiWords.filter(word => cleanText.includes(word)).length;
  if (hindiCount >= 1) {
    confidence = Math.min(0.8, 0.4 + (hindiCount / hindiWords.length) * 0.4);
    return { language: 'hi', confidence };
  }
  
  // Tamil detection with confidence
  const tamilWords = ['vanakkam', 'nandri', 'epdi', 'enna', 'eppadi', 'idhu', 'adhu', 'naan', 'neenga'];
  const tamilCount = tamilWords.filter(word => cleanText.includes(word)).length;
  if (tamilCount >= 1) {
    confidence = Math.min(0.8, 0.4 + (tamilCount / tamilWords.length) * 0.4);
    return { language: 'ta', confidence };
  }
  
  // English (default)
  return { language: 'en', confidence: 0.6 };
}

// Language-specific system prompts
export function getLanguageSystemPrompt(basePrompt, language, aiRules) {
  const templates = aiRules?.responseTemplates || {};
  const langTemplates = templates[language] || templates['en'] || {};
  
  let languageInstruction = '';
  
  switch (language) {
    case 'zh':
      languageInstruction = 'Please respond in Chinese (中文). Use polite and professional Chinese language suitable for homestay customer service.';
      break;
    case 'ms':
      languageInstruction = 'Please respond in English as the primary language, but you may use some Malay phrases if appropriate for Malaysian customers.';
      break;
    case 'hi':
    case 'ta':
      languageInstruction = 'Please respond in English as the primary language, but you may use some Hindi/Tamil greetings if appropriate for Indian customers.';
      break;
    default:
      languageInstruction = 'Please respond in English.';
  }
  
  return `${basePrompt}\n\nLanguage Instructions: ${languageInstruction}`;
}
