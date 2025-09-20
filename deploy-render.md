# 🚀 Render Deployment Guide

## Quick Fix for ES Module Error

The error you encountered is because your main `package.json` has `"type": "module"` but the webhook server was using CommonJS syntax. I've fixed this by:

1. ✅ Converting `webhook-server.js` to ES modules
2. ✅ Converting `test-webhook.js` to ES modules  
3. ✅ Adding `"type": "module"` to `webhook-package.json`
4. ✅ Updated `render.yaml` with environment variables

## 🚀 Deploy to Render

### Step 1: Commit and Push Changes
```bash
git add .
git commit -m "Fix ES module compatibility for Render deployment"
git push origin main
```

### Step 2: Deploy on Render

1. **Go to [render.com](https://render.com)**
2. **Click "New +" → "Web Service**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `whatsapp-webhook`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node webhook-server.js`
   - **Plan**: `Free`

### Step 3: Set Environment Variables

In the Render dashboard, go to **Environment** tab and add:

```
NODE_ENV=production
WEBHOOK_VERIFY_TOKEN=your_secure_verify_token_here
```

**Important**: Replace `your_secure_verify_token_here` with a strong, unique token that you'll use in WhatsApp Business API configuration.

### Step 4: Deploy

Click **"Create Web Service"** and wait for deployment.

## 🧪 Test Your Deployment

Once deployed, you'll get a URL like: `https://whatsapp-webhook-xxxx.onrender.com`

### Test Commands:
```bash
# Health check
curl https://your-app-name.onrender.com/health

# Webhook verification test
curl "https://your-app-name.onrender.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"

# Test endpoint
curl https://your-app-name.onrender.com/test
```

## 📱 WhatsApp Business API Setup

1. **Go to [Facebook Developers](https://developers.facebook.com)**
2. **Select your WhatsApp Business API app**
3. **Go to WhatsApp → Configuration**
4. **Set Webhook URL**: `https://your-app-name.onrender.com/webhook/whatsapp`
5. **Set Verify Token**: `your_secure_verify_token_here` (same as in Render)
6. **Subscribe to `messages` field**
7. **Click "Verify and Save"**

## 🔧 Troubleshooting

### If deployment still fails:
1. Check Render logs for specific errors
2. Ensure all files are committed and pushed
3. Verify environment variables are set correctly

### If webhook verification fails:
1. Double-check the verify token matches exactly
2. Ensure the webhook URL is accessible
3. Check that HTTPS is working (Render provides this automatically)

## ✅ Success Indicators

- ✅ Render deployment shows "Live" status
- ✅ Health check returns 200 OK
- ✅ Webhook verification returns the challenge
- ✅ WhatsApp Business API shows "Verified" status

---

**Your webhook should now work perfectly on Render! 🎉**
