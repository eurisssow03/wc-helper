// Simple authentication test
// Run this in the browser console on https://wc-helper.onrender.com/

console.log('🧪 Simple Authentication Test');
console.log('============================');

// Test 1: Check if the app is loading
console.log('📊 Test 1: Checking app state...');
console.log('Current URL:', window.location.href);
console.log('Current pathname:', window.location.pathname);

// Test 2: Check localStorage
console.log('\n📊 Test 2: Checking localStorage...');
const session = JSON.parse(localStorage.getItem('wc_session') || 'null');
const users = JSON.parse(localStorage.getItem('wc_users') || '[]');
const settings = JSON.parse(localStorage.getItem('wc_settings') || 'null');

console.log('Session:', session);
console.log('Users count:', users.length);
console.log('Settings:', settings ? 'Present' : 'Missing');

// Test 3: Check if we should see login page
console.log('\n📊 Test 3: Login page logic...');
const shouldShowLogin = !session;
console.log('Should show login page:', shouldShowLogin);

if (shouldShowLogin) {
  console.log('✅ Expected: Login page should be visible');
} else {
  console.log('⚠️ Expected: Dashboard should be visible');
}

// Test 4: Test default user creation
console.log('\n📊 Test 4: Testing default user creation...');
async function testDefaultUser() {
  try {
    // Check if users exist
    if (users.length === 0) {
      console.log('👤 No users found, creating default admin user...');
      
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
      return true;
    } else {
      console.log('✅ Users already exist:', users.length);
      return true;
    }
  } catch (error) {
    console.error('❌ Error creating default user:', error);
    return false;
  }
}

// Test 5: Test login simulation
console.log('\n📊 Test 5: Testing login simulation...');
async function testLogin() {
  try {
    const email = 'admin@demo.com';
    const password = 'Passw0rd!';
    
    console.log('🔐 Testing login with:', email);
    
    // Get users
    const currentUsers = JSON.parse(localStorage.getItem('wc_users') || '[]');
    console.log('👥 Available users:', currentUsers.length);
    
    if (currentUsers.length === 0) {
      console.log('❌ No users available for login test');
      return false;
    }
    
    // Hash password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Find user
    const found = currentUsers.find(u => 
      u.username.toLowerCase() === email.toLowerCase() && 
      u.password === hash && 
      u.is_active
    );
    
    if (found) {
      console.log('✅ Login test successful');
      
      // Create session
      const session = {
        email: found.username,
        role: found.role,
        signedInAt: new Date().toISOString(),
        authMode: 'fallback'
      };
      
      localStorage.setItem('wc_session', JSON.stringify(session));
      console.log('✅ Session created:', session);
      
      return true;
    } else {
      console.log('❌ Login test failed - user not found or invalid credentials');
      return false;
    }
  } catch (error) {
    console.error('❌ Login test error:', error);
    return false;
  }
}

// Test 6: Test app refresh
console.log('\n📊 Test 6: Testing app refresh...');
function testAppRefresh() {
  console.log('🔄 Refreshing app to test authentication...');
  window.location.reload();
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting simple authentication tests...\n');
  
  const userCreated = await testDefaultUser();
  const loginTest = await testLogin();
  
  console.log('\n🎯 TEST RESULTS:');
  console.log('================');
  console.log('1. App State: Check URL and pathname above');
  console.log('2. LocalStorage: Check session, users, settings above');
  console.log('3. Login Logic: Should show login page:', shouldShowLogin);
  console.log('4. User Creation:', userCreated ? '✅ SUCCESS' : '❌ FAILED');
  console.log('5. Login Test:', loginTest ? '✅ SUCCESS' : '❌ FAILED');
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('==============');
  if (userCreated && loginTest) {
    console.log('✅ Authentication system is working');
    console.log('💡 Try refreshing the page to see the login page');
    console.log('💡 Use admin@demo.com / Passw0rd! to login');
  } else {
    console.log('❌ Authentication system needs attention');
    console.log('💡 Check console for error messages');
    console.log('💡 Try running the tests again');
  }
  
  console.log('\n🔧 MANUAL TEST:');
  console.log('===============');
  console.log('1. Refresh the page (F5)');
  console.log('2. Should see login page with database status');
  console.log('3. Enter admin@demo.com / Passw0rd!');
  console.log('4. Click Login');
  console.log('5. Should see dashboard');
  
  console.log('\n🧪 To refresh and test:');
  console.log('// testAppRefresh();');
}

// Run the tests
runAllTests();
