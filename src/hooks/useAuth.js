import { useEffect, useState } from "react";
import { STORAGE_KEYS, demoUserSeed, defaultSettings } from "../utils/constants.js";
import { sha256Hex, nowISO } from "../utils/helpers.js";

// Data layer functions
function readLS(key, fallback) { 
  try { 
    const txt = localStorage.getItem(key); 
    return txt ? JSON.parse(txt) : structuredClone(fallback);
  } catch { 
    return structuredClone(fallback);
  } 
}

function writeLS(key, value) { 
  localStorage.setItem(key, JSON.stringify(value)); 
}

async function initOnce() {
  if (!localStorage.getItem(STORAGE_KEYS.settings)) writeLS(STORAGE_KEYS.settings, defaultSettings);
  if (!localStorage.getItem(STORAGE_KEYS.homestays)) writeLS(STORAGE_KEYS.homestays, []);
  if (!localStorage.getItem(STORAGE_KEYS.faqs)) writeLS(STORAGE_KEYS.faqs, []);
  if (!localStorage.getItem(STORAGE_KEYS.logs)) writeLS(STORAGE_KEYS.logs, []);
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    // Initialize with default admin user with SHA-256 hashed password
    const hashedPassword = await sha256Hex("Passw0rd!");
    const defaultUsers = [
      {
        id: "admin-001",
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
  }
}

export function useAuth() {
  const [session, setSession] = useState(() => {
    const storedSession = readLS(STORAGE_KEYS.session, null);
    console.log('🔍 useAuth: Initial session from localStorage:', storedSession);
    
    // Validate session - if it exists but is invalid, clear it
    if (storedSession) {
      const isValidSession = storedSession.email && storedSession.role && storedSession.signedInAt;
      if (!isValidSession) {
        console.log('🔍 useAuth: Invalid session detected, clearing...');
        localStorage.removeItem(STORAGE_KEYS.session);
        return null;
      }
    }
    
    return storedSession;
  });
  const [users, setUsers] = useState(() => readLS(STORAGE_KEYS.users, null));
  
  useEffect(() => { 
    initOnce(); 
  }, []);
  
  useEffect(() => { 
    if (!users) { 
      const arr = readLS(STORAGE_KEYS.users, []); 
      setUsers(arr);
    } 
  }, []);

  const login = async (email, password) => {
    const list = readLS(STORAGE_KEYS.users, []); 
    const hash = await sha256Hex(password);
    const found = list.find(u => 
      u.username.toLowerCase() === email.toLowerCase() && 
      u.password === hash && 
      u.is_active
    );
    
    if (found) { 
      const sess = { 
        email: found.username, 
        role: found.role, 
        signedInAt: nowISO() 
      }; 
      writeLS(STORAGE_KEYS.session, sess); 
      setSession(sess); 
      return { ok: true }; 
    }
    return { ok: false, message: "Email or password is incorrect" };
  };

  const logout = () => { 
    localStorage.removeItem(STORAGE_KEYS.session); 
    setSession(null); 
  };

  return { session, login, logout };
}
