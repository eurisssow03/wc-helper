# Public Legal Pages Deployment Guide

## 🌐 Overview

This guide helps you deploy the public legal pages that are accessible without login for Meta/Facebook WhatsApp Business API compliance.

## 📁 Files Created

### Public HTML Files
- **`public/index.html`** - Landing page with links to legal documents
- **`public/privacy-policy.html`** - Standalone privacy policy
- **`public/terms-of-service.html`** - Standalone terms of service
- **`public-server.js`** - Express server for serving public pages

## 🚀 Deployment Options

### Option 1: Standalone Server (Recommended)

#### 1. Run Public Server
```bash
# Install dependencies
npm install

# Run public server
npm run public

# Or for development with auto-reload
npm run public:dev
```

#### 2. Access URLs
- **Home**: `http://localhost:3002/`
- **Privacy Policy**: `http://localhost:3002/privacy-policy`
- **Terms of Service**: `http://localhost:3002/terms-of-service`

#### 3. Production Deployment
```bash
# Build and run in production
NODE_ENV=production node public-server.js
```

### Option 2: Static Hosting

#### 1. Deploy to Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `public`
4. Deploy

#### 2. Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --prod`
3. Follow prompts to deploy

#### 3. Deploy to GitHub Pages
1. Push files to GitHub
2. Enable GitHub Pages in repository settings
3. Set source to `public` folder

### Option 3: CDN/Cloud Storage

#### 1. AWS S3 + CloudFront
1. Upload `public` folder to S3 bucket
2. Enable static website hosting
3. Set up CloudFront distribution
4. Configure custom domain

#### 2. Google Cloud Storage
1. Create bucket with public access
2. Upload `public` folder contents
3. Enable static website hosting
4. Configure custom domain

## 🔧 Configuration

### Environment Variables
```bash
# Public server port (default: 3002)
PUBLIC_PORT=3002

# Production URL for Meta application
PUBLIC_URL=https://your-domain.com
```

### Custom Domain Setup
1. **Domain Configuration**
   - Point your domain to your hosting provider
   - Set up SSL certificate (Let's Encrypt recommended)
   - Configure redirects if needed

2. **URL Structure**
   ```
   https://your-domain.com/
   https://your-domain.com/privacy-policy
   https://your-domain.com/terms-of-service
   ```

## 📱 Meta Application URLs

### Required URLs for Meta
When submitting your WhatsApp Business API application to Meta, use these URLs:

```
Privacy Policy: https://your-domain.com/privacy-policy
Terms of Service: https://your-domain.com/terms-of-service
```

### URL Examples
- **Production**: `https://wchelper.com/privacy-policy`
- **Staging**: `https://staging.wchelper.com/privacy-policy`
- **Development**: `http://localhost:3002/privacy-policy`

## 🛡️ Security Considerations

### 1. HTTPS Required
- Meta requires HTTPS for all legal document URLs
- Use Let's Encrypt for free SSL certificates
- Configure HTTP to HTTPS redirects

### 2. CORS Headers
```javascript
// Add to public-server.js if needed
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

### 3. Security Headers
```javascript
// Add security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});
```

## 📊 Monitoring

### 1. Health Check
```bash
# Check if server is running
curl http://localhost:3002/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "service": "WC Helper Legal Documents Server"
}
```

### 2. Logging
```javascript
// Add logging to public-server.js
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
```

## 🔄 Updates and Maintenance

### 1. Document Updates
1. Edit HTML files in `public` folder
2. Update version numbers and dates
3. Test locally: `npm run public:dev`
4. Deploy to production

### 2. Version Control
```bash
# Track changes
git add public/
git commit -m "Update legal documents"
git push origin main
```

### 3. Backup
- Keep backups of legal documents
- Store in multiple locations
- Document all changes

## 🎯 Meta Compliance Checklist

### ✅ Required Elements
- [ ] Publicly accessible URLs (no login required)
- [ ] HTTPS enabled
- [ ] Mobile-friendly design
- [ ] Professional presentation
- [ ] Contact information included
- [ ] Last updated dates
- [ ] Version numbers

### ✅ Content Requirements
- [ ] Data collection and usage clearly described
- [ ] WhatsApp integration specifics included
- [ ] User rights and choices outlined
- [ ] International compliance (GDPR/CCPA) covered
- [ ] Service limitations and responsibilities
- [ ] Contact information for inquiries

### ✅ Technical Requirements
- [ ] Fast loading times
- [ ] Responsive design
- [ ] Proper HTML structure
- [ ] SEO-friendly URLs
- [ ] Error handling (404 pages)

## 🚨 Troubleshooting

### Common Issues

#### 1. 404 Errors
- Check file paths in `public` folder
- Verify server is running
- Check URL spelling

#### 2. HTTPS Issues
- Ensure SSL certificate is valid
- Check domain configuration
- Test with online SSL checker

#### 3. Meta Rejection
- Verify URLs are publicly accessible
- Check content completeness
- Ensure professional presentation
- Test on mobile devices

### Debug Commands
```bash
# Check if files exist
ls -la public/

# Test server locally
curl -I http://localhost:3002/privacy-policy

# Check HTTPS
curl -I https://your-domain.com/privacy-policy
```

## 📞 Support

### Resources
- **Meta Developer Support**: https://developers.facebook.com/support/
- **WhatsApp Business API Docs**: https://developers.facebook.com/docs/whatsapp/
- **Meta Business Help**: https://www.facebook.com/business/help

### Contact
- **Email**: support@wchelper.com
- **WhatsApp**: Your WhatsApp Business number
- **GitHub**: Your repository issues

---

**Status**: Ready for deployment
**Last Updated**: January 20, 2024
**Version**: 1.0

The public legal pages are now ready for deployment and Meta application submission! 🚀✨
