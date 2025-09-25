import React, { useState } from 'react';
import { baseStyles } from '../../utils/styles.js';

export function LoginPage({ onLogin }) {
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
