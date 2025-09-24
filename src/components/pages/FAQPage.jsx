import React, { useState, useMemo } from 'react';
import { readLS, writeLS, STORAGE_KEYS } from '../../services/storage.js';
import { formatDateTime, nowISO, uuid } from '../../utils/helpers.js';
import { buildEmbedding } from '../../utils/embedding.js';
import { defaultSettings } from '../../utils/constants.js';
import { baseStyles } from '../../utils/styles.js';
import { Modal } from '../shared/Modal.jsx';
import { Field } from '../shared/Field.jsx';

export function FAQPage({ onSaved }) {
  const session = readLS(STORAGE_KEYS.session, { email: "", role: "" });
  const homestays = readLS(STORAGE_KEYS.homestays, []);
  const [query, setQuery] = useState("");
  const [list, setList] = useState(() => readLS(STORAGE_KEYS.faqs, []));
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase(); 
    if (!q) return list;
    return list.filter(f => [f.question, f.answer, (f.tags||[]).join(" ")].some(v => (v||"").toLowerCase().includes(q)));
  }, [query, list]);

  const suggestedTags = useMemo(() => {
    const counts = {}; 
    list.forEach(f => (f.tags||[]).forEach(t => { counts[t] = (counts[t]||0)+1; }));
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([t])=>t);
  }, [list]);

  const startAdd = () => setEditing({ 
    question: "", 
    answer: "", 
    tags: [], 
    related_homestay: "", 
    lang_hint: "", 
    embedding: [], 
    source_id: uuid(), 
    updated_by: session.email, 
    updated_at: nowISO(), 
    is_active: true, 
    __isNew: true 
  });
  
  const startEdit = (idx) => setEditing({ ...list[idx], __idx: idx });

  // Sync FAQ data with webhook server
  const syncWithWebhook = async (faqData) => {
    try {
      const webhookUrl = process.env.REACT_APP_WEBHOOK_URL || 'https://wc-helper.onrender.com';
      const response = await fetch(`${webhookUrl}/api/sync/faqs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ faqs: faqData })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ FAQs synced with webhook server:', result);
      } else {
        console.error('❌ Failed to sync FAQs with webhook server');
      }
    } catch (error) {
      console.error('❌ Error syncing FAQs with webhook server:', error);
    }
  };

  // Sync with webhook server when component loads
  React.useEffect(() => {
    if (list.length > 0) {
      syncWithWebhook(list);
    }
  }, []); // Only run once on mount

  const toggleActive = (idx) => {
    const next = [...list];
    next[idx] = { ...next[idx], is_active: !next[idx].is_active, updated_by: session.email, updated_at: nowISO() };
    setList(next);
    writeLS(STORAGE_KEYS.faqs, next);
    syncWithWebhook(next);
    onSaved?.();
  };

  const save = async () => {
    const errs = []; 
    if (!editing.question?.trim()) errs.push("Question is required"); 
    if (!editing.answer?.trim()) errs.push("Answer is required");
    if (errs.length) { 
      alert(errs.join("\n")); 
      return; 
    }
    
    const settings = readLS(STORAGE_KEYS.settings, defaultSettings);
    const mergedText = [editing.question, editing.answer, (editing.tags||[]).join(" "), editing.related_homestay||""].join("\n");
    const emb = await buildEmbedding(mergedText, settings);
    const payload = { ...editing, embedding: emb, updated_by: session.email, updated_at: nowISO() };
    const next = [...list];
    if (editing.__isNew) { 
      delete payload.__isNew; 
      delete payload.__idx; 
      next.push(payload); 
    } else if (typeof editing.__idx === "number") { 
      next[editing.__idx] = payload; 
    }
    setList(next);
    writeLS(STORAGE_KEYS.faqs, next);
    syncWithWebhook(next);
    setEditing(null);
    onSaved?.();
  };

  return (
    <div>
      <div style={baseStyles.card}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input 
            style={baseStyles.input} 
            placeholder="Search FAQs (question/answer/tags)" 
            value={query} 
            onChange={e=>setQuery(e.target.value)} 
          />
          <button style={baseStyles.btnPrimary} onClick={startAdd}>Add FAQ</button>
        </div>
      </div>

      <div style={baseStyles.card}>
        <table style={baseStyles.table}>
          <thead>
            <tr>
              <th style={baseStyles.th}>Question</th>
              <th style={baseStyles.th}>Status</th>
              <th style={baseStyles.th}>Tags</th>
              <th style={baseStyles.th}>Related Homestay</th>
              <th style={baseStyles.th}>Language</th>
              <th style={baseStyles.th}>Updated</th>
              <th style={baseStyles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, idx) => (
              <tr key={idx}>
                <td style={baseStyles.td}>{f.question}</td>
                <td style={baseStyles.td}>
                  {f.is_active? 
                    <span style={{...baseStyles.badge, background:'#dcfce7', color:'#166534'}}>Active</span> : 
                    <span style={{...baseStyles.badge, background:'#fee2e2', color:'#991b1b'}}>Inactive</span>
                  }
                </td>
                <td style={baseStyles.td}>
                  {(f.tags||[]).map((t,i)=> <span key={i} style={baseStyles.tag}>{t}</span>)}
                </td>
                <td style={baseStyles.td}>{f.related_homestay || "—"}</td>
                <td style={baseStyles.td}>{f.lang_hint || "—"}</td>
                <td style={baseStyles.td}>
                  {f.updated_by}
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {formatDateTime(f.updated_at)}
                  </div>
                </td>
                <td style={baseStyles.td}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      style={{
                        ...baseStyles.btnGhost,
                        backgroundColor: f.is_active ? '#dcfce7' : '#fee2e2',
                        color: f.is_active ? '#166534' : '#991b1b',
                        border: f.is_active ? '1px solid #16a34a' : '1px solid #dc2626',
                        fontSize: '0.8rem',
                        padding: '4px 8px'
                      }}
                      onClick={() => toggleActive(idx)}
                      title={f.is_active ? 'Click to disable' : 'Click to enable'}
                    >
                      {f.is_active ? '✓ Enabled' : '✗ Disabled'}
                    </button>
                    <button style={baseStyles.btnGhost} onClick={()=>startEdit(idx)}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={baseStyles.card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Suggested Tags: Common Keywords (based on existing tags)</div>
        {suggestedTags.length ? 
          suggestedTags.map((t,i)=> <span key={i} style={baseStyles.tag}>{t}</span>) : 
          <div style={{ color: '#64748b' }}>No suggestions yet. Create some FAQs first.</div>
        }
      </div>

      {editing && (
        <Modal title={editing.__isNew?"Add FAQ":"Edit FAQ"} onClose={()=>setEditing(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Question*">
              <textarea 
                style={{ ...baseStyles.input, height: 80 }} 
                value={editing.question} 
                onChange={e=>setEditing({ ...editing, question: e.target.value })} 
                placeholder="e.g.: How to check in?"
              />
            </Field>
            <Field label="Answer*">
              <textarea 
                style={{ ...baseStyles.input, height: 120 }} 
                value={editing.answer} 
                onChange={e=>setEditing({ ...editing, answer: e.target.value })} 
                placeholder="Clear steps or instructions"
              />
            </Field>
            <Field label="Tags (multiple, comma-separated)">
              <input 
                style={baseStyles.input} 
                value={editing.tags?.join(", ")||""} 
                onChange={e=>setEditing({ ...editing, tags: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })} 
                placeholder="e.g.: check-in, parking, Wi‑Fi" 
              />
            </Field>
            <Field label="Related Homestay (optional)">
              <select 
                style={baseStyles.select} 
                value={editing.related_homestay||""} 
                onChange={e=>setEditing({ ...editing, related_homestay: e.target.value })}
              >
                <option value="">No relation</option>
                {homestays.map((h,i)=> <option key={i} value={h.name}>{h.name}</option>)}
              </select>
            </Field>
            <Field label="Language Hint (optional)">
              <input 
                style={baseStyles.input} 
                value={editing.lang_hint||""} 
                onChange={e=>setEditing({ ...editing, lang_hint: e.target.value })} 
                placeholder="e.g.: zh / en" 
              />
            </Field>
            <Field label="Enable">
              <select 
                style={baseStyles.select} 
                value={editing.is_active?"1":"0"} 
                onChange={e=>setEditing({ ...editing, is_active: e.target.value==="1" })}
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button style={baseStyles.btnGhost} onClick={()=>setEditing(null)}>Cancel</button>
            <button style={baseStyles.btnPrimary} onClick={save}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
