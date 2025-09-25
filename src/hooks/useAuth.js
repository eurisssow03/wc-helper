import { useEffect, useState } from "react";
import { STORAGE_KEYS, demoUserSeed, defaultSettings } from "../utils/constants.js";
import { sha256Hex, nowISO } from "../utils/helpers.js";
import { databaseConnectionService } from "../services/databaseConnectionService.js";
import { readLS, writeLS } from "../services/storage.js";

async function initOnce() {
  console.log('🔧 useAuth: Initializing default data...');
  
  if (!localStorage.getItem(STORAGE_KEYS.settings)) {
    writeLS(STORAGE_KEYS.settings, defaultSettings);
    console.log('✅ useAuth: Created default settings');
  }
  if (!localStorage.getItem(STORAGE_KEYS.homestays)) {
    writeLS(STORAGE_KEYS.homestays, []);
    console.log('✅ useAuth: Created empty homestays');
  }
  if (!localStorage.getItem(STORAGE_KEYS.faqs)) {
    writeLS(STORAGE_KEYS.faqs, []);
    console.log('✅ useAuth: Created empty FAQs');
  }
  if (!localStorage.getItem(STORAGE_KEYS.logs)) {
    writeLS(STORAGE_KEYS.logs, []);
    console.log('✅ useAuth: Created empty logs');
  }
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    console.log('👤 useAuth: Creating default admin user...');
    // Initialize with default admin user with SHA-256 hashed password
    const hashedPassword = await sha256Hex("Passw0rd!");
    console.log('🔑 useAuth: Hashed password:', hashedPassword);
    
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
    console.log('✅ useAuth: Created default admin user:', defaultUsers[0]);
  } else {
    console.log('👤 useAuth: Users already exist, checking...');
    const existingUsers = readLS(STORAGE_KEYS.users, []);
    console.log('👥 useAuth: Existing users:', existingUsers.length);
    if (existingUsers.length > 0) {
      console.log('👤 useAuth: First user:', existingUsers[0]);
    }
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
  const [dbStatus, setDbStatus] = useState('checking');
  
  // Initialize authentication with database connection check
  const initializeAuth = async () => {
    console.log('🔧 useAuth: Initializing authentication...');
    
    // Check database connection
    const dbCheck = await databaseConnectionService.checkConnection();
    setDbStatus(dbCheck.connected ? 'connected' : 'disconnected');
    
    if (dbCheck.connected) {
      console.log('✅ useAuth: Database connected, using database authentication');
      // Initialize with database
      await initOnce();
    } else {
      console.log('⚠️ useAuth: Database disconnected, using fallback authentication');
      // Initialize fallback data
      await databaseConnectionService.initializeFallbackData();
    }
    
    // Load users
    const arr = readLS(STORAGE_KEYS.users, []); 
    setUsers(arr);
  };
  
  useEffect(() => { 
    if (!users) { 
      const arr = readLS(STORAGE_KEYS.users, []); 
      setUsers(arr);
    } 
  }, []);

  const login = async (email, password) => {
    console.log('🔐 useAuth: Login attempt for:', email);
    console.log('🔌 useAuth: Database status:', dbStatus);
    
    // Check if we should use fallback authentication
    if (databaseConnectionService.shouldUseFallback()) {
      console.log('🔄 useAuth: Using fallback authentication');
      const result = await databaseConnectionService.authenticateFallback(email, password);
      
      if (result.success) {
        const sess = { 
          email: result.user.username, 
          role: result.user.role, 
          signedInAt: nowISO(),
          authMode: 'fallback'
        }; 
        writeLS(STORAGE_KEYS.session, sess); 
        setSession(sess); 
        return { ok: true }; 
      } else {
        return { ok: false, message: result.error || "Email or password is incorrect" };
      }
    }
    
    // Database authentication (if connected)
    const list = readLS(STORAGE_KEYS.users, []); 
    console.log('👥 useAuth: Available users:', list.length);
    
    const hash = await sha256Hex(password);
    console.log('🔑 useAuth: Password hash:', hash);
    
    const found = list.find(u => {
      const usernameMatch = u.username.toLowerCase() === email.toLowerCase();
      const passwordMatch = u.password === hash;
      const isActive = u.is_active;
      
      console.log('🔍 useAuth: Checking user:', u.username, {
        usernameMatch,
        passwordMatch,
        isActive,
        storedHash: u.password
      });
      
      return usernameMatch && passwordMatch && isActive;
    });
    
    if (found) { 
      console.log('✅ useAuth: Login successful for:', found.username);
      const sess = { 
        email: found.username, 
        role: found.role, 
        signedInAt: nowISO(),
        authMode: 'database'
      }; 
      writeLS(STORAGE_KEYS.session, sess); 
      setSession(sess); 
      return { ok: true }; 
    }
    
    console.log('❌ useAuth: Login failed - no matching user found');
    return { ok: false, message: "Email or password is incorrect" };
  };

  const logout = () => { 
    localStorage.removeItem(STORAGE_KEYS.session); 
    setSession(null); 
  };

  return { session, login, logout, users, setUsers, dbStatus };
}
