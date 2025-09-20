import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;

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

  // Get verify token from environment variable or use default for testing
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'my_verify_token_123';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
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
app.post('/webhook/whatsapp', (req, res) => {
  console.log('📨 Received webhook message:', JSON.stringify(req.body, null, 2));
  console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    const body = req.body;
    
    // Log the raw body for debugging
    console.log('📨 Raw body type:', typeof body);
    console.log('📨 Body object:', body.object);
    
    if (body.object === 'whatsapp_business_account') {
      console.log('✅ Valid WhatsApp Business Account object');
      
      body.entry.forEach((entry, entryIndex) => {
        console.log(`📨 Processing entry ${entryIndex}:`, entry.id);
        
        entry.changes.forEach((change, changeIndex) => {
          console.log(`📨 Processing change ${changeIndex}:`, change.field);
          
          if (change.field === 'messages') {
            console.log('✅ Messages field detected');
            
            // Check for incoming messages
            const messages = change.value.messages;
            if (messages && messages.length > 0) {
              console.log(`📨 Found ${messages.length} incoming messages`);
              
              messages.forEach((message, messageIndex) => {
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
                
                // TODO: Integrate with your React app's AI logic
                // This is where you would call your RAG system
                console.log('🤖 Message processing would happen here...');
              });
            } else {
              console.log('⚠️ No incoming messages found in change.value.messages');
            }
            
            // Check for status updates
            const statuses = change.value.statuses;
            if (statuses && statuses.length > 0) {
              console.log(`📊 Found ${statuses.length} status updates`);
              
              statuses.forEach((status, statusIndex) => {
                console.log(`📊 Status ${statusIndex}:`, {
                  messageId: status.id,
                  status: status.status,
                  recipient: status.recipient_id,
                  timestamp: status.timestamp
                });
              });
            } else {
              console.log('⚠️ No status updates found in change.value.statuses');
            }
          } else {
            console.log(`⚠️ Change field is not 'messages': ${change.field}`);
          }
        });
      });
    } else {
      console.log('❌ Invalid object type:', body.object);
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
    verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'my_verify_token_123',
    status: 'Ready for WhatsApp messages'
  });
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
  console.log('🚀 WhatsApp Webhook Server Started!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`🔑 Verify Token: ${process.env.WEBHOOK_VERIFY_TOKEN || 'my_verify_token_123'}`);
});
