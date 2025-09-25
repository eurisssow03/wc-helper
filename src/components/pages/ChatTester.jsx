import React, { useState, useEffect, useRef } from 'react';
import { readLS, writeLS, STORAGE_KEYS } from '../../services/storage.js';
import { baseStyles, breakpoints } from '../../utils/styles.js';
import { formatDateTime } from '../../utils/helpers.js';
import aiService from '../../services/aiService.js';

export function ChatTester({ onLogged }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [homestays, setHomestays] = useState([]);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load data on component mount and refresh when data changes
  useEffect(() => {
    const currentFaqs = readLS(STORAGE_KEYS.faqs, []);
    const currentHomestays = readLS(STORAGE_KEYS.homestays, []);
    
    console.log('ChatTester: Loading data on component mount:');
    console.log('FAQs:', currentFaqs.length);
    console.log('Homestays:', currentHomestays.length);
    
    setFaqs(currentFaqs);
    setHomestays(currentHomestays);
    
    // Force refresh AI service data
    aiService.forceRefresh();
  }, []);

  // Refresh data periodically to catch updates
  useEffect(() => {
    const interval = setInterval(() => {
      const currentFaqs = readLS(STORAGE_KEYS.faqs, []);
      const currentHomestays = readLS(STORAGE_KEYS.homestays, []);
      setFaqs(currentFaqs);
      setHomestays(currentHomestays);
      
      // Force refresh AI service data
      aiService.forceRefresh();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
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
      console.log('🤖 ChatTester: Starting message processing...');
      console.log('🤖 ChatTester: Current settings:', aiService.settings);
      console.log('🤖 ChatTester: FAQs available:', aiService.faqs.length);
      console.log('🤖 ChatTester: Homestays available:', aiService.homestays.length);
      console.log('🤖 ChatTester: AI Service instance:', aiService);
      console.log('🤖 ChatTester: AI Service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(aiService)));
      
      // Process the message using unified AI service with phone number
      const response = await aiService.processAndLog(userMessage, 'ChatTester', { phoneNumber: 'chat-tester' });
      
      console.log('🤖 ChatTester: Response received:', response);
      
      // Check if response is valid
      if (response.answer) {
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
      } else {
        // No response generated (API key missing or error)
        console.warn('⚠️ ChatTester: No response generated - check console for details');
        // Don't add any message to chat - user will see no response
      }

      // Trigger callback to update logs
      if (onLogged) {
        onLogged();
      }

    } catch (error) {
      console.error('❌ ChatTester: Error processing message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: `Sorry, an error occurred while processing your message. Error: ${error.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
