import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { processMessageWithAI } from './webhook-ai-processor.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration constants
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'my_verify_token_123';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAZAwCVwdvKIBPqDSuS0pWld1NtyqN6GptxOAlQyakFvPhqq62xCK6ZCDUkWxkSkjZCnF6VYcpdiFknmRWQPW20uLZARYC9o5na24lOxU1Eh8LflAMw1fH1DayDWHDvwtHZCROZCWoKFbiX3ZBJkvJtyrWBtWncpZCVU2gYovgU8YTAN3Amug73N78czBTIipZBnfmIZAQsVUtI3CxL8HZAouV7GySiH6icmiwRbTuY6dR8hWEZD';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '60165281800';
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

// Initialize global storage with sample data
function initializeGlobalStorage() {
  // Initialize global storage if not already done
  if (!global.faqs) {
    global.faqs = [];
  }
  if (!global.homestays) {
    global.homestays = [];
  }
  if (!global.whatsappMessages) {
    global.whatsappMessages = [];
  }
  
  console.log('📚 Global storage initialized');
}

// AI Processing Functions (now using unified processor)
async function processWebhookMessage(userMessage, fromNumber) {
  console.log('🧠 Starting webhook AI processing for:', userMessage);
  
  try {
    // Get FAQs from global storage
    let faqs = global.faqs || [];
    let homestays = global.homestays || [];
    
    console.log(`📚 Using ${faqs.length} total FAQs from global storage`);
    console.log(`🏨 Using ${homestays.length} homestays from global storage`);
    
    // Use the unified AI processor
    const result = await processMessageWithAI(userMessage, fromNumber, faqs, homestays);
    
    return result;

  } catch (error) {
    console.error('❌ Webhook AI processing error:', error);
    return {
      answer: "Sorry, I'm having trouble processing your message. Please try again or contact us directly.",
      confidence: 0,
      matchedQuestion: null,
      processingTime: Date.now(),
      source: 'WebhookAI'
    };
  }
}

// Message Storage Functions
async function storeMessage(messageData) {
  try {
    // In production, this would store to a database
    // For now, we'll store in a simple in-memory array
    if (!global.whatsappMessages) {
      global.whatsappMessages = [];
    }
    
    const message = {
      ...messageData,
      receivedAt: new Date().toISOString(),
      id: messageData.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    global.whatsappMessages.unshift(message); // Add to beginning of array
    
    // Keep only last 1000 messages to prevent memory issues
    if (global.whatsappMessages.length > 1000) {
      global.whatsappMessages = global.whatsappMessages.slice(0, 1000);
    }
    
    console.log('💾 Message stored:', message.id);
    return message;
  } catch (error) {
    console.error('❌ Error storing message:', error);
    return null;
  }
}

// WhatsApp API Functions
async function sendWhatsAppReply(toNumber, message) {
  console.log(`📤 Sending WhatsApp reply to ${toNumber}: ${message}`);
  
  try {
    // Use configuration constants
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error('❌ Missing WhatsApp API credentials');
      console.error('   Required: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID');
      return { success: false, error: 'Missing API credentials' };
    }
    
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: toNumber,
      type: 'text',
      text: {
        body: message
      }
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ WhatsApp message sent successfully:', result);
      return { success: true, messageId: result.messages?.[0]?.id || 'unknown' };
    } else {
      console.error('❌ WhatsApp API error:', result);
      return { success: false, error: result.error?.message || 'Unknown error' };
    }
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve React app from dist directory (if built)
app.use(express.static(path.join(__dirname, 'dist')));

// CORS middleware for webhook testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Webhook verification endpoint
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Webhook verification request:', { 
    mode, 
    token, 
    challenge,
    allQuery: req.query,
    timestamp: new Date().toISOString()
  });

  // Use configuration constant
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed:', { 
      mode, 
      token, 
      expectedToken: VERIFY_TOKEN,
      modeMatch: mode === 'subscribe',
      tokenMatch: token === VERIFY_TOKEN
    });
    res.status(403).send('Forbidden');
  }
});

