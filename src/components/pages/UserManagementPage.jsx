import React, { useState, useMemo, useEffect } from 'react';
import { readLS, writeLS, STORAGE_KEYS } from '../../services/storage.js';
import { formatDateTime, nowISO, uuid, sha256Hex } from '../../utils/helpers.js';
import { baseStyles } from '../../utils/styles.js';
import { Modal } from '../shared/Modal.jsx';
import { Field } from '../shared/Field.jsx';

export function UserManagementPage({ onSaved }) {
  const session = readLS(STORAGE_KEYS.session, { email: "", role: "" });
  const [query, setQuery] = useState("");
  const [list, setList] = useState(() => {
    const users = readLS(STORAGE_KEYS.users, []);
    return users;
  });

  // Initialize default admin user if no users exist
  useEffect(() => {
    const users = readLS(STORAGE_KEYS.users, []);
    if (users.length === 0) {
      // Create default user with SHA-256 hashed password
      sha256Hex("Passw0rd!").then(hashedPassword => {
        const defaultUsers = [
          {
            id: uuid(),
            username: "admin@demo.com",
            password: hashedPassword,
            role: "admin",
            is_active: true,
            created_by: "system",
            created_at: nowISO(),
            updated_by: "system",
            updated_at: nowISO()
          }
        ];
        writeLS(STORAGE_KEYS.users, defaultUsers);
        setList(defaultUsers);
      });
    }
  }, []);
  const [editing, setEditing] = useState(null);
  const [showPassword, setShowPassword] = useState({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(user => 
      user.username.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q) ||
      (user.is_active ? 'active' : 'inactive').includes(q)
    );
  }, [query, list]);

  const startAdd = () => setEditing({
    username: "",
    password: "",
    role: "user",
    is_active: true,
    id: uuid(),
    created_by: session.email,
    created_at: nowISO(),
    updated_by: session.email,
    updated_at: nowISO(),
    __isNew: true
  });

  const startEdit = (idx) => setEditing({ 
    ...list[idx], 
    __idx: idx,
    password: "" // Don't show existing password
  });

  const togglePasswordVisibility = (userId) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const save = async () => {
    const errs = [];
    if (!editing.username?.trim()) errs.push("Username is required");
    if (!editing.password?.trim()) errs.push("Password is required");
    if (editing.password && editing.password.length < 6) errs.push("Password must be at least 6 characters");
    
    // Check for duplicate username
    const existingUser = list.find(user => 
      user.username.toLowerCase() === editing.username.toLowerCase() && 
      user.id !== editing.id
    );
    if (existingUser) errs.push("Username already exists");
    
    if (errs.length) {
      alert(errs.join("\n"));
      return;
    }

    // Hash password using SHA-256
    const hashedPassword = await sha256Hex(editing.password);
    const payload = {
      ...editing,
      password: hashedPassword,
      updated_by: session.email,
      updated_at: nowISO()
    };

    const next = [...list];
    if (editing.__isNew) {
      delete payload.__isNew;
      delete payload.__idx;
      next.push(payload);
    } else if (typeof editing.__idx === "number") {
      next[editing.__idx] = payload;
    }

    setList(next);
    writeLS(STORAGE_KEYS.users, next);
    setEditing(null);
    onSaved?.();
  };

  const deleteUser = (idx) => {
    const user = list[idx];
    if (user.username === session.email) {
      alert("You cannot delete your own account");
      return;
    }
    
    if (confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      const next = list.filter((_, i) => i !== idx);
      setList(next);
      writeLS(STORAGE_KEYS.users, next);
      onSaved?.();
    }
  };

  const toggleActive = (idx) => {
    const user = list[idx];
    if (user.username === session.email) {
      alert("You cannot disable your own account");
      return;
    }
    
    const next = [...list];
    next[idx] = { 
      ...next[idx], 
      is_active: !next[idx].is_active, 
      updated_by: session.email, 
      updated_at: nowISO() 
    };
    setList(next);
    writeLS(STORAGE_KEYS.users, next);
    onSaved?.();
  };

  return (
    <div>
      <div style={baseStyles.card}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "1rem" }}>
          <input 
            style={baseStyles.input} 
            placeholder="Search users (username, role, status)" 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
          />
          <button style={baseStyles.btnPrimary} onClick={startAdd}>Add User</button>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div style={baseStyles.card}>
            <div style={{ fontSize: "0.9rem", color: "#6c757d", marginBottom: "0.5rem" }}>Total Users</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{list.length}</div>
          </div>
          <div style={baseStyles.card}>
            <div style={{ fontSize: "0.9rem", color: "#6c757d", marginBottom: "0.5rem" }}>Active Users</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "#28a745" }}>
              {list.filter(u => u.is_active).length}
            </div>
          </div>
          <div style={baseStyles.card}>
            <div style={{ fontSize: "0.9rem", color: "#6c757d", marginBottom: "0.5rem" }}>Admins</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "#007bff" }}>
              {list.filter(u => u.role === "admin").length}
            </div>
          </div>
        </div>
      </div>

      <div style={baseStyles.card}>
        <table style={baseStyles.table}>
          <thead>
            <tr>
              <th style={baseStyles.th}>Username</th>
              <th style={baseStyles.th}>Role</th>
              <th style={baseStyles.th}>Status</th>
              <th style={baseStyles.th}>Created</th>
              <th style={baseStyles.th}>Last Updated</th>
              <th style={baseStyles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, idx) => (
              <tr key={user.id}>
                <td style={baseStyles.td}>
                  <div style={{ fontWeight: 600 }}>{user.username}</div>
                  {user.username === session.email && (
                    <div style={{ fontSize: "0.8rem", color: "#007bff" }}>(You)</div>
                  )}
                </td>
                <td style={baseStyles.td}>
                  <span style={{
                    ...baseStyles.badge,
                    backgroundColor: user.role === "admin" ? "#e3f2fd" : "#f3e5f5",
                    color: user.role === "admin" ? "#1976d2" : "#7b1fa2"
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={baseStyles.td}>
                  {user.is_active ? 
                    <span style={{...baseStyles.badge, background:'#dcfce7', color:'#166534'}}>Active</span> : 
                    <span style={{...baseStyles.badge, background:'#fee2e2', color:'#991b1b'}}>Inactive</span>
                  }
                </td>
                <td style={baseStyles.td}>
                  <div style={{ fontSize: "0.9rem" }}>{user.created_by}</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    {formatDateTime(user.created_at)}
                  </div>
                </td>
                <td style={baseStyles.td}>
                  <div style={{ fontSize: "0.9rem" }}>{user.updated_by}</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    {formatDateTime(user.updated_at)}
                  </div>
                </td>
                <td style={baseStyles.td}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button 
                      style={{
                        ...baseStyles.btnGhost,
                        backgroundColor: user.is_active ? '#dcfce7' : '#fee2e2',
                        color: user.is_active ? '#166534' : '#991b1b',
                        border: user.is_active ? '1px solid #16a34a' : '1px solid #dc2626',
                        fontSize: '0.8rem',
                        padding: '4px 8px'
                      }}
                      onClick={() => toggleActive(idx)}
                      disabled={user.username === session.email}
                      title={user.username === session.email ? 'Cannot disable your own account' : (user.is_active ? 'Click to disable' : 'Click to enable')}
                    >
                      {user.is_active ? '✓ Active' : '✗ Inactive'}
                    </button>
                    <button 
                      style={baseStyles.btnGhost} 
                      onClick={() => startEdit(idx)}
                    >
                      Edit
                    </button>
                    <button 
                      style={{
                        ...baseStyles.btnGhost,
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #dc2626'
                      }}
                      onClick={() => deleteUser(idx)}
                      disabled={user.username === session.email}
                      title={user.username === session.email ? 'Cannot delete your own account' : 'Delete user'}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.__isNew ? "Add User" : "Edit User"} onClose={() => setEditing(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Username (Email)*">
              <input 
                style={baseStyles.input} 
                type="email"
                value={editing.username} 
                onChange={e => setEditing({ ...editing, username: e.target.value })} 
                placeholder="user@example.com"
              />
            </Field>
            <Field label="Password*">
              <div style={{ position: 'relative' }}>
                <input 
                  style={baseStyles.input} 
                  type={showPassword[editing.id] ? "text" : "password"}
                  value={editing.password} 
                  onChange={e => setEditing({ ...editing, password: e.target.value })} 
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: '#6c757d'
                  }}
                  onClick={() => togglePasswordVisibility(editing.id)}
                >
                  {showPassword[editing.id] ? '🙈' : '👁️'}
                </button>
              </div>
            </Field>
            <Field label="Role*">
              <select 
                style={baseStyles.select} 
                value={editing.role} 
                onChange={e => setEditing({ ...editing, role: e.target.value })}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Status">
              <select 
                style={baseStyles.select} 
                value={editing.is_active ? "1" : "0"} 
                onChange={e => setEditing({ ...editing, is_active: e.target.value === "1" })}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button style={baseStyles.btnGhost} onClick={() => setEditing(null)}>Cancel</button>
            <button style={baseStyles.btnPrimary} onClick={save}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
