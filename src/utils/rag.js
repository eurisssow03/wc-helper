// RAG (Retrieval Augmented Generation) utilities
import { synonymBoost } from './nlp.js';
import { getResponseLanguage, getLanguageTemplate, getLanguageSystemPrompt, detectLanguageWithConfidence } from './languageDetection.js';

// Helper function to find mentioned homestay in user query
function findMentionedHomestay(query, homestays) {
  const q = query.toLowerCase();
  return homestays.find(homestay => 
    q.includes(homestay.name.toLowerCase()) || 
    q.includes(homestay.city.toLowerCase())
  );
}

// Helper function to detect general homestay questions
function isGeneralHomestayQuestion(query) {
  const q = query.toLowerCase();
  const generalKeywords = [
    'check-in', 'checkin', 'check in', 'check-out', 'checkout', 'check out',
    'amenities', 'facilities', 'services', 'what time', 'when',
    'wifi', 'parking', 'pool', 'restaurant', 'breakfast',
    'deposit', 'payment', 'cancellation', 'booking'
  ];
  
  return generalKeywords.some(keyword => q.includes(keyword));
}

// Helper function to enhance general answers with all homestay information
function enhanceGeneralAnswerWithAllHomestays(answer, query, homestays, contextItem, responseLanguage = 'en') {
  const q = query.toLowerCase();
  
  // Language-specific headers
  const headers = {
    zh: {
      checkin: '\n\n我们民宿的入住和退房时间：\n',
      amenities: '\n\n我们的民宿提供以下设施：\n',
      properties: '\n\n我们有以下物业可供选择：\n'
    },
    en: {
      checkin: '\n\nOur homestay check-in and check-out times:\n',
      amenities: '\n\nOur homestays offer the following amenities:\n',
      properties: '\n\nWe have the following properties available:\n'
    }
  };
  
  const header = headers[responseLanguage] || headers.en;
  
  // For check-in/out questions, provide all homestay times
  if (q.includes('check-in') || q.includes('checkin') || q.includes('check in') || 
      q.includes('check-out') || q.includes('checkout') || q.includes('check out')) {
    
    let enhanced = answer + header.checkin;
    homestays.forEach(homestay => {
      if (responseLanguage === 'zh') {
        enhanced += `• ${homestay.name} (${homestay.city}): 入住时间 ${homestay.checkin_time}, 退房时间 ${homestay.checkout_time}\n`;
      } else {
        enhanced += `• ${homestay.name} (${homestay.city}): Check-in ${homestay.checkin_time}, Check-out ${homestay.checkout_time}\n`;
      }
    });
    return enhanced;
  }
  
  // For amenities questions, provide all homestay amenities
  if (q.includes('amenities') || q.includes('facilities') || q.includes('services')) {
    let enhanced = answer + header.amenities;
    homestays.forEach(homestay => {
      const amenities = homestay.amenities.slice(0, 5).join(', ');
      const more = homestay.amenities.length > 5 ? '...' : '';
      enhanced += `• ${homestay.name} (${homestay.city}): ${amenities}${more}\n`;
    });
    return enhanced;
  }
  
  // For general questions, provide homestay overview
  let enhanced = answer + header.properties;
  homestays.forEach(homestay => {
    enhanced += `• ${homestay.name} in ${homestay.city} - ${homestay.notes}\n`;
  });
  
  return enhanced;
}

// Helper function to enhance answer with homestay information
function enhanceAnswerWithHomestayInfo(answer, homestay, contextItem, responseLanguage = 'en') {
  let enhanced = answer;
  
  // If the FAQ is homestay-specific, add homestay details
  if (contextItem.question.includes(homestay.name)) {
    enhanced = answer;
  } else {
    // Add homestay context to general answers
    if (responseLanguage === 'zh') {
      enhanced = `${answer}\n\n关于${homestay.name}的具体信息：`;
      if (homestay.checkin_time && homestay.checkout_time) {
        enhanced += `入住时间为${homestay.checkin_time}，退房时间为${homestay.checkout_time}。`;
      }
      if (homestay.amenities && homestay.amenities.length > 0) {
        enhanced += `我们提供${homestay.amenities.slice(0, 3).join('、')}等服务。`;
      }
      if (homestay.phone) {
        enhanced += `如需更多信息，请致电${homestay.phone}。`;
      }
    } else {
      enhanced = `${answer}\n\nFor ${homestay.name} specifically: `;
      if (homestay.checkin_time && homestay.checkout_time) {
        enhanced += `Check-in is at ${homestay.checkin_time} and check-out is at ${homestay.checkout_time}. `;
      }
      if (homestay.amenities && homestay.amenities.length > 0) {
        enhanced += `We offer ${homestay.amenities.slice(0, 3).join(', ')} and more. `;
      }
      if (homestay.phone) {
        enhanced += `For more information, please call ${homestay.phone}.`;
      }
    }
  }
  
  return enhanced;
}

