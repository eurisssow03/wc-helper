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

function initOnce() {
  if (!localStorage.getItem(STORAGE_KEYS.settings)) writeLS(STORAGE_KEYS.settings, defaultSettings);
  if (!localStorage.getItem(STORAGE_KEYS.homestays)) writeLS(STORAGE_KEYS.homestays, []);
  if (!localStorage.getItem(STORAGE_KEYS.faqs)) writeLS(STORAGE_KEYS.faqs, []);
  if (!localStorage.getItem(STORAGE_KEYS.logs)) writeLS(STORAGE_KEYS.logs, []);
}

export function useAuth() {
  const [session, setSession] = useState(() => readLS(STORAGE_KEYS.session, null));
  const [users, setUsers] = useState(() => readLS(STORAGE_KEYS.users, null));
  
  useEffect(() => { 
    initOnce(); 
  }, []);
  
  useEffect(() => { 
    (async () => { 
      if (!users) { 
        const arr = [...demoUserSeed]; 
        arr[0].password_hash = await sha256Hex("Passw0rd!"); 
        writeLS(STORAGE_KEYS.users, arr); 
        setUsers(arr);
      } 
    })(); 
  }, []);

  const login = async (email, password) => {
    const list = readLS(STORAGE_KEYS.users, []); 
    const hash = await sha256Hex(password);
    const found = list.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password_hash === hash);
    
    if (found) { 
      const sess = { 
        email: found.email, 
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
