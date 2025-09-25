import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { processMessageWithAI } from './webhook-ai-processor.js';
import DatabaseAPI from './database/api.js';

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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize database
const databaseAPI = new DatabaseAPI();
let db = null;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://wc-helper.onrender.com'],
  credentials: true
}));

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await databaseAPI.initialize();
    db = databaseAPI.getDatabase();
    
    // Add database routes
    app.use('/api/database', databaseAPI.getRouter());
    
    console.log('✅ Database initialized successfully');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Webhook server with database running on port ${PORT}`);
      console.log(`📊 Database API available at http://localhost:${PORT}/api/database`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// WhatsApp API Functions
async function sendWhatsAppReply(to, message) {
  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
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
      return { success: true, messageId: result.messages?.[0]?.id };
    } else {
      console.error('❌ WhatsApp API error:', result);
      return { success: false, error: result.error?.message || 'Unknown error' };
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

// Store message in database
async function storeMessage(messageData) {
  try {
    await db.createMessage(messageData);
    console.log('💾 Message stored in database:', messageData.id);
    return messageData;
  } catch (error) {
    console.error('❌ Error storing message in database:', error);
    return null;
  }
}

// Store log in database
async function storeLog(logData) {
  try {
    await db.createLog(logData);
    console.log('📝 Log stored in database:', logData.id);
    return logData;
  } catch (error) {
    console.error('❌ Error storing log in database:', error);
    return null;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

// Webhook verification endpoint
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

// Webhook message processing endpoint
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    console.log('📨 Received webhook message:', JSON.stringify(req.body, null, 2));

    if (req.body.object === 'whatsapp_business_account') {
      const entries = req.body.entry;
      
      for (const entry of entries) {
        const changes = entry.changes;
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const messages = change.value.messages;
            
            if (messages) {
              for (const message of messages) {
                console.log('📱 Processing message from:', message.from);
                console.log('📝 Message text:', message.text?.body);

                // Get data from database
                const faqs = await db.getActiveFAQs();
                const homestays = await db.getAllHomestays();
                const generalKnowledge = await db.getGeneralKnowledge('homestay');

                // Process message with AI
                const response = await processMessageWithAI(
                  message.text?.body || '',
                  message.from,
                  faqs,
                  homestays,
                  generalKnowledge
                );

                // Store message in database
                await storeMessage({
                  id: message.id,
                  phone_number: message.from,
                  message_text: message.text?.body,
                  message_type: 'incoming',
                  ai_response: response.answer,
                  confidence: response.confidence,
                  matched_question: response.matchedQuestion,
                  processing_time: response.processingTime,
                  source: 'webhook',
                  status: response.answer ? 'processed' : 'error'
                });

                // Store log in database
                await storeLog({
                  id: `log_${message.id}_${Date.now()}`,
                  channel: 'Webhook',
                  incoming_text: message.text?.body,
                  matched_question: response.matchedQuestion,
                  confidence: response.confidence,
                  answer: response.answer,
                  processing_time: response.processingTime,
                  source: 'webhook',
                  ai_processing: response.processingDetails,
                  conversation_memory: response.conversationMemory
                });

                // Send WhatsApp reply if AI generated a response
                if (response.answer) {
                  const sendResult = await sendWhatsAppReply(message.from, response.answer);
                  if (sendResult.success) {
                    console.log('✅ WhatsApp reply sent successfully');
                  } else {
                    console.error('❌ Failed to send WhatsApp reply:', sendResult.error);
                  }
                } else {
                  console.log('⚠️ No AI response generated, skipping WhatsApp reply');
                }
              }
            }
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// API endpoints for frontend
app.get('/api/faqs', async (req, res) => {
  try {
    const faqs = await db.getActiveFAQs();
    res.json({ success: true, faqs });
  } catch (error) {
    console.error('❌ Error fetching FAQs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/homestays', async (req, res) => {
  try {
    const homestays = await db.getAllHomestays();
    res.json({ success: true, homestays });
  } catch (error) {
    console.error('❌ Error fetching homestays:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const messages = await db.getMessages(limit);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await db.getLogs(limit);
    res.json({ success: true, logs });
  } catch (error) {
    console.error('❌ Error fetching logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync endpoints for frontend
app.post('/api/sync/faqs', async (req, res) => {
  try {
    const { faqs } = req.body;
    console.log(`📚 Syncing ${faqs.length} FAQs to database`);
    
    // Clear existing FAQs and insert new ones
    await db.query('DELETE FROM faqs');
    for (const faq of faqs) {
      await db.createFAQ(faq);
    }
    
    res.json({ success: true, message: `Synced ${faqs.length} FAQs` });
  } catch (error) {
    console.error('❌ Error syncing FAQs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sync/homestays', async (req, res) => {
  try {
    const { homestays } = req.body;
    console.log(`🏨 Syncing ${homestays.length} homestays to database`);
    
    // Clear existing homestays and insert new ones
    await db.query('DELETE FROM homestays');
    for (const homestay of homestays) {
      await db.createHomestay(homestay);
    }
    
    res.json({ success: true, message: `Synced ${homestays.length} homestays` });
  } catch (error) {
    console.error('❌ Error syncing homestays:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sync/homestay-general-knowledge', async (req, res) => {
  try {
    const { generalKnowledge } = req.body;
    await db.setGeneralKnowledge(generalKnowledge, 'homestay');
    console.log(`🧠 Synced ${generalKnowledge.length} characters of general knowledge to database`);
    res.json({ success: true, message: `Synced ${generalKnowledge.length} characters of general knowledge` });
  } catch (error) {
    console.error('❌ Error syncing general knowledge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
startServer();