// Webhook message handler
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('📨 Received webhook message:', JSON.stringify(req.body, null, 2));
  console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📨 Request IP:', req.ip || req.connection.remoteAddress);
  console.log('📨 User Agent:', req.get('User-Agent'));
  
  try {
    const body = req.body;
    
    // Log the raw body for debugging
    console.log('📨 Raw body type:', typeof body);
    console.log('📨 Body object:', body.object);
    console.log('📨 Body keys:', Object.keys(body));
    
    if (body.object === 'whatsapp_business_account') {
      console.log('✅ Valid WhatsApp Business Account object');
      console.log('📨 Number of entries:', body.entry?.length || 0);
      
      for (let entryIndex = 0; entryIndex < body.entry.length; entryIndex++) {
        const entry = body.entry[entryIndex];
        console.log(`📨 Processing entry ${entryIndex}:`, entry.id);
        console.log('📨 Entry changes count:', entry.changes?.length || 0);
        
        for (let changeIndex = 0; changeIndex < entry.changes.length; changeIndex++) {
          const change = entry.changes[changeIndex];
          console.log(`📨 Processing change ${changeIndex}:`, change.field);
          console.log('📨 Change value keys:', Object.keys(change.value || {}));
          
          if (change.field === 'messages') {
            console.log('✅ Messages field detected');
            console.log('📨 Change value:', JSON.stringify(change.value, null, 2));
            
            // Check for incoming messages
            const messages = change.value.messages;
            if (messages && messages.length > 0) {
              console.log(`📨 Found ${messages.length} incoming messages`);
              
              // Process messages sequentially to handle async operations
              for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
                const message = messages[messageIndex];
                
                console.log(`📱 Message ${messageIndex} details:`, {
                  from: message.from,
                  text: message.text?.body,
                  type: message.type,
                  timestamp: message.timestamp,
                  messageId: message.id,
                  rawMessage: message
                });
                
                // Process the message here
                console.log('🤖 Processing message:', message.text?.body);
                
                // Process the message with AI
                try {
                  const response = await processWebhookMessage(message.text?.body, message.from);
                  console.log('🤖 AI Response:', response.answer);
                  
                  // Store the message and AI response for the web app
                  await storeMessage({
                    id: message.id,
                    from: message.from,
                    text: message.text?.body,
                    type: message.type,
                    timestamp: message.timestamp,
                    aiResponse: response.answer,
                    confidence: response.confidence,
                    matchedQuestion: response.matchedQuestion,
                    processingTime: response.processingTime,
                    status: 'processed',
                    source: 'webhook',
                    ai_processing: response.processingDetails || null
                  });
                  
                  // Send WhatsApp reply
                  const sendResult = await sendWhatsAppReply(message.from, response.answer);
                  if (sendResult.success) {
                    console.log('✅ WhatsApp reply sent successfully');
                  } else {
                    console.error('❌ Failed to send WhatsApp reply:', sendResult.error);
                  }
                } catch (error) {
                  console.error('❌ AI processing error:', error);
                  
                  // Store the message even if AI processing fails
                  await storeMessage({
                    id: message.id,
                    from: message.from,
                    text: message.text?.body,
                    type: message.type,
                    timestamp: message.timestamp,
                    aiResponse: 'Error processing message',
                    confidence: 0,
                    matchedQuestion: null,
                    processingTime: 0,
                    status: 'error',
                    source: 'webhook'
                  });
                }
              }
            } else {
              console.log('⚠️ No incoming messages found in change.value.messages');
            }
            
            // Check for status updates
            const statuses = change.value.statuses;
            if (statuses && statuses.length > 0) {
              console.log(`📊 Found ${statuses.length} status updates`);
              
              for (let statusIndex = 0; statusIndex < statuses.length; statusIndex++) {
                const status = statuses[statusIndex];
                console.log(`📊 Status ${statusIndex}:`, {
                  messageId: status.id,
                  status: status.status,
                  recipient: status.recipient_id,
                  timestamp: status.timestamp
                });
              }
            } else {
              console.log('⚠️ No status updates found in change.value.statuses');
            }
          } else {
            console.log(`⚠️ Change field is not 'messages': ${change.field}`);
          }
        }
      }
    } else {
      console.log('❌ Invalid object type:', body.object);
      console.log('📨 Expected: whatsapp_business_account');
      console.log('📨 Received body structure:', {
        object: body.object,
        hasEntry: !!body.entry,
        entryLength: body.entry?.length || 0,
        allKeys: Object.keys(body)
      });
    }
    
    res.status(200).json({ status: 'OK', message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Test endpoint for webhook testing
app.get('/test', (req, res) => {
  res.json({
    message: 'Webhook test endpoint',
    timestamp: new Date().toISOString(),
    webhookUrl: `${req.protocol}://${req.get('host')}/webhook/whatsapp`,
    verifyToken: WEBHOOK_VERIFY_TOKEN,
    status: 'Ready for WhatsApp messages'
  });
});

// API endpoint to get all WhatsApp messages
app.get('/api/messages', (req, res) => {
  try {
    const messages = global.whatsappMessages || [];
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const paginatedMessages = messages.slice(offset, offset + limit);
    
    res.json({
      success: true,
      messages: paginatedMessages,
      total: messages.length,
      limit,
      offset,
      hasMore: offset + limit < messages.length
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// API endpoint to get message statistics
app.get('/api/messages/stats', (req, res) => {
  try {
    const messages = global.whatsappMessages || [];
    
    const stats = {
      total: messages.length,
      processed: messages.filter(m => m.status === 'processed').length,
      errors: messages.filter(m => m.status === 'error').length,
      today: messages.filter(m => {
        const today = new Date().toDateString();
        const messageDate = new Date(m.receivedAt).toDateString();
        return today === messageDate;
      }).length,
      uniqueCustomers: new Set(messages.map(m => m.from)).size,
      averageConfidence: messages.reduce((sum, m) => sum + (m.confidence || 0), 0) / messages.length || 0
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error fetching message stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message statistics'
    });
  }
});

// API endpoint to get OpenAI API key (for frontend use)
app.get('/api/config/openai-key', (req, res) => {
  try {
    res.json({
      success: true,
      apiKey: OPENAI_API_KEY,
      hasKey: !!OPENAI_API_KEY
    });
  } catch (error) {
    console.error('❌ Error getting OpenAI API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OpenAI API key'
    });
  }
});

// API endpoint to get WhatsApp configuration
app.get('/api/config/whatsapp', (req, res) => {
  try {
    res.json({
      success: true,
      businessNumber: WHATSAPP_PHONE_NUMBER_ID,
      webhookUrl: 'https://wc-helper.onrender.com/webhook/whatsapp',
      verifyToken: WEBHOOK_VERIFY_TOKEN,
      hasAccessToken: !!WHATSAPP_ACCESS_TOKEN,
      apiVersion: WHATSAPP_API_VERSION
    });
  } catch (error) {
    console.error('❌ Error getting WhatsApp config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp configuration'
    });
  }
});

// API endpoint to get FAQ data
app.get('/api/faqs', (req, res) => {
  try {
    // In production, this would come from a database
    // For now, we'll use the same sample data structure as the web app
    const faqs = global.faqs || [];
    
    // Filter only active FAQs
    const activeFAQs = faqs.filter(faq => faq.is_active === true);
    
    res.json({
      success: true,
      faqs: activeFAQs,
      total: activeFAQs.length,
      allFAQs: faqs.length,
      activeCount: activeFAQs.length,
      inactiveCount: faqs.length - activeFAQs.length
    });
  } catch (error) {
    console.error('❌ Error fetching FAQs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FAQ data'
    });
  }
});

// Debug endpoint to check current FAQ data
app.get('/api/debug/faqs', (req, res) => {
  try {
    const faqs = global.faqs || [];
    const activeFAQs = faqs.filter(faq => faq.is_active === true);
    const inactiveFAQs = faqs.filter(faq => faq.is_active === false);
    
    res.json({
      success: true,
      total: faqs.length,
      active: activeFAQs.length,
      inactive: inactiveFAQs.length,
      activeFAQs: activeFAQs.map(faq => ({
        question: faq.question,
        is_active: faq.is_active
      })),
      inactiveFAQs: inactiveFAQs.map(faq => ({
        question: faq.question,
        is_active: faq.is_active
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching debug FAQ data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debug FAQ data'
    });
  }
});

// API endpoint to get homestay data
app.get('/api/homestays', (req, res) => {
  try {
    const homestays = global.homestays || [];
    
    res.json({
      success: true,
      homestays: homestays,
      total: homestays.length
    });
  } catch (error) {
    console.error('❌ Error fetching homestays:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch homestay data'
    });
  }
});

// API endpoint to sync FAQ data from web app
app.post('/api/sync/faqs', (req, res) => {
  try {
    const { faqs } = req.body;
    
    if (!Array.isArray(faqs)) {
      return res.status(400).json({
        success: false,
        error: 'FAQs must be an array'
      });
    }
    
    // Store FAQs in global storage
    global.faqs = faqs;
    
    const activeCount = faqs.filter(faq => faq.is_active === true).length;
    console.log(`📚 Synced ${faqs.length} FAQs (${activeCount} active) from web app`);
    
    res.json({
      success: true,
      message: `Synced ${faqs.length} FAQs`,
      active: activeCount,
      total: faqs.length
    });
  } catch (error) {
    console.error('❌ Error syncing FAQs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync FAQ data'
    });
  }
});

// API endpoint to sync homestay data from web app
app.post('/api/sync/homestays', (req, res) => {
  try {
    const { homestays } = req.body;
    
    if (!Array.isArray(homestays)) {
      return res.status(400).json({
        success: false,
        error: 'Homestays must be an array'
      });
    }
    
    // Store homestays in global storage
    global.homestays = homestays;
    
    console.log(`🏨 Synced ${homestays.length} homestays from web app`);
    
    res.json({
      success: true,
      message: `Synced ${homestays.length} homestays`,
      total: homestays.length
    });
  } catch (error) {
    console.error('❌ Error syncing homestays:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync homestay data'
    });
  }
});

// API endpoint to sync messages to web app
app.post('/api/sync/messages', (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages must be an array'
      });
    }
    
    // Store messages in global storage
    global.whatsappMessages = messages;
    
    console.log(`📨 Synced ${messages.length} messages to web app`);
    
    res.json({
      success: true,
      message: `Synced ${messages.length} messages`,
      total: messages.length
    });
  } catch (error) {
    console.error('❌ Error syncing messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync message data'
    });
  }
});