export function homestayCityBoost(query, faq, homestays){
  const q = (query||"").toLowerCase();
  let score = 0; 
  let used = [];
  const add = (kw, w) => { 
    if(q.includes(kw.toLowerCase())){ 
      score += w; 
      used.push(kw);
    } 
  };
  
  // Check if FAQ is related to a specific homestay
  if (faq.related_homestay){ 
    add(faq.related_homestay, 0.15); 
    const h = homestays.find(h=>h.name===faq.related_homestay); 
    if (h?.city) add(h.city, 0.1); 
    if (h?.amenities) {
      h.amenities.forEach(amenity => {
        if (q.includes(amenity.toLowerCase())) {
          add(amenity, 0.05);
        }
      });
    }
  }
  
  // Check if query mentions any homestay names
  homestays.forEach(homestay => {
    if (q.includes(homestay.name.toLowerCase())) {
      add(homestay.name, 0.2);
      if (homestay.city && q.includes(homestay.city.toLowerCase())) {
        add(homestay.city, 0.1);
      }
    }
  });
  
  return { score: Math.min(0.3, score), used };
}

export function rerankWithSignals({query, homestays, candidates}){
  // candidates: [{faq, sim}]  sim=vector similarity
  const out = candidates.map(c=>{
    const s1 = c.sim; // 70%
    const hb = homestayCityBoost(query, c.faq, homestays); // max 0.2
    const sb = synonymBoost(query, [c.faq.question, c.faq.answer, (c.faq.tags||[]).join(" ")].join(" ")).score; // max 0.2 but we count 10%
    const final = 0.7*s1 + 0.2*hb.score + 0.1*sb;
    return { ...c, final, _signals: { homestayCity: hb, synonymScore: sb } };
  });
  out.sort((a,b)=>b.final-a.final);
  return out.slice(0,3);
}

export async function callChatModel({ settings, systemPrompt, contextItems, userMessage, homestays = [] }){
  // Language detection and AI rules
  const languageDetection = detectLanguageWithConfidence(userMessage);
  const responseLanguage = getResponseLanguage(userMessage, settings.aiRules);
  const aiRules = settings.aiRules || {};
  
  try {
      const apiKey = settings.apiKeyEnc ? atob(settings.apiKeyEnc) : '';
      if (!apiKey) {
        throw new Error('OpenAI API key is required');
      }

      // Build context from retrieved items
      let contextText = contextItems && contextItems.length > 0 
        ? contextItems.map((item, index) => `FAQ ${index + 1}: ${item.question}\nAnswer: ${item.answer}`).join('\n\n')
        : 'No relevant information found.';

      // Add homestay context - always include all homestays for general questions
      const mentionedHomestay = findMentionedHomestay(userMessage, homestays);
      const isGeneralQuestion = isGeneralHomestayQuestion(userMessage);
      
      if (isGeneralQuestion && homestays.length > 0) {
        // Include all homestays for general questions
        contextText += `\n\nAvailable Homestays Information:\n`;
        homestays.forEach(homestay => {
          contextText += `Homestay: ${homestay.name}\n`;
          contextText += `Location: ${homestay.city}\n`;
          contextText += `Address: ${homestay.address}\n`;
          contextText += `Phone: ${homestay.phone}\n`;
          contextText += `Check-in: ${homestay.checkin_time}\n`;
          contextText += `Check-out: ${homestay.checkout_time}\n`;
          contextText += `Amenities: ${homestay.amenities.join(', ')}\n`;
          if (homestay.notes) {
            contextText += `Description: ${homestay.notes}\n`;
          }
          contextText += `---\n`;
        });
      } else if (mentionedHomestay) {
        // Include specific homestay for mentioned homestay
        contextText += `\n\nHomestay Information:\n`;
        contextText += `Homestay Name: ${mentionedHomestay.name}\n`;
        contextText += `Location: ${mentionedHomestay.city}\n`;
        contextText += `Address: ${mentionedHomestay.address}\n`;
        contextText += `Phone: ${mentionedHomestay.phone}\n`;
        contextText += `Check-in: ${mentionedHomestay.checkin_time}\n`;
        contextText += `Check-out: ${mentionedHomestay.checkout_time}\n`;
        contextText += `Amenities: ${mentionedHomestay.amenities.join(', ')}\n`;
        if (mentionedHomestay.notes) {
          contextText += `Notes: ${mentionedHomestay.notes}\n`;
        }
      }

      // Enhanced system prompt with language detection
      const enhancedSystemPrompt = getLanguageSystemPrompt(
        systemPrompt, 
        responseLanguage, 
        aiRules
      );

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: settings.chatModel || 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: enhancedSystemPrompt
            },
            { 
              role: 'user', 
              content: `Context Information:\n${contextText}\n\nCustomer Question: ${userMessage}`
            }
          ],
          max_tokens: settings.maxTokens || 512,
          temperature: settings.temperature || 0.2,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const answer = data.choices[0]?.message?.content || settings.fallbackReply;
      
      // Add busy mode prefix if enabled
      const lang = (settings.preferredLang || "auto").toLowerCase();
      const intro = settings.busyMode ? (lang === "en" ? "[We are experiencing high volume] " : "【Currently experiencing high volume, there may be slight delays】 ") : "";
      
      return intro + answer;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return `Sorry, I'm having trouble connecting to the AI service. ${settings.fallbackReply}`;
  }
}
