import React from 'react';
import { readLS, STORAGE_KEYS } from '../../services/storage.js';
import { formatDateTime } from '../../utils/helpers.js';
import { baseStyles } from '../../utils/styles.js';

export function Dashboard() {
  const homestays = readLS(STORAGE_KEYS.homestays, []);
  const faqs = readLS(STORAGE_KEYS.faqs, []);
  const logs = readLS(STORAGE_KEYS.logs, []);
  const latest = logs.slice(-5).reverse();
  
  return (
    <div>
      <div className="dashboard-grid">
        <div style={baseStyles.card}>
          <b>Homestays</b>
          <div style={{ 
            fontSize: 28, 
            marginTop: 8
          }}>{homestays.length}</div>
        </div>
        <div style={baseStyles.card}>
          <b>FAQs</b>
          <div style={{ 
            fontSize: 28, 
            marginTop: 8
          }}>{faqs.length}</div>
        </div>
        <div style={baseStyles.card}>
          <b>Total Logs</b>
          <div style={{ 
            fontSize: 28, 
            marginTop: 8
          }}>{logs.length}</div>
        </div>
      </div>
      <div style={baseStyles.card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Recent 5 Logs</div>
        <table style={baseStyles.table}>
          <thead>
            <tr>
              <th style={baseStyles.th}>Time</th>
              <th style={baseStyles.th}>Source</th>
              <th style={baseStyles.th}>Question</th>
              <th style={baseStyles.th}>Matched Question</th>
              <th style={baseStyles.th}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((l, idx) => (
              <tr key={idx}>
                <td style={baseStyles.td}>{formatDateTime(l.created_at)}</td>
                <td style={baseStyles.td}>
                  <span style={baseStyles.badge}>{l.channel}</span>
                </td>
                <td style={baseStyles.td}>{l.incoming_text}</td>
                <td style={baseStyles.td}>{l.matched_question || "—"}</td>
                <td style={baseStyles.td}>{l.confidence?.toFixed?.(2) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
