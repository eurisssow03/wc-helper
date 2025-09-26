import { useEffect, useState } from "react";
import { STORAGE_KEYS, demoUserSeed, defaultSettings } from "../utils/constants.js";
import { sha256Hex, nowISO } from "../utils/helpers.js";
import { databaseConnectionService } from "../services/databaseConnectionService.js";
import { readLS, writeLS, initOnce } from "../services/storage.js";

async function initUsers() {
  console.log('👤 useAuth: Initializing users...');
  
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
    
    try {
      // Initialize basic data first
      await initOnce();
      console.log('✅ useAuth: Basic data initialized');
      
      // Force database status to disconnected for now
      console.log('🔍 useAuth: Setting database status to disconnected (no database configured)');
      setDbStatus('disconnected');
      console.log('🔌 useAuth: Database status set to: disconnected');
      
      // Always use fallback authentication for now
      console.log('⚠️ useAuth: Using fallback authentication (no database configured)');
      await databaseConnectionService.initializeFallbackData();
      console.log('✅ useAuth: Fallback data initialized');
      
      // Initialize users
      await initUsers();
      console.log('✅ useAuth: Users initialized');
      
      // Load users
      const arr = readLS(STORAGE_KEYS.users, []); 
      setUsers(arr);
      console.log('👥 useAuth: Loaded users:', arr.length);
      
    } catch (error) {
      console.error('❌ useAuth: Error during initialization:', error);
      // Set fallback mode on error
      setDbStatus('disconnected');
      await databaseConnectionService.initializeFallbackData();
      await initUsers();
      const arr = readLS(STORAGE_KEYS.users, []); 
      setUsers(arr);
    }
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
    
    // Always use fallback authentication for now (no database configured)
    console.log('🔄 useAuth: Using fallback authentication (no database configured)');
    const result = await databaseConnectionService.authenticateFallback(email, password);
    
    if (result.success) {
      console.log('✅ useAuth: Fallback authentication successful');
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
      console.log('❌ useAuth: Fallback authentication failed:', result.error);
      return { ok: false, message: result.error || "Email or password is incorrect" };
    }
  };

  const logout = () => { 
    localStorage.removeItem(STORAGE_KEYS.session); 
    setSession(null); 
  };

  // Manual database connection test (for debugging)
  const testDatabaseConnection = async () => {
    console.log('🧪 useAuth: Manual database connection test...');
    const result = await databaseConnectionService.checkConnection();
    console.log('📊 useAuth: Manual test result:', result);
    setDbStatus(result.connected ? 'connected' : 'disconnected');
    return result;
  };
  
  // Make test function available globally for debugging
  window.testDatabaseConnection = testDatabaseConnection;
  window.databaseConnectionService = databaseConnectionService;

  return { session, login, logout, users, setUsers, dbStatus, testDatabaseConnection };
}
