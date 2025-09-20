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
    <div style={{ display: "grid", placeItems: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ ...baseStyles.card, width: 380 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Login</div>
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
        </form>
      </div>
    </div>
  );
}
