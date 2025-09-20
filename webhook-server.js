const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Webhook verification endpoint
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Webhook verification request:', { 
    mode, 
    token, 
    challenge,
    allQuery: req.query 
  });

  // Get verify token from your settings (you can hardcode this for testing)
  const VERIFY_TOKEN = 'my_verify_token_123'; // Change this to match your settings

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed:', { 
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
  console.log('Received webhook message:', JSON.stringify(req.body, null, 2));
  
  // Process the message here
  const body = req.body;
  
  if (body.object === 'whatsapp_business_account') {
    body.entry.forEach(entry => {
      entry.changes.forEach(change => {
        if (change.field === 'messages') {
          const messages = change.value.messages;
          if (messages) {
            messages.forEach(message => {
              console.log('New message from:', message.from);
              console.log('Message text:', message.text?.body);
              console.log('Message type:', message.type);
              
              // Here you would process the message and send a reply
              // For now, just log it
            });
          }
        }
      });
    });
  }
  
  res.status(200).send('OK');
});

// Root path handler
app.get('/', (req, res) => {
  res.json({ 
    message: 'WhatsApp Webhook Server is running!',
    status: 'OK', 
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/webhook/whatsapp',
      health: '/health'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
