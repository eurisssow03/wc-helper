# WhatsApp Business API Setup Guide

## Issues Fixed

### 1. **WhatsApp API Sending Implementation**
- ✅ Implemented actual WhatsApp Business API integration
- ✅ Added proper error handling and logging
- ✅ Enabled message sending functionality

### 2. **Enhanced Debugging**
- ✅ Added detailed logging for webhook requests
- ✅ Added IP address and User-Agent tracking
- ✅ Added comprehensive error reporting

## Required Environment Variables

Add these to your `.env` file or environment:

```bash
# WhatsApp Business API Credentials
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_API_VERSION=v18.0

# Webhook Configuration
WEBHOOK_VERIFY_TOKEN=my_verify_token_123
```

## How to Get WhatsApp API Credentials

### 1. **Create Facebook App**
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add "WhatsApp Business API" product

### 2. **Get Access Token**
1. In your app dashboard, go to WhatsApp > API Setup
2. Copy the "Temporary access token" (for testing)
3. For production, generate a permanent token

### 3. **Get Phone Number ID**
1. In WhatsApp > API Setup
2. Copy the "Phone number ID" from your business phone number

### 4. **Configure Webhook**
1. Set webhook URL: `https://yourdomain.com/webhook/whatsapp`
2. Set verify token: `my_verify_token_123` (or your custom token)
3. Subscribe to `messages` field

## Testing Steps

### 1. **Test Webhook Verification**
```bash
curl "https://yourdomain.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=my_verify_token_123&hub.challenge=test_challenge"
```

### 2. **Test Message Processing**
```bash
node test-webhook.js
```

### 3. **Test with Real Phone**
1. Send a message to your WhatsApp Business number
2. Check server logs for incoming webhook
3. Verify AI response is sent back

## Troubleshooting

### Issue: "Missing WhatsApp API credentials"
- **Solution**: Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` environment variables

### Issue: "Webhook receives test but not real messages"
- **Check**: Webhook URL is publicly accessible (use ngrok for local testing)
- **Check**: Webhook is subscribed to correct fields in Facebook App
- **Check**: Phone number is verified in WhatsApp Business Manager

### Issue: "AI replies appear in web app but not WhatsApp"
- **Check**: WhatsApp API credentials are correct
- **Check**: Phone number ID matches your business number
- **Check**: Access token has proper permissions

## Local Development with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your webhook server
node webhook-server.js

# In another terminal, expose local server
ngrok http 3001

# Use the ngrok URL as your webhook URL in Facebook App
```

## Production Deployment

1. Deploy to a cloud service (Render, Heroku, AWS, etc.)
2. Set environment variables in your hosting platform
3. Update webhook URL in Facebook App to your production domain
4. Test with real phone numbers

## Monitoring

Check these endpoints for monitoring:
- `/health` - Server health check
- `/api/messages` - View received messages
- `/api/messages/stats` - Message statistics

## Common Issues

### 1. **Webhook Not Receiving Real Messages**
- Verify webhook URL is accessible from internet
- Check Facebook App webhook configuration
- Ensure phone number is verified in WhatsApp Business Manager

### 2. **Messages Not Sending**
- Verify access token is valid and not expired
- Check phone number ID is correct
- Ensure recipient number is in correct format (with country code)

### 3. **Permission Errors**
- Check access token permissions in Facebook App
- Ensure WhatsApp Business API is properly configured
- Verify business verification status
