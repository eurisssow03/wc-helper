import React from 'react';

export function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 12
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
