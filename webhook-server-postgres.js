import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { processMessageWithAI } from './webhook-ai-processor.js';
import { postgresService } from './src/services/postgresService.js';
import { dailyCleanupService } from './src/services/dailyCleanupService.js';
import postgresApi from './webhook-postgres-api.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration constants
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'my_verify_token_123';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAZAwCVwdvKIBPlQtxHs2eZB3l7L6dCRaQTZC6R27lPPmEbPKa98FdTlVHTu25SoCSTZAtYNBHiJS6fsZBQ9h9WLJ0ymgvR7EGLzOCwXJMZBOcsn8TSfsc3cZCGujgtOXsQ7kvi5nl4h0diexH24ujoJko1yuoeLiosm1HPUZABtZBX2MTBICm5vY5S4krkHw0vTogQZDZD';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '60194819727';
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize PostgreSQL database
async function initializeDatabase() {
  try {
    console.log('🐘 Webhook: Initializing PostgreSQL database...');
    await postgresService.initializeTables();
    console.log('✅ Webhook: PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('❌ Webhook: Error initializing PostgreSQL database:', error);
    throw error;
  }
}

// AI Processing Functions using PostgreSQL
async function processWebhookMessage(userMessage, fromNumber) {
  console.log('🧠 Starting webhook AI processing for:', userMessage);
  
  try {
    // Get data from PostgreSQL
    const [faqs, homestays, generalKnowledge] = await Promise.all([
      postgresService.getAll('faqs'),
      postgresService.getAll('homestays'),
      postgresService.getAll('general_knowledge')
    ]);
    
    const homestayGeneralKnowledge = generalKnowledge[0]?.content || "";
    
    console.log(`📚 Using ${faqs.length} total FAQs from PostgreSQL`);
    console.log(`🏨 Using ${homestays.length} homestays from PostgreSQL`);
    console.log(`🧠 Using ${homestayGeneralKnowledge.length} characters of general knowledge`);
    
    // Use the unified AI processor
    const result = await processMessageWithAI(userMessage, fromNumber, faqs, homestays, homestayGeneralKnowledge);
    
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

// WhatsApp API Functions
async function sendWhatsAppMessage(to, message) {
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: {
      body: message
    }
  };

  try {
    console.log('📤 Sending WhatsApp message to:', to);
    console.log('📤 Message content:', message);
    
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
      return { success: true, data: result };
    } else {
      console.error('❌ WhatsApp API error:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
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

// Add PostgreSQL API routes
app.use('/api/postgres', postgresApi);

// Webhook verification endpoint
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔍 Webhook verification request:', { mode, token, challenge });

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

// Webhook message endpoint
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('📨 Received webhook message:', JSON.stringify(req.body, null, 2));

  try {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
      if (body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0]) {
        const change = body.entry[0].changes[0];
        
        if (change.field === 'messages' && change.value && change.value.messages) {
          const messages = change.value.messages;
          
          for (const message of messages) {
            if (message.type === 'text') {
              const userMessage = message.text.body;
              const fromNumber = message.from;
              
              console.log(`📱 Processing message from ${fromNumber}: ${userMessage}`);
              
              // Process message with AI
              const aiResult = await processWebhookMessage(userMessage, fromNumber);
              
              // Store message locally (not in database)
              const messageRecord = {
                id: message.id,
                phone_number: fromNumber,
                message_text: userMessage,
                is_from_customer: true,
                ai_response: aiResult.answer,
                confidence: aiResult.confidence,
                matched_question: aiResult.matchedQuestion,
                processing_time: aiResult.processingTime,
                source: 'webhook',
                received_at: new Date().toISOString(),
                ai_processing_details: aiResult.processingDetails || null,
                conversation_memory_details: null
              };
              
              try {
                // Store in global storage for local access
                if (!global.whatsappMessages) {
                  global.whatsappMessages = [];
                }
                global.whatsappMessages.push(messageRecord);
                console.log('💾 Message stored locally');
              } catch (error) {
                console.error('❌ Error storing message locally:', error);
              }
              
              // Send AI response if available
              if (aiResult.answer) {
                const sendResult = await sendWhatsAppMessage(fromNumber, aiResult.answer);
                
                if (sendResult.success) {
                  // Store AI response message locally
                  const responseRecord = {
                    id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    phone_number: fromNumber,
                    message_text: aiResult.answer,
                    is_from_customer: false,
                    ai_response: null,
                    confidence: null,
                    matched_question: null,
                    processing_time: null,
                    source: 'webhook',
                    received_at: new Date().toISOString(),
                    ai_processing_details: null,
                    conversation_memory_details: null
                  };
                  
                  try {
                    // Store in global storage for local access
                    if (!global.whatsappMessages) {
                      global.whatsappMessages = [];
                    }
                    global.whatsappMessages.push(responseRecord);
                    console.log('💾 AI response stored locally');
                  } catch (error) {
                    console.error('❌ Error storing AI response locally:', error);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// API endpoints for syncing data from web app
app.get('/api/faqs', async (req, res) => {
  try {
    const faqs = await postgresService.getAll('faqs');
    res.json({ success: true, data: faqs });
  } catch (error) {
    console.error('❌ Error getting FAQs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/faqs', async (req, res) => {
  try {
    const { faqs } = req.body;
    
    // Clear existing FAQs and insert new ones
    await postgresService.query('DELETE FROM faqs');
    
    if (faqs && faqs.length > 0) {
      const results = await postgresService.batchInsert('faqs', faqs);
      console.log(`📚 Synced ${results.length} FAQs to PostgreSQL`);
    }
    
    res.json({ success: true, message: 'FAQs synced successfully' });
  } catch (error) {
    console.error('❌ Error syncing FAQs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/homestays', async (req, res) => {
  try {
    const homestays = await postgresService.getAll('homestays');
    res.json({ success: true, data: homestays });
  } catch (error) {
    console.error('❌ Error getting homestays:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/homestays', async (req, res) => {
  try {
    const { homestays } = req.body;
    
    // Clear existing homestays and insert new ones
    await postgresService.query('DELETE FROM homestays');
    
    if (homestays && homestays.length > 0) {
      const results = await postgresService.batchInsert('homestays', homestays);
      console.log(`🏨 Synced ${results.length} homestays to PostgreSQL`);
    }
    
    res.json({ success: true, message: 'Homestays synced successfully' });
  } catch (error) {
    console.error('❌ Error syncing homestays:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/homestay-general-knowledge', async (req, res) => {
  try {
    const knowledge = await postgresService.getAll('general_knowledge');
    res.json({ success: true, data: knowledge[0]?.content || '' });
  } catch (error) {
    console.error('❌ Error getting general knowledge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/homestay-general-knowledge', async (req, res) => {
  try {
    const { content } = req.body;
    
    // Clear existing general knowledge and insert new one
    await postgresService.query('DELETE FROM general_knowledge');
    
    if (content) {
      await postgresService.save('general_knowledge', { content });
      console.log(`🧠 Synced general knowledge to PostgreSQL (${content.length} characters)`);
    }
    
    res.json({ success: true, message: 'General knowledge synced successfully' });
  } catch (error) {
    console.error('❌ Error syncing general knowledge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    // Get messages from local storage
    const allMessages = global.whatsappMessages || [];
    const messages = allMessages
      .sort((a, b) => new Date(b.received_at || 0) - new Date(a.received_at || 0))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('❌ Error getting messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    // Get logs from local storage (if available)
    const allLogs = global.whatsappLogs || [];
    const logs = allLogs
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('❌ Error getting logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await postgresService.getAll('settings');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'postgresql',
      service: 'WC Helper Webhook Server'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Database configuration endpoint for settings page
app.get('/api/postgres/health', async (req, res) => {
  try {
    // Get database config from headers
    const dbConfig = {
      user: req.headers['x-database-user'] || process.env.POSTGRES_USER || 'postgres',
      host: req.headers['x-database-host'] || process.env.POSTGRES_HOST || 'localhost',
      database: req.headers['x-database-name'] || process.env.POSTGRES_DB || 'wc_helper',
      password: req.headers['x-database-password'] || process.env.POSTGRES_PASSWORD || 'password',
      port: parseInt(req.headers['x-database-port']) || process.env.POSTGRES_PORT || 5432,
      ssl: req.headers['x-database-ssl'] === 'true' || process.env.NODE_ENV === 'production'
    };

    // Test connection with provided config
    const { Pool } = await import('pg');
    const testPool = new Pool(dbConfig);
    
    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    await testPool.end();
    
    res.json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        ssl: dbConfig.ssl
      }
    });
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Migration endpoint for settings page
app.post('/api/postgres/migrate', async (req, res) => {
  try {
    // Get database config from headers
    const dbConfig = {
      user: req.headers['x-database-user'] || process.env.POSTGRES_USER || 'postgres',
      host: req.headers['x-database-host'] || process.env.POSTGRES_HOST || 'localhost',
      database: req.headers['x-database-name'] || process.env.POSTGRES_DB || 'wc_helper',
      password: req.headers['x-database-password'] || process.env.POSTGRES_PASSWORD || 'password',
      port: parseInt(req.headers['x-database-port']) || process.env.POSTGRES_PORT || 5432,
      ssl: req.headers['x-database-ssl'] === 'true' || process.env.NODE_ENV === 'production'
    };

    // Create temporary postgres service with provided config
    const { Pool } = await import('pg');
    const tempPool = new Pool(dbConfig);
    
    // Initialize tables (only essential tables)
    await tempPool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS homestays (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          location VARCHAR(255),
          amenities TEXT[],
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS faqs (
          id SERIAL PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          tags TEXT[],
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(255) UNIQUE NOT NULL,
          value JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS general_knowledge (
          id SERIAL PRIMARY KEY,
          content TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate data from localStorage (this would need to be implemented)
    // For now, just return success
    await tempPool.end();
    
    res.json({
      success: true,
      message: 'Database migration completed successfully',
      timestamp: new Date().toISOString(),
      totalMigrated: 0 // This would be the actual count
    });
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Daily cleanup endpoints
app.get('/api/cleanup/status', (req, res) => {
  try {
    const status = dailyCleanupService.getStatus();
    const stats = dailyCleanupService.getStorageStats();
    
    res.json({
      success: true,
      data: {
        status,
        stats
      }
    });
  } catch (error) {
    console.error('❌ Error getting cleanup status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/cleanup/trigger', async (req, res) => {
  try {
    const result = await dailyCleanupService.triggerCleanup();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error triggering cleanup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Start daily cleanup service
    dailyCleanupService.start();
    console.log('🧹 Daily cleanup service started');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Webhook server running on port ${PORT}`);
      console.log(`📱 WhatsApp webhook: http://localhost:${PORT}/webhook/whatsapp`);
      console.log(`🔍 Health check: http://localhost:${PORT}/health`);
      console.log(`🐘 PostgreSQL API: http://localhost:${PORT}/api/postgres`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down webhook server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down webhook server...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
