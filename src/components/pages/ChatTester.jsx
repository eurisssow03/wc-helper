import React, { useState, useEffect, useRef } from 'react';
import { readLS, writeLS, STORAGE_KEYS } from '../../services/storage.js';
import { simpleSimilarityScore } from '../../utils/nlp.js';
import { rerankWithSignals, callChatModel } from '../../utils/rag.js';
import { buildEmbedding, cosineSim } from '../../utils/embedding.js';
import { baseStyles, breakpoints } from '../../utils/styles.js';
import { formatDateTime } from '../../utils/helpers.js';

export function ChatTester({ onLogged }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState(readLS(STORAGE_KEYS.settings, {}));
  const [homestays, setHomestays] = useState(readLS(STORAGE_KEYS.homestays, []));
  const [faqs, setFaqs] = useState(readLS(STORAGE_KEYS.faqs, []));
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial data
  useEffect(() => {
    const currentSettings = readLS(STORAGE_KEYS.settings, {});
    const currentHomestays = readLS(STORAGE_KEYS.homestays, []);
    const currentFaqs = readLS(STORAGE_KEYS.faqs, []);
    
    console.log('Loading data on component mount:');
    console.log('Settings:', currentSettings);
    console.log('Homestays:', currentHomestays.length);
    console.log('FAQs:', currentFaqs.length);
    console.log('FAQ details:', currentFaqs.map(f => ({ question: f.question, is_active: f.is_active })));
    
    setSettings(currentSettings);
    setHomestays(currentHomestays);
    setFaqs(currentFaqs);
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      text: userMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Process the message using RAG
      const response = await processMessage(userMessage);
      
      // Add bot response to chat
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: response.answer,
        timestamp: new Date().toISOString(),
        confidence: response.confidence,
        matchedQuestion: response.matchedQuestion,
        processingTime: response.processingTime
      };

      setMessages(prev => [...prev, botMessage]);

      // Log the interaction
      logInteraction(userMessage, response);

    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: 'Sorry, an error occurred while processing your message.',
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const processMessage = async (userMessage) => {
    const startTime = Date.now();
    let candidates = [];
    
    console.log('=== PROCESSING MESSAGE ===');
    console.log('User message:', userMessage);
    console.log('Available FAQs:', faqs.length);
    console.log('AI Provider:', settings.aiProvider);
    console.log('FAQs:', faqs.map(f => ({ question: f.question, is_active: f.is_active })));
    console.log('Raw FAQs from localStorage:', JSON.parse(localStorage.getItem(STORAGE_KEYS.faqs) || '[]'));
    
    // Use embedding-based search for OpenAI
    try {
      const queryEmbedding = await buildEmbedding(userMessage, settings);
      
      candidates = await Promise.all(
        faqs.map(async (faq) => {
          let similarity = 0;
          
          if (faq.embedding && Array.isArray(faq.embedding) && faq.embedding.length > 0) {
            // Use stored embedding if available
            similarity = cosineSim(queryEmbedding, faq.embedding);
            console.log(`FAQ "${faq.question}" - Using embedding similarity: ${similarity}`);
            console.log(`Query embedding length: ${queryEmbedding.length}, FAQ embedding length: ${faq.embedding.length}`);
            console.log(`Query embedding sample: [${queryEmbedding.slice(0, 5).join(', ')}...]`);
            console.log(`FAQ embedding sample: [${faq.embedding.slice(0, 5).join(', ')}...]`);
          } else {
            // Fallback to simple similarity if no embedding
            similarity = simpleSimilarityScore(userMessage, faq);
            console.log(`FAQ "${faq.question}" - Using simple similarity: ${similarity}, has embedding: ${!!faq.embedding}`);
          }
          
          return { faq, sim: similarity };
        })
      );
      
      candidates = candidates
        .filter(c => c.sim > 0)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 10);
        
      console.log('Candidates found:', candidates.length);
      console.log('All candidates with scores:', candidates.map(c => ({ 
        question: c.faq.question, 
        sim: c.sim,
        is_active: c.faq.is_active 
      })));
      console.log('Top candidates:', candidates.slice(0, 3).map(c => ({ question: c.faq.question, sim: c.sim })));
    } catch (error) {
      console.error('Embedding search error:', error);
      // Fallback to simple similarity
      candidates = faqs
        .map(faq => {
          const sim = simpleSimilarityScore(userMessage, faq);
          console.log(`Fallback FAQ "${faq.question}" - similarity: ${sim}`);
          return { faq, sim };
        })
        .filter(c => c.sim > 0)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 10);
        
      console.log('Fallback candidates found:', candidates.length);
    }

    // Rerank with signals
    const reranked = rerankWithSignals({
      query: userMessage,
      homestays,
      candidates
    });

    console.log('=== AFTER RERANKING ===');
    console.log('Reranked count:', reranked.length);
    console.log('All reranked with final scores:', reranked.map(r => ({ 
      question: r.faq.question, 
      sim: r.sim,
      final: r.final,
      signals: r._signals
    })));
    console.log('Top reranked:', reranked.slice(0, 3).map(r => ({ question: r.faq.question, final: r.final })));

    const processingTime = Date.now() - startTime;

    // Get the best match
    const bestMatch = reranked[0];
    const confidence = bestMatch?.final || 0;
    const matchedQuestion = bestMatch?.faq?.question || null;

    console.log('Best match:', { question: matchedQuestion, confidence });

    // Prepare context for chat model
    const contextItems = reranked.slice(0, 3).map(r => ({
      question: r.faq.question,
      answer: r.faq.answer,
      confidence: r.final
    }));

    console.log('=== CONTEXT ITEMS ===');
    console.log('Context items count:', contextItems.length);
    console.log('Context items:', contextItems.map(item => ({
      question: item.question,
      answer: item.answer,
      confidence: item.confidence
    })));

    // Call chat model
    const answer = await callChatModel({
      settings,
      systemPrompt: "You are a professional homestay customer service assistant. Please answer customer questions based on the provided FAQ information and available homestay data. Always provide homestay-specific information when relevant, even for general questions. If the user asks about check-in times, amenities, or other general topics, provide information for all available homestays.",
      contextItems,
      userMessage,
      homestays
    });

    return {
      answer,
      confidence,
      matchedQuestion,
      processingTime,
      contextItems
    };
  };

  const logInteraction = (userMessage, response) => {
    const logEntry = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      channel: 'ChatTester',
      incoming_text: userMessage,
      matched_question: response.matchedQuestion,
      confidence: response.confidence,
      answer: response.answer,
      processing_time: response.processingTime
    };

    const logs = readLS(STORAGE_KEYS.logs, []);
    logs.push(logEntry);
    writeLS(STORAGE_KEYS.logs, logs);
    
    if (onLogged) onLogged();
  };

  const clearChat = () => {
    setMessages([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
        padding: '12px 16px',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        border: '1px solid #e9ecef'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Chat Tester</h3>
          <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
            Test customer service assistant responses • FAQs: {faqs.length} • Homestays: {homestays.length}
          </div>
        </div>
        <button 
          onClick={clearChat}
          style={{
            ...baseStyles.btnGhost,
            fontSize: 12,
            padding: '6px 12px'
          }}
        >
          Clear Chat
        </button>
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e9ecef',
        marginBottom: 16,
        minHeight: '400px',
        maxHeight: '500px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6c757d',
            fontSize: 14
          }}>
            Start typing messages to test the customer service assistant...
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} style={{
              marginBottom: 16,
              display: 'flex',
              flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: message.type === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                backgroundColor: message.isError ? '#f8d7da' : (message.type === 'user' ? '#007bff' : '#f8f9fa'),
                color: message.isError ? '#721c24' : (message.type === 'user' ? 'white' : '#333'),
                border: message.isError ? '1px solid #dc3545' : 'none'
              }}>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {message.text}
                </div>
                <div style={{
                  fontSize: 11,
                  opacity: 0.7,
                  marginTop: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{formatDateTime(message.timestamp)}</span>
                  {message.confidence && (
                    <span style={{ marginLeft: 8 }}>
                      Confidence: {(message.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                {message.matchedQuestion && (
                  <div style={{
                    fontSize: 11,
                    opacity: 0.8,
                    marginTop: 4,
                    padding: '4px 8px',
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    borderRadius: 4
                  }}>
                    Matched Question: {message.matchedQuestion}
                  </div>
                )}
                {message.processingTime && (
                  <div style={{
                    fontSize: 10,
                    opacity: 0.6,
                    marginTop: 2
                  }}>
                    Processing Time: {message.processingTime}ms
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '18px 18px 18px 4px',
              color: '#6c757d'
            }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end'
      }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your question to test the customer service assistant..."
          style={{
            flex: 1,
            minHeight: '40px',
            maxHeight: '120px',
            padding: '12px',
            border: '1px solid #ced4da',
            borderRadius: '20px',
            resize: 'none',
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none'
          }}
          rows={1}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputText.trim() || isLoading}
          style={{
            ...baseStyles.btnPrimary,
            padding: '12px 20px',
            borderRadius: '20px',
            minWidth: '80px',
            opacity: (!inputText.trim() || isLoading) ? 0.6 : 1,
            cursor: (!inputText.trim() || isLoading) ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Quick Test Buttons */}
      <div style={{
        marginTop: 16,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div style={{ fontSize: 12, color: '#6c757d', marginRight: 8, alignSelf: 'center' }}>
          Quick Test:
        </div>
        {[
          'How to check in?',
          'What is the WiFi password?',
          'What time is checkout?',
          'Is there parking?',
          'Can I have a late checkout?'
        ].map((question, index) => (
          <button
            key={index}
            onClick={() => setInputText(question)}
            style={{
              ...baseStyles.btnGhost,
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: '16px'
            }}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
