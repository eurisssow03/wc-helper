import React, { useState, useMemo } from 'react';
import { readLS, writeLS, STORAGE_KEYS } from '../../services/storage.js';
import { formatDateTime, nowISO } from '../../utils/helpers.js';
import { baseStyles } from '../../utils/styles.js';
import { Modal } from '../shared/Modal.jsx';
import { Field } from '../shared/Field.jsx';

export function HomestayData({ onSaved }) {
  const session = readLS(STORAGE_KEYS.session, { email: "" });
  const [query, setQuery] = useState("");
  const [list, setList] = useState(() => readLS(STORAGE_KEYS.homestays, []));
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase(); 
    if (!q) return list;
    return list.filter(h => [h.name, h.city, h.address].some(v => (v || "").toLowerCase().includes(q)));
  }, [query, list]);

  const recent = useMemo(() => 
    [...list].sort((a,b)=> (b.updated_at||"").localeCompare(a.updated_at||"" )).slice(0,5), 
    [list]
  );

  const startAdd = () => setEditing({ 
    name: "", 
    city: "", 
    address: "", 
    phone: "", 
    checkin_time: "15:00", 
    checkout_time: "12:00", 
    amenities: [], 
    notes: "", 
    updated_by: session.email, 
    updated_at: nowISO(), 
    __isNew: true 
  });
  
  const startEdit = (idx) => { 
    setEditing({ ...list[idx], __idx: idx }); 
  };

  const save = () => {
    const errs = [];
    if (!editing.name?.trim()) errs.push("Homestay name is required");
    if (!editing.city?.trim()) errs.push("City is required");
    if (!editing.checkin_time) errs.push("Check-in time is required");
    if (!editing.checkout_time) errs.push("Check-out time is required");
    if (errs.length) { 
      alert(errs.join("\n")); 
      return; 
    }
    
    const payload = { ...editing, updated_by: session.email, updated_at: nowISO() };
    const next = [...list];
    if (editing.__isNew) { 
      delete payload.__isNew; 
      delete payload.__idx; 
      next.push(payload); 
    } else if (typeof editing.__idx === "number") { 
      next[editing.__idx] = payload; 
    }
    setList(next); 
    writeLS(STORAGE_KEYS.homestays, next); 
    setEditing(null); 
    onSaved?.();
  };

  return (
    <div>
      <div style={baseStyles.card}>
        <div className="flex-row">
          <input 
            style={baseStyles.input} 
            placeholder="Search homestays (name/city/address)" 
            value={query} 
            onChange={e=>setQuery(e.target.value)} 
          />
          <button style={baseStyles.btnPrimary} onClick={startAdd}>Add Homestay</button>
        </div>
      </div>

      <div style={baseStyles.card}>
        <table style={baseStyles.table}>
          <thead>
            <tr>
              <th style={baseStyles.th}>Name</th>
              <th style={baseStyles.th}>City</th>
              <th style={baseStyles.th}>Phone</th>
              <th style={baseStyles.th}>Check-in/out</th>
              <th style={baseStyles.th}>Last Updated</th>
              <th style={baseStyles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h, idx) => (
              <tr key={idx}>
                <td style={baseStyles.td}>{h.name}</td>
                <td style={baseStyles.td}>{h.city}</td>
                <td style={baseStyles.td}>{h.phone || "—"}</td>
                <td style={baseStyles.td}>{h.checkin_time} / {h.checkout_time}</td>
                <td style={baseStyles.td}>
                  {h.updated_by || ""}
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {h.updated_at?formatDateTime(h.updated_at):""}
                  </div>
                </td>
                <td style={baseStyles.td}>
                  <button style={baseStyles.btnGhost} onClick={()=>startEdit(idx)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={baseStyles.card}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Recently Edited</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {recent.map((h, i)=> (
            <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, minWidth: 220 }}>
              <div style={{ fontWeight: 600 }}>{h.name}</div>
              <div style={{ fontSize: 12, color: "#475569" }}>{h.city}</div>
              <div style={{ fontSize: 12, color: "#475569" }}>Updated: {formatDateTime(h.updated_at)}</div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <Modal title={editing.__isNew?"Add Homestay":"Edit Homestay"} onClose={()=>setEditing(null)}>
          <div className="form-grid">
            <Field label="Name*">
              <input 
                style={baseStyles.input} 
                value={editing.name} 
                onChange={e=>setEditing({ ...editing, name: e.target.value })} 
                placeholder="e.g.: Trefoil Setia City" 
              />
            </Field>
            <Field label="City*">
              <input 
                style={baseStyles.input} 
                value={editing.city} 
                onChange={e=>setEditing({ ...editing, city: e.target.value })} 
                placeholder="e.g.: Shah Alam" 
              />
            </Field>
            <Field label="Address">
              <input 
                style={baseStyles.input} 
                value={editing.address} 
                onChange={e=>setEditing({ ...editing, address: e.target.value })} 
                placeholder="Detailed address" 
              />
            </Field>
            <Field label="Phone">
              <input 
                style={baseStyles.input} 
                value={editing.phone} 
                onChange={e=>setEditing({ ...editing, phone: e.target.value })} 
                placeholder="e.g.: 03-xxxx xxxx" 
              />
            </Field>
            <Field label="Check-in Time*">
              <input 
                style={baseStyles.input} 
                type="time" 
                value={editing.checkin_time} 
                onChange={e=>setEditing({ ...editing, checkin_time: e.target.value })} 
              />
            </Field>
            <Field label="Check-out Time*">
              <input 
                style={baseStyles.input} 
                type="time" 
                value={editing.checkout_time} 
                onChange={e=>setEditing({ ...editing, checkout_time: e.target.value })} 
              />
            </Field>
            <Field label="Amenities (multiple, comma-separated)">
              <input 
                style={baseStyles.input} 
                value={editing.amenities?.join(", ")||""} 
                onChange={e=>setEditing({ ...editing, amenities: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })} 
                placeholder="e.g.: Parking, Wi‑Fi, Swimming Pool" 
              />
            </Field>
            <Field label="Notes">
              <textarea 
                style={{ ...baseStyles.input, height: 80 }} 
                value={editing.notes} 
                onChange={e=>setEditing({ ...editing, notes: e.target.value })} 
                placeholder="Special instructions"
              />
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
