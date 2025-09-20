// Utility functions
import { TZ } from './constants.js';

export function nowISO() { 
  return new Date().toISOString(); 
}

export function formatDateTime(dtStr) {
  try { 
    const dt = new Date(dtStr); 
    return new Intl.DateTimeFormat("zh-Hans", { 
      dateStyle: "medium", 
      timeStyle: "short", 
      timeZone: TZ 
    }).format(dt);
  } catch { 
    return dtStr; 
  }
}

export async function sha256Hex(text) {
  const enc = new TextEncoder(); 
  const data = enc.encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function uuid() { 
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { 
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); 
    return v.toString(16); 
  }); 
}

export const b64 = { 
  enc: s => btoa(unescape(encodeURIComponent(s || ""))), 
  dec: s => { 
    try { 
      return decodeURIComponent(escape(atob(s || ""))); 
    } catch { 
      return ""; 
    } 
  } 
};
