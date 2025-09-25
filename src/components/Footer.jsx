import React from 'react';
import { baseStyles } from '../utils/styles.js';

export function Footer() {
  return (
    <footer style={{
      marginTop: 'auto',
      padding: '16px 20px',
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #e9ecef',
      fontSize: '12px',
      color: '#6c757d',
      textAlign: 'center'
    }}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ marginRight: '16px' }}>
          © 2024 WC Helper. All rights reserved.
        </span>
        <span style={{ marginRight: '16px' }}>
          <a 
            href="#legal" 
            style={{ 
              color: '#0d6efd', 
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.preventDefault();
              // This would be handled by the parent component to switch to Legal page
              window.dispatchEvent(new CustomEvent('navigateToLegal'));
            }}
          >
            Privacy Policy
          </a>
        </span>
        <span>
          <a 
            href="#terms" 
            style={{ 
              color: '#0d6efd', 
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.preventDefault();
              // This would be handled by the parent component to switch to Legal page
              window.dispatchEvent(new CustomEvent('navigateToLegal'));
            }}
          >
            Terms of Service
          </a>
        </span>
      </div>
      <div>
        WhatsApp Business API Integration • Meta Compliant • GDPR/CCPA Compliant
      </div>
    </footer>
  );
}
