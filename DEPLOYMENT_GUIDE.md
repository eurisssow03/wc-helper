# 🚀 WhatsApp Webhook Deployment Guide

This guide will help you deploy your WhatsApp Customer Service Assistant for webhook testing.

## 📋 Prerequisites

- GitHub repository (already linked)
- WhatsApp Business API access
- Node.js 18+ installed locally

## 🌐 Deployment Options

### Option 1: Render.com (Recommended - Free Tier)

#### Step 1: Prepare for Render Deployment

1. **Update render.yaml** (already configured):
```yaml
services:
  - type: web
    name: whatsapp-webhook
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node webhook-server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: WEBHOOK_VERIFY_TOKEN
        value: your_secure_verify_token_here
```

#### Step 2: Deploy to Render

1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `whatsapp-webhook`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node webhook-server.js`
   - **Plan**: `Free`

#### Step 3: Set Environment Variables

In Render dashboard, go to Environment tab and add:
```
NODE_ENV=production
WEBHOOK_VERIFY_TOKEN=your_secure_verify_token_here
```

#### Step 4: Deploy

Click "Create Web Service" and wait for deployment.

### Option 2: Railway.app (Alternative)

#### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

#### Step 2: Deploy
```bash
railway login
railway init
railway up
```

#### Step 3: Set Environment Variables
```bash
railway variables set NODE_ENV=production
railway variables set WEBHOOK_VERIFY_TOKEN=your_secure_verify_token_here
```

### Option 3: Heroku (If you have credits)

#### Step 1: Install Heroku CLI
```bash
npm install -g heroku
```

#### Step 2: Deploy
```bash
heroku create your-app-name
git push heroku main
```

#### Step 3: Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set WEBHOOK_VERIFY_TOKEN=your_secure_verify_token_here
```

## 🔧 Local Testing Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Environment Variables
Create `.env` file:
```env
NODE_ENV=development
WEBHOOK_VERIFY_TOKEN=my_verify_token_123
PORT=3001
```

### Step 3: Run Locally
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Step 4: Test Endpoints

1. **Health Check**: `http://localhost:3001/health`
2. **Test Endpoint**: `http://localhost:3001/test`
3. **Webhook URL**: `http://localhost:3001/webhook/whatsapp`

## 📱 WhatsApp Business API Setup

### Step 1: Get Your Webhook URL

After deployment, your webhook URL will be:
```
https://your-app-name.onrender.com/webhook/whatsapp
```

### Step 2: Configure WhatsApp Business API

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Select your WhatsApp Business API app
3. Go to WhatsApp → Configuration
4. Set Webhook URL: `https://your-app-name.onrender.com/webhook/whatsapp`
5. Set Verify Token: `your_secure_verify_token_here` (same as in environment variables)
6. Subscribe to `messages` field
7. Click "Verify and Save"

### Step 3: Test Webhook

1. Send a test message to your WhatsApp Business number
2. Check your server logs for incoming messages
3. Verify the webhook is receiving data correctly

## 🧪 Testing Your Deployment

### Test 1: Health Check
```bash
curl https://your-app-name.onrender.com/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "memory": {...}
}
```

### Test 2: Webhook Verification
```bash
curl "https://your-app-name.onrender.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=your_secure_verify_token_here&hub.challenge=test_challenge"
```

Expected response: `test_challenge`

### Test 3: Test Endpoint
```bash
curl https://your-app-name.onrender.com/test
```

Expected response:
```json
{
  "message": "Webhook test endpoint",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "webhookUrl": "https://your-app-name.onrender.com/webhook/whatsapp",
  "verifyToken": "your_secure_verify_token_here"
}
```

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit `.env` files to Git
- Use strong, unique verify tokens
- Rotate tokens regularly

### 2. Webhook Security
- Validate all incoming webhook data
- Implement rate limiting
- Log all webhook events for monitoring

### 3. API Keys
- Store API keys in environment variables
- Use different keys for development and production
- Monitor API usage and costs

## 📊 Monitoring and Logs

### Render.com
- View logs in Render dashboard
- Set up alerts for errors
- Monitor resource usage

### Railway.app
- Use Railway dashboard for logs
- Set up monitoring alerts
- Track deployment metrics

### Heroku
- Use Heroku logs: `heroku logs --tail`
- Set up log drains for external monitoring
- Monitor dyno usage

## 🚨 Troubleshooting

### Common Issues

1. **Webhook Verification Failed**
   - Check verify token matches exactly
   - Ensure webhook URL is accessible
   - Verify HTTPS is working

2. **Messages Not Received**
   - Check WhatsApp Business API configuration
   - Verify webhook subscription
   - Check server logs for errors

3. **Deployment Issues**
   - Check build logs for errors
   - Verify environment variables
   - Ensure all dependencies are installed

### Debug Commands

```bash
# Check server status
curl https://your-app-name.onrender.com/health

# Test webhook verification
curl "https://your-app-name.onrender.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"

# View logs (Render)
# Check Render dashboard → Logs tab

# View logs (Railway)
railway logs

# View logs (Heroku)
heroku logs --tail
```

## 📈 Next Steps

1. **Integrate AI Logic**: Connect your React app's RAG system to the webhook
2. **Add Database**: Implement proper data persistence
3. **Set Up Monitoring**: Add error tracking and performance monitoring
4. **Scale Up**: Consider upgrading to paid plans for production use
5. **Add Features**: Implement message queuing, retry logic, and advanced AI features

## 🆘 Support

If you encounter issues:

1. Check the server logs first
2. Verify all environment variables are set correctly
3. Test webhook endpoints manually
4. Check WhatsApp Business API configuration
5. Review this guide for common solutions

---

**Happy Deploying! 🚀**
