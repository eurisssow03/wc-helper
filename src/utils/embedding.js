// Embedding and vector similarity utilities
import { tokenize } from './nlp.js';

export function hashingVectorizer(tokens, dim=256){
  const v = new Array(dim).fill(0);
  tokens.forEach(t=>{ 
    let h=0; 
    for(let i=0;i<t.length;i++){ 
      h = ((h<<5)-h + t.charCodeAt(i))|0; 
    } 
    const idx = Math.abs(h)%dim; 
    v[idx]+=1; 
  });
  // L2 normalization
  const norm = Math.sqrt(v.reduce((s,x)=>s+x*x,0))||1; 
  return v.map(x=>x/norm);
}

export async function buildEmbedding(text, settings, apiKey = null){
  // Always use OpenAI for embedding generation
  try {
      // Use provided API key or try to get from settings
      const key = apiKey || (settings.apiKeyEnc ? atob(settings.apiKeyEnc) : '');
      if (!key) {
        throw new Error('OpenAI API key is required');
      }

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          model: settings.embeddingModel || 'text-embedding-3-small'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    // Fallback to local embedding if API fails
    const tokens = tokenize(text);
    return hashingVectorizer(tokens, 256);
  }
}

export function cosineSim(a,b){ 
  let s=0, na=0, nb=0; 
  for(let i=0;i<Math.max(a.length,b.length);i++){ 
    const x=a[i]||0, y=b[i]||0; 
    s += x*y; na += x*x; nb += y*y; 
  } 
  const d = (Math.sqrt(na)||1)*(Math.sqrt(nb)||1); 
  const result = s/d;
  
  // Debug logging for check-in questions
  if (a.length > 0 && b.length > 0) {
    console.log('Cosine similarity debug:', {
      aLength: a.length,
      bLength: b.length,
      dotProduct: s,
      normA: Math.sqrt(na),
      normB: Math.sqrt(nb),
      result: result
    });
  }
  
  return result; 
}
