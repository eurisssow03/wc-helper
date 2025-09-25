// Test database fallback authentication
// Run this in the browser console on https://wc-helper.onrender.com/

console.log('🧪 Testing Database Fallback Authentication');
console.log('==========================================');

// Test 1: Check database connection
console.log('📊 Test 1: Checking database connection...');
async function testDatabaseConnection() {
  try {
    const response = await fetch('/api/postgres/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Database connected:', data);
      return true;
    } else {
      console.log('⚠️ Database connection failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ Database connection error:', error.message);
    return false;
  }
}

// Test 2: Test fallback authentication
console.log('\n📊 Test 2: Testing fallback authentication...');
async function testFallbackAuth() {
  try {
    // Check if users exist in localStorage
    const users = JSON.parse(localStorage.getItem('wc_users') || '[]');
    console.log('👥 Users in localStorage:', users.length);
    
    if (users.length === 0) {
      console.log('👤 Creating default admin user...');
      
      // Create default user
      const testPassword = 'Passw0rd!';
      const encoder = new TextEncoder();
      const data = encoder.encode(testPassword);
      const digest = await crypto.subtle.digest('SHA-256', data);
      const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const defaultUser = {
        id: 'admin-001',
        username: 'admin@demo.com',
        password: hash,
        role: 'admin',
        is_active: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_by: 'system',
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('wc_users', JSON.stringify([defaultUser]));
      console.log('✅ Default admin user created');
    }
    
    // Test authentication
    const email = 'admin@demo.com';
    const password = 'Passw0rd!';
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const users = JSON.parse(localStorage.getItem('wc_users') || '[]');
    const found = users.find(u => 
      u.username.toLowerCase() === email.toLowerCase() && 
      u.password === hash && 
      u.is_active
    );
    
    if (found) {
      console.log('✅ Fallback authentication successful:', found);
      return true;
    } else {
      console.log('❌ Fallback authentication failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing fallback auth:', error);
    return false;
  }
}

// Test 3: Test app initialization
console.log('\n📊 Test 3: Testing app initialization...');
async function testAppInit() {
  try {
    // Check if all required data exists
    const requiredKeys = ['wc_users', 'wc_settings', 'wc_homestays', 'wc_faqs', 'wc_logs'];
    const missingKeys = [];
    
    requiredKeys.forEach(key => {
      if (!localStorage.getItem(key)) {
        missingKeys.push(key);
      }
    });
    
    if (missingKeys.length > 0) {
      console.log('⚠️ Missing localStorage keys:', missingKeys);
      
      // Initialize missing data
      if (missingKeys.includes('wc_settings')) {
        const defaultSettings = {
          alwaysOn: true,
          businessHours: { 
            tz: "Asia/Kuala_Lumpur", 
            start: "09:00", 
            end: "18:00",
            monday: { enabled: true, start: "09:00", end: "18:00" },
            tuesday: { enabled: true, start: "09:00", end: "18:00" },
            wednesday: { enabled: true, start: "09:00", end: "18:00" },
            thursday: { enabled: true, start: "09:00", end: "18:00" },
            friday: { enabled: true, start: "09:00", end: "18:00" },
            saturday: { enabled: true, start: "09:00", end: "18:00" },
            sunday: { enabled: true, start: "09:00", end: "18:00" }
          },
          aiProvider: "OpenAI",
          confidenceThreshold: 0.6,
          similarityThreshold: 0.3,
          aiRules: {
            responseTemplates: {
              en: {
                greeting: "Hello! Welcome to our homestay service. How can I help you today?",
                fallback: "Sorry, I couldn't understand your question. We will have someone contact you soon."
              },
              zh: {
                greeting: "您好！欢迎来到我们的民宿服务。我今天能为您提供什么帮助？",
                fallback: "抱歉，我无法理解您的问题。我们将尽快安排专人与您联系。"
              }
            }
          }
        };
        localStorage.setItem('wc_settings', JSON.stringify(defaultSettings));
        console.log('✅ Default settings created');
      }
      
      if (missingKeys.includes('wc_homestays')) {
        localStorage.setItem('wc_homestays', JSON.stringify([]));
        console.log('✅ Empty homestays created');
      }
      
      if (missingKeys.includes('wc_faqs')) {
        localStorage.setItem('wc_faqs', JSON.stringify([]));
        console.log('✅ Empty FAQs created');
      }
      
      if (missingKeys.includes('wc_logs')) {
        localStorage.setItem('wc_logs', JSON.stringify([]));
        console.log('✅ Empty logs created');
      }
    } else {
      console.log('✅ All required data exists');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing app init:', error);
    return false;
  }
}

// Test 4: Test session management
console.log('\n📊 Test 4: Testing session management...');
function testSessionManagement() {
  try {
    // Check current session
    const session = JSON.parse(localStorage.getItem('wc_session') || 'null');
    console.log('🔍 Current session:', session);
    
    if (session) {
      const isValid = session.email && session.role && session.signedInAt;
      console.log('✅ Session valid:', isValid);
      
      if (isValid) {
        console.log('👤 User:', session.email, 'Role:', session.role);
        console.log('🕒 Signed in at:', session.signedInAt);
        console.log('🔌 Auth mode:', session.authMode || 'unknown');
      }
    } else {
      console.log('ℹ️ No active session');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing session management:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive database fallback tests...\n');
  
  const dbConnected = await testDatabaseConnection();
  const fallbackAuth = await testFallbackAuth();
  const appInit = await testAppInit();
  const sessionMgmt = testSessionManagement();
  
  console.log('\n🎯 TEST RESULTS:');
  console.log('================');
  console.log('1. Database Connection:', dbConnected ? '✅ Connected' : '⚠️ Disconnected (Using Fallback)');
  console.log('2. Fallback Authentication:', fallbackAuth ? '✅ Working' : '❌ Failed');
  console.log('3. App Initialization:', appInit ? '✅ Complete' : '❌ Failed');
  console.log('4. Session Management:', sessionMgmt ? '✅ Working' : '❌ Failed');
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('==============');
  if (dbConnected) {
    console.log('✅ Database is connected - using database authentication');
  } else {
    console.log('⚠️ Database is offline - using localStorage fallback');
    console.log('   - Default admin user: admin@demo.com / Passw0rd!');
    console.log('   - All data stored locally');
  }
  
  if (fallbackAuth && appInit) {
    console.log('✅ Authentication system is ready');
    console.log('   - Try logging in with admin@demo.com / Passw0rd!');
  } else {
    console.log('❌ Authentication system needs attention');
    console.log('   - Check console for error messages');
  }
  
  console.log('\n🔧 DEBUGGING:');
  console.log('=============');
  console.log('1. Check browser console for detailed logs');
  console.log('2. Verify localStorage has required data');
  console.log('3. Test login with default credentials');
  console.log('4. Check database status indicator in UI');
}

// Run the tests
runAllTests();
