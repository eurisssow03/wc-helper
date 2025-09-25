import React, { useState } from 'react';
import { baseStyles } from '../../utils/styles.js';

export function LoginPage({ onLogin, dbStatus }) {
  const [email, setEmail] = useState("admin@demo.com");
  const [pwd, setPwd] = useState("Passw0rd!");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  
  const submit = async (e) => { 
    e.preventDefault(); 
    setLoading(true); 
    setErr(""); 
    const res = await onLogin(email, pwd); 
    if (!res.ok) setErr(res.message || "Login failed"); 
    setLoading(false); 
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Login</div>
        
        {/* Database Status Indicator */}
        <div style={{ 
          marginBottom: 12, 
          padding: 8, 
          borderRadius: 4, 
          backgroundColor: dbStatus === 'connected' ? '#f0f9ff' : 
                         dbStatus === 'disconnected' ? '#fef3c7' : '#f3f4f6',
          border: `1px solid ${dbStatus === 'connected' ? '#0ea5e9' : 
                             dbStatus === 'disconnected' ? '#f59e0b' : '#6b7280'}`,
          fontSize: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: dbStatus === 'connected' ? '#10b981' : 
                             dbStatus === 'disconnected' ? '#f59e0b' : '#6b7280'
            }} />
            <span style={{ fontWeight: 600 }}>
              Database: {dbStatus === 'connected' ? 'Connected' : 
                        dbStatus === 'disconnected' ? 'Offline (Using Local Storage)' : 'Checking...'}
            </span>
          </div>
          {dbStatus === 'disconnected' && (
            <div style={{ color: '#92400e', fontSize: 11 }}>
              ⚠️ Database unavailable. Authentication will use local storage fallback.
            </div>
          )}
        </div>
        
        <div style={{ fontSize: 12, marginBottom: 12, color: "#64748b" }}>
          Debug: If you see this, the login page is working correctly.
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <div style={baseStyles.label}>Email</div>
            <input 
              style={baseStyles.input} 
              placeholder="e.g.: admin@demo.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={baseStyles.label}>Password</div>
            <input 
              style={baseStyles.input} 
              type="password" 
              placeholder="At least 8 characters, with uppercase, lowercase and numbers" 
              value={pwd} 
              onChange={e => setPwd(e.target.value)} 
            />
          </div>
          {err && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 8 }}>{err}</div>}
          <button 
            disabled={loading} 
            style={{ ...baseStyles.btnPrimary, width: "100%" }}
          >
            {loading ? "Logging in…" : "Login"}
          </button>
          <div style={{ fontSize: 12, marginTop: 12, color: "#64748b" }}>
            Default account: admin@demo.com / Passw0rd!
          </div>
          <button 
            type="button"
            onClick={() => {
              localStorage.removeItem('wc_session');
              window.location.reload();
            }}
            style={{ 
              ...baseStyles.btnGhost, 
              width: "100%", 
              marginTop: 8,
              fontSize: 12
            }}
          >
            Clear Session & Reload
          </button>
        </form>
      </div>
    </div>
  );
}