// Debug endpoint to test webhook message processing
app.post('/test-webhook', (req, res) => {
  console.log('🧪 Test webhook called with:', JSON.stringify(req.body, null, 2));
  
  // Simulate a WhatsApp message
  const testMessage = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test_entry_debug',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '1234567890',
            phone_number_id: 'test_phone_id'
          },
          messages: [{
            from: '1234567890',
            id: 'test_msg_debug',
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: {
              body: 'Test message from debug endpoint'
            },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  // Process the test message
  console.log('🧪 Processing test message...');
  
  res.json({
    message: 'Test webhook processed',
    timestamp: new Date().toISOString(),
    testMessage: testMessage
  });
});

// API info endpoint (moved from root)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'WhatsApp Webhook Server is running!',
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      webhook: '/webhook/whatsapp',
      health: '/health',
      test: '/test'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    status: 'ERROR', 
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all other routes (SPA routing) - MUST BE LAST
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 404 handler (fallback)
app.use((req, res) => {
  res.status(404).json({ 
    status: 'NOT_FOUND', 
    message: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  // Initialize global storage
  initializeGlobalStorage();
  
  console.log('🚀 WhatsApp Webhook Server Started!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`🔑 Verify Token: ${WEBHOOK_VERIFY_TOKEN}`);
  console.log('📚 FAQ sync endpoint: http://localhost:3001/api/sync/faqs');
});
