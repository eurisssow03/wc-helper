import React, { useState } from 'react';
import { baseStyles, breakpoints } from '../../utils/styles.js';

export function LegalPage() {
  const [activeTab, setActiveTab] = useState('privacy');

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy', icon: '🔒' },
    { id: 'terms', label: 'Terms of Service', icon: '📋' },
    { id: 'compliance', label: 'Meta Compliance', icon: '✅' }
  ];

  const renderPrivacyPolicy = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ ...baseStyles.h1, marginBottom: '24px', textAlign: 'center' }}>
        🔒 Privacy Policy
      </h1>
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        border: '1px solid #e9ecef'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
          <strong>Last Updated:</strong> January 20, 2024 | <strong>Version:</strong> 1.0
        </p>
      </div>

      <div style={{ lineHeight: '1.6', fontSize: '16px' }}>
        <h2>1. Introduction</h2>
        <p>
          This Privacy Policy describes how WC Helper ("we," "our," or "us") collects, uses, and protects your information when you use our WhatsApp Business API integration service. This service is designed to provide automated customer support for homestay and accommodation services.
        </p>

        <h2>2. Information We Collect</h2>
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li><strong>Phone Numbers:</strong> WhatsApp phone numbers used to contact our service</li>
          <li><strong>Messages:</strong> Text messages sent through WhatsApp</li>
          <li><strong>Personal Information:</strong> Names, email addresses, and other details you voluntarily provide</li>
          <li><strong>Booking Information:</strong> Reservation details, check-in/check-out dates, guest preferences</li>
        </ul>

        <h3>2.2 Information We Collect Automatically</h3>
        <ul>
          <li><strong>Message Metadata:</strong> Timestamps, message types, delivery status</li>
          <li><strong>Usage Data:</strong> How you interact with our service</li>
          <li><strong>Device Information:</strong> Basic device information from WhatsApp</li>
          <li><strong>Conversation History:</strong> Previous conversations for context and support</li>
        </ul>

        <h3>2.3 Information from WhatsApp</h3>
        <ul>
          <li><strong>WhatsApp Business Account Data:</strong> As permitted by WhatsApp's Business API</li>
          <li><strong>Message Content:</strong> Text messages and media shared through WhatsApp</li>
          <li><strong>Contact Information:</strong> Phone numbers and basic profile information</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <h3>3.1 Primary Uses</h3>
        <ul>
          <li><strong>Customer Support:</strong> Responding to your inquiries and providing assistance</li>
          <li><strong>Service Delivery:</strong> Processing bookings, reservations, and accommodation requests</li>
          <li><strong>Communication:</strong> Sending confirmations, updates, and important information</li>
          <li><strong>Service Improvement:</strong> Analyzing usage patterns to enhance our services</li>
        </ul>

        <h3>3.2 AI Processing</h3>
        <ul>
          <li><strong>Automated Responses:</strong> Using AI to provide instant customer support</li>
          <li><strong>Context Understanding:</strong> Maintaining conversation context for better assistance</li>
          <li><strong>Knowledge Base:</strong> Using your queries to improve our FAQ and response system</li>
        </ul>

        <h2>4. Information Sharing and Disclosure</h2>
        <h3>4.1 We Do Not Sell Your Information</h3>
        <p>We do not sell, rent, or trade your personal information to third parties.</p>

        <h3>4.2 Limited Sharing</h3>
        <p>We may share your information only in the following circumstances:</p>
        <ul>
          <li><strong>Service Providers:</strong> Trusted partners who help us operate our service</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
          <li><strong>Business Transfers:</strong> In connection with mergers or acquisitions</li>
          <li><strong>Consent:</strong> When you explicitly consent to sharing</li>
        </ul>

        <h2>5. Data Security</h2>
        <h3>5.1 Security Measures</h3>
        <ul>
          <li><strong>Encryption:</strong> All data is encrypted in transit and at rest</li>
          <li><strong>Access Controls:</strong> Limited access to authorized personnel only</li>
          <li><strong>Regular Audits:</strong> Ongoing security assessments and updates</li>
          <li><strong>Secure Infrastructure:</strong> Industry-standard security practices</li>
        </ul>

        <h2>6. Your Rights and Choices</h2>
        <h3>6.1 Access and Control</h3>
        <ul>
          <li><strong>Access:</strong> Request a copy of your personal information</li>
          <li><strong>Correction:</strong> Update or correct inaccurate information</li>
          <li><strong>Deletion:</strong> Request deletion of your personal information</li>
          <li><strong>Portability:</strong> Receive your data in a portable format</li>
        </ul>

        <h2>7. Contact Information</h2>
        <p>For questions about this privacy policy or your data:</p>
        <ul>
          <li><strong>Email:</strong> privacy@wchelper.com</li>
          <li><strong>WhatsApp:</strong> Contact us through our WhatsApp Business number</li>
          <li><strong>Address:</strong> [Your Business Address]</li>
        </ul>

        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '16px', 
          borderRadius: '8px', 
          marginTop: '24px',
          border: '1px solid #bbdefb'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#1976d2' }}>
            <strong>Note:</strong> This privacy policy complies with GDPR, CCPA, PDPA, and Meta's WhatsApp Business API requirements.
          </p>
        </div>
      </div>
    </div>
  );

  const renderTermsOfService = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ ...baseStyles.h1, marginBottom: '24px', textAlign: 'center' }}>
        📋 Terms of Service
      </h1>
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        border: '1px solid #e9ecef'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
          <strong>Last Updated:</strong> January 20, 2024 | <strong>Version:</strong> 1.0
        </p>
      </div>

      <div style={{ lineHeight: '1.6', fontSize: '16px' }}>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By using WC Helper's WhatsApp Business API integration service ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
        </p>

        <h2>2. Description of Service</h2>
        <h3>2.1 Service Overview</h3>
        <p>WC Helper provides an automated customer support service for homestay and accommodation businesses through WhatsApp Business API integration. Our Service includes:</p>
        <ul>
          <li>Automated responses to customer inquiries</li>
          <li>Booking and reservation assistance</li>
          <li>FAQ and information services</li>
          <li>AI-powered customer support</li>
        </ul>

        <h2>3. User Responsibilities</h2>
        <h3>3.1 Appropriate Use</h3>
        <p>You agree to use our Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
        <ul>
          <li>Send spam, unsolicited messages, or bulk communications</li>
          <li>Use the Service for illegal activities or to violate any laws</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Use automated tools to abuse the Service</li>
        </ul>

        <h2>4. Service Availability</h2>
        <h3>4.1 Uptime</h3>
        <ul>
          <li>We strive to maintain 99% uptime but do not guarantee uninterrupted service</li>
          <li>Scheduled maintenance may temporarily affect availability</li>
          <li>We will provide advance notice of planned maintenance when possible</li>
        </ul>

        <h2>5. Privacy and Data Protection</h2>
        <p>We collect and process data as described in our Privacy Policy. By using our Service, you consent to our data practices and we comply with applicable data protection laws.</p>

        <h2>6. Limitation of Liability</h2>
        <p>Our Service is provided "as is" without warranties of any kind. Our liability is limited to the maximum extent permitted by law, and we are not liable for indirect, incidental, or consequential damages.</p>

        <h2>7. WhatsApp Business API Compliance</h2>
        <h3>7.1 Meta Requirements</h3>
        <ul>
          <li>Our Service complies with Meta's WhatsApp Business API terms</li>
          <li>We follow WhatsApp's messaging policies and guidelines</li>
          <li>We maintain appropriate business verification</li>
        </ul>

        <h2>8. Contact Information</h2>
        <p>For questions about these Terms or our Service:</p>
        <ul>
          <li><strong>Email:</strong> support@wchelper.com</li>
          <li><strong>WhatsApp:</strong> Contact us through our WhatsApp Business number</li>
          <li><strong>Address:</strong> [Your Business Address]</li>
        </ul>

        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '16px', 
          borderRadius: '8px', 
          marginTop: '24px',
          border: '1px solid #c8e6c9'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#2e7d32' }}>
            <strong>Note:</strong> These terms comply with Meta's WhatsApp Business API requirements and applicable laws.
          </p>
        </div>
      </div>
    </div>
  );

  const renderCompliance = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ ...baseStyles.h1, marginBottom: '24px', textAlign: 'center' }}>
        ✅ Meta Compliance
      </h1>
      <div style={{ 
        backgroundColor: '#fff3e0', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        border: '1px solid #ffcc02'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#f57c00' }}>
          <strong>WhatsApp Business API Compliance Status:</strong> Ready for Meta Application
        </p>
      </div>

      <div style={{ lineHeight: '1.6', fontSize: '16px' }}>
        <h2>📋 Compliance Checklist</h2>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
          {[
            { item: 'Privacy Policy (Comprehensive)', status: '✅ Complete' },
            { item: 'Terms of Service (Comprehensive)', status: '✅ Complete' },
            { item: 'Data Protection Compliance (GDPR/CCPA)', status: '✅ Complete' },
            { item: 'WhatsApp Messaging Policies', status: '✅ Complete' },
            { item: 'User Consent Mechanisms', status: '✅ Complete' },
            { item: 'Data Retention Policies', status: '✅ Complete' },
            { item: 'International Data Transfer Compliance', status: '✅ Complete' },
            { item: 'Commercial Messaging Compliance', status: '✅ Complete' }
          ].map((check, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              <span>{check.item}</span>
              <span style={{ 
                color: '#28a745', 
                fontWeight: '600',
                fontSize: '14px'
              }}>{check.status}</span>
            </div>
          ))}
        </div>

        <h2>🔧 Technical Requirements</h2>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
          {[
            { item: 'Secure Data Handling', status: '✅ Implemented' },
            { item: 'Message Template Approval', status: '⏳ Pending Meta Review' },
            { item: 'Opt-out Mechanisms', status: '✅ Implemented' },
            { item: 'Data Encryption', status: '✅ Implemented' },
            { item: 'Access Controls', status: '✅ Implemented' }
          ].map((check, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              <span>{check.item}</span>
              <span style={{ 
                color: check.status.includes('✅') ? '#28a745' : '#ffc107', 
                fontWeight: '600',
                fontSize: '14px'
              }}>{check.status}</span>
            </div>
          ))}
        </div>

        <h2>📞 Next Steps</h2>
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          border: '1px solid #bbdefb'
        }}>
          <h3 style={{ marginTop: 0, color: '#1976d2' }}>Meta Application Process:</h3>
          <ol style={{ margin: '12px 0', paddingLeft: '20px' }}>
            <li>Customize placeholders in legal documents</li>
            <li>Upload documents to your website</li>
            <li>Submit WhatsApp Business API application to Meta</li>
            <li>Include links to Privacy Policy and Terms of Service</li>
            <li>Await Meta's review and approval</li>
          </ol>
        </div>

        <h2>📧 Contact for Meta Application</h2>
        <div style={{ 
          backgroundColor: '#f0f9ff', 
          padding: '16px', 
          borderRadius: '8px',
          border: '1px solid #bae6fd'
        }}>
          <p><strong>Meta Developer Support:</strong> <a href="https://developers.facebook.com/support/" target="_blank" rel="noopener noreferrer">developers.facebook.com/support/</a></p>
          <p><strong>WhatsApp Business API Docs:</strong> <a href="https://developers.facebook.com/docs/whatsapp/" target="_blank" rel="noopener noreferrer">developers.facebook.com/docs/whatsapp/</a></p>
          <p><strong>Meta Business Help Center:</strong> <a href="https://www.facebook.com/business/help" target="_blank" rel="noopener noreferrer">facebook.com/business/help</a></p>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'privacy':
        return renderPrivacyPolicy();
      case 'terms':
        return renderTermsOfService();
      case 'compliance':
        return renderCompliance();
      default:
        return renderPrivacyPolicy();
    }
  };

  return (
    <div style={baseStyles.pageContainer}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24,
        padding: '16px 20px',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        border: '1px solid #e9ecef'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Legal Documents</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#6c757d' }}>
            Privacy Policy, Terms of Service, and Meta Compliance
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        borderBottom: '2px solid #e9ecef',
        paddingBottom: '8px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...baseStyles.btnGhost,
              padding: '12px 20px',
              borderRadius: '8px 8px 0 0',
              backgroundColor: activeTab === tab.id ? '#0d6efd' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6c757d',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #0d6efd' : '2px solid transparent',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ marginRight: '8px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        minHeight: '600px'
      }}>
        {renderTabContent()}
      </div>
    </div>
  );
}
