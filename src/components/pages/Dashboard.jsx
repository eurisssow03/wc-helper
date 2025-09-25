import React, { useState, useEffect } from 'react';
import { readLS, STORAGE_KEYS } from '../../services/storage.js';
import { formatDateTime } from '../../utils/helpers.js';
import { baseStyles } from '../../utils/styles.js';
import messageSyncService from '../../services/messageSyncService.js';
import { conversationMemoryService } from '../../services/conversationMemoryService.js';

export function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  
  const homestays = readLS(STORAGE_KEYS.homestays, []);
  const faqs = readLS(STORAGE_KEYS.faqs, []);
  const homestayGeneralKnowledge = readLS(STORAGE_KEYS.homestayGeneralKnowledge, "");
  const memoryStats = conversationMemoryService.getStats();
  
  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      // Sync messages from webhook
      await messageSyncService.syncMessagesFromWebhook();
      
      // Get latest data
      const latestLogs = messageSyncService.getLogs();
      const latestMessages = messageSyncService.getMessages();
      
      setLogs(latestLogs);
      setMessages(latestMessages);
    };
    
    loadData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const latest = logs.slice(-5).reverse();
  
  return (
    <div>
      <div className="dashboard-grid">
        <div style={baseStyles.card}>
          <b>🏨 Homestays</b>
          <div style={{ 
            fontSize: 28, 
            marginTop: 8
          }}>{homestays.length}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Properties
          </div>
        </div>
        <div style={baseStyles.card}>
          <b>📚 FAQs</b>
          <div style={{ 
            fontSize: 28, 
            marginTop: 8
          }}>{faqs.length}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Active: {faqs.filter(f => f.is_active).length}
          </div>
        </div>
        <div style={baseStyles.card}>
          <b>💾 Memory</b>
          <div style={{ 
            fontSize: 28, 
            marginTop: 8
          }}>{memoryStats.totalConversations}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {memoryStats.totalMessages} messages
          </div>
        </div>
        <div style={baseStyles.card}>
          <b>🧠 Knowledge</b>
          <div style={{ 
            fontSize: 28, 
            marginTop: 8
          }}>{homestayGeneralKnowledge.length}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Characters
          </div>
        </div>
        <div style={baseStyles.card}>
          <b>📊 Total Logs</b>
          <div style={{ 
            fontSize: 28, 
            marginTop: 8
          }}>{logs.length}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            AI Interactions
          </div>
        </div>
        <div style={baseStyles.card}>
          <b>💬 Messages</b>
          <div style={{ 
            fontSize: 28, 
            marginTop: 8
          }}>{messages.length}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Total Messages
          </div>
        </div>
      </div>
      <div style={baseStyles.card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>🤖 Recent AI Interactions</div>
        <table style={baseStyles.table}>
          <thead>
            <tr>
              <th style={baseStyles.th}>Time</th>
              <th style={baseStyles.th}>Source</th>
              <th style={baseStyles.th}>Question</th>
              <th style={baseStyles.th}>Decision</th>
              <th style={baseStyles.th}>Confidence</th>
              <th style={baseStyles.th}>Memory</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((l, idx) => {
              const confidence = l.confidence || 0;
              const confidenceCategory = confidence >= 0.8 ? 'High' : confidence >= 0.5 ? 'Medium' : 'Low';
              const confidenceColor = confidence >= 0.8 ? '#10b981' : confidence >= 0.5 ? '#f59e0b' : '#ef4444';
              
              return (
                <tr key={idx}>
                  <td style={baseStyles.td}>{formatDateTime(l.created_at)}</td>
                  <td style={baseStyles.td}>
                    <span style={baseStyles.badge}>{l.channel}</span>
                  </td>
                  <td style={baseStyles.td} title={l.incoming_text}>
                    {l.incoming_text?.length > 50 ? l.incoming_text.substring(0, 50) + '...' : l.incoming_text}
                  </td>
                  <td style={baseStyles.td}>
                    <span style={{ 
                      fontSize: 12, 
                      padding: '2px 6px', 
                      borderRadius: 4, 
                      backgroundColor: l.final_decision?.includes('Chat') ? '#dbeafe' : 
                                      l.final_decision?.includes('FAQ') ? '#dcfce7' : '#fef2f2',
                      color: l.final_decision?.includes('Chat') ? '#1e40af' : 
                             l.final_decision?.includes('FAQ') ? '#166534' : '#dc2626'
                    }}>
                      {l.final_decision || 'Unknown'}
                    </span>
                  </td>
                  <td style={baseStyles.td}>
                    <span style={{ color: confidenceColor, fontWeight: 600 }}>
                      {confidence.toFixed(2)} ({confidenceCategory})
                    </span>
                  </td>
                  <td style={baseStyles.td}>
                    {l.conversation_memory?.hasHistory ? '💾' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
