// WhatsApp Webhook Handler
// This file should be served as a static endpoint

// Webhook verification (GET request)
if (window.location.search.includes('hub.mode=subscribe')) {
  const hubMode = new URLSearchParams(window.location.search).get('hub.mode');
  const hubVerifyToken = new URLSearchParams(window.location.search).get('hub.verify_token');
  const hubChallenge = new URLSearchParams(window.location.search).get('hub.challenge');
  
  // Get verify token from localStorage (from settings)
  const settings = JSON.parse(localStorage.getItem('wc_settings') || '{}');
  const expectedToken = settings.whatsapp?.webhookToken || 'your_verify_token';
  
  if (hubMode === 'subscribe' && hubVerifyToken === expectedToken) {
    document.body.innerHTML = `<h1>Webhook Verified!</h1><p>Challenge: ${hubChallenge}</p>`;
  } else {
    document.body.innerHTML = '<h1>Webhook Verification Failed</h1>';
  }
} else {
  // Handle incoming messages (POST request)
  document.body.innerHTML = `
    <h1>WhatsApp Webhook Endpoint</h1>
    <p>This endpoint is ready to receive WhatsApp messages.</p>
    <p>Configure this URL in your WhatsApp Business API settings:</p>
    <code>https://cc12120fc308.ngrok-free.app/webhook/whatsapp</code>
    <br><br>
    <p><strong>Note:</strong> This is a static file. For production, you'll need a proper backend server.</p>
  `;
}
