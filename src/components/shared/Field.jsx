import React from 'react';

export function Field({ label, children }) {
  return (
    <div>
      <div style={{ 
        fontSize: 13, 
        fontWeight: 600, 
        marginBottom: 6 
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
