# Legal Documents Setup Guide

## 📋 Overview

This guide helps you set up the legal documents required for Meta's WhatsApp Business API approval.

## 🚀 Quick Start

### 1. New Web App Page
- **Legal Page**: Added to your web app navigation
- **Location**: `src/components/pages/LegalPage.jsx`
- **Access**: Click "Legal" in the sidebar
- **Features**: 
  - Privacy Policy tab
  - Terms of Service tab
  - Meta Compliance checklist

### 2. Footer Integration
- **Footer Component**: Added to all pages
- **Location**: `src/components/Footer.jsx`
- **Features**:
  - Privacy Policy link
  - Terms of Service link
  - Compliance status indicators

## 🔧 Customization Required

### Replace These Placeholders:

#### In `PRIVACY_POLICY.md` and `TERMS_OF_SERVICE.md`:
```markdown
[Your Business Address] → Your actual business address
[Your Jurisdiction] → Your country/state for legal purposes
[Your Contact Number] → Your business phone number
wchelper.com → Your actual domain name
WC Helper → Your business name
```

#### In `src/components/pages/LegalPage.jsx`:
```javascript
// Update contact information in the rendered content
privacy@wchelper.com → your-privacy-email@yourdomain.com
support@wchelper.com → your-support-email@yourdomain.com
legal@wchelper.com → your-legal-email@yourdomain.com
```

## 📱 Meta Application Process

### Step 1: Customize Documents
1. Edit `PRIVACY_POLICY.md` and `TERMS_OF_SERVICE.md`
2. Replace all placeholders with your actual information
3. Review for your specific jurisdiction requirements

### Step 2: Host Documents
1. Upload both documents to your website
2. Make them publicly accessible
3. Test the links work correctly

### Step 3: Update Web App
1. Update contact information in `LegalPage.jsx`
2. Test the Legal page in your web app
3. Ensure footer links work properly

### Step 4: Submit to Meta
1. Include document URLs in your WhatsApp Business API application
2. Ensure all placeholders are replaced
3. Verify compliance with Meta's requirements

## ✅ Compliance Checklist

### Privacy Policy Requirements:
- [ ] Data collection and usage clearly described
- [ ] WhatsApp integration specifics included
- [ ] User rights and choices outlined
- [ ] International compliance (GDPR/CCPA) covered
- [ ] Contact information updated
- [ ] Data retention policies specified

### Terms of Service Requirements:
- [ ] Service description and limitations
- [ ] User responsibilities clearly defined
- [ ] WhatsApp Business API compliance
- [ ] Liability limitations included
- [ ] Contact information updated
- [ ] Dispute resolution process outlined

### Technical Requirements:
- [ ] Documents hosted on your website
- [ ] Links are publicly accessible
- [ ] Mobile-friendly formatting
- [ ] Professional presentation
- [ ] Regular updates maintained

## 🎯 Meta-Specific Features

### WhatsApp Business API Compliance:
- ✅ Data protection and privacy rights
- ✅ User consent mechanisms
- ✅ Data retention policies
- ✅ International data transfer compliance
- ✅ WhatsApp messaging policies
- ✅ Commercial messaging compliance

### Legal Framework:
- ✅ GDPR compliance (EU)
- ✅ CCPA compliance (California)
- ✅ PDPA compliance (Malaysia)
- ✅ Meta's WhatsApp Business API terms
- ✅ Industry-standard legal language

## 🔍 Testing Your Setup

### 1. Web App Testing:
```bash
npm run dev
```
- Navigate to "Legal" page
- Test all three tabs (Privacy, Terms, Compliance)
- Verify footer links work
- Check mobile responsiveness

### 2. Document Testing:
- Open Privacy Policy in browser
- Open Terms of Service in browser
- Verify all placeholders are replaced
- Check links and formatting

### 3. Meta Application Testing:
- Verify document URLs are accessible
- Test from different devices/locations
- Ensure professional presentation
- Check compliance with Meta requirements

## 📞 Support Resources

### Meta Resources:
- **Developer Support**: https://developers.facebook.com/support/
- **WhatsApp Business API Docs**: https://developers.facebook.com/docs/whatsapp/
- **Meta Business Help**: https://www.facebook.com/business/help

### Legal Resources:
- **GDPR Guide**: https://gdpr.eu/
- **CCPA Guide**: https://oag.ca.gov/privacy/ccpa
- **PDPA Guide**: https://www.pdpc.gov.sg/

## 🚨 Important Notes

1. **Legal Review**: Have a legal professional review your documents
2. **Regular Updates**: Keep documents updated as your service evolves
3. **Jurisdiction Specific**: Ensure compliance with your specific jurisdiction
4. **Meta Changes**: Stay updated with Meta's changing requirements
5. **User Communication**: Notify users of significant changes

## 📈 Next Steps

1. ✅ Customize all placeholders
2. ✅ Host documents on your website
3. ✅ Update web app contact information
4. ✅ Test all functionality
5. ⏳ Submit to Meta for approval
6. ⏳ Monitor for approval status
7. ⏳ Implement any requested changes

---

**Status**: Ready for customization and Meta application
**Last Updated**: January 20, 2024
**Version**: 1.0
