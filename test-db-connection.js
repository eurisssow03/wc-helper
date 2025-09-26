// Test database connection detection
// Run this in the browser console on https://wc-helper.onrender.com/

console.log('🧪 Testing Database Connection Detection');
console.log('=====================================');

// Test 1: Test individual endpoints
console.log('📊 Test 1: Testing individual endpoints...');
async function testEndpoints() {
  const endpoints = [
    '/api/postgres/health',
    'https://wc-helper.onrender.com/api/postgres/health',
    'http://localhost:3001/api/postgres/health'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Testing: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      });
      
      console.log(`📊 Response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success:`, data);
        
        if (data.success && data.message && data.message.includes('successful')) {
          console.log('🎯 Database connection confirmed!');
        } else {
          console.log('⚠️ Response indicates database is not connected');
        }
      } else {
        console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('---');
  }
}

// Test 2: Test database connection service
console.log('\n📊 Test 2: Testing database connection service...');
async function testDatabaseService() {
  try {
    // Import the service (this might not work in console, but let's try)
    console.log('🔍 Testing database connection service...');
    
    // Simulate the service logic
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000);
    });
    
    const fetchPromise = fetch('/api/postgres/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Response data:', data);
      
      if (data.success && data.message && data.message.includes('successful')) {
        console.log('✅ Database service reports: CONNECTED');
        return { connected: true, data };
      } else {
        console.log('⚠️ Database service reports: DISCONNECTED (invalid response)');
        return { connected: false, error: 'Invalid response' };
      }
    } else {
      console.log('❌ Database service reports: DISCONNECTED (HTTP error)');
      return { connected: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('❌ Database service reports: DISCONNECTED (error)');
    console.log('Error details:', error.message);
    return { connected: false, error: error.message };
  }
}

// Test 3: Test fallback mode
console.log('\n📊 Test 3: Testing fallback mode...');
function testFallbackMode() {
  console.log('🔍 Checking if fallback mode should be active...');
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.log('❌ Not in browser environment');
    return false;
  }
  
  console.log('✅ In browser environment');
  
  // Check if localStorage is available
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    console.log('✅ localStorage is available');
  } catch (error) {
    console.log('❌ localStorage is not available:', error.message);
    return false;
  }
  
  // Check if we have users in localStorage
  const users = JSON.parse(localStorage.getItem('wc_users') || '[]');
  console.log(`👥 Users in localStorage: ${users.length}`);
  
  if (users.length > 0) {
    console.log('✅ Fallback data available');
    return true;
  } else {
    console.log('⚠️ No fallback data available');
    return false;
  }
}

// Test 4: Test the actual app behavior
console.log('\n📊 Test 4: Testing app behavior...');
function testAppBehavior() {
  console.log('🔍 Checking current app state...');
  
  // Check session
  const session = JSON.parse(localStorage.getItem('wc_session') || 'null');
  console.log('🔐 Current session:', session);
  
  // Check database status (if available in window)
  if (window.databaseConnectionService) {
    const status = window.databaseConnectionService.getStatus();
    console.log('🔌 Database status:', status);
  } else {
    console.log('⚠️ Database connection service not available in window');
  }
  
  // Check if we should show login or dashboard
  const shouldShowLogin = !session;
  console.log('🎯 Should show login page:', shouldShowLogin);
  
  return {
    session,
    shouldShowLogin
  };
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive database connection tests...\n');
  
  await testEndpoints();
  const serviceResult = await testDatabaseService();
  const fallbackResult = testFallbackMode();
  const appResult = testAppBehavior();
  
  console.log('\n🎯 TEST RESULTS SUMMARY:');
  console.log('========================');
  console.log('1. Endpoint Tests: Check individual endpoints above');
  console.log('2. Service Test:', serviceResult.connected ? '✅ CONNECTED' : '❌ DISCONNECTED');
  console.log('3. Fallback Mode:', fallbackResult ? '✅ AVAILABLE' : '❌ NOT AVAILABLE');
  console.log('4. App Behavior:', appResult.shouldShowLogin ? '🔐 LOGIN PAGE' : '🏠 DASHBOARD');
  
  console.log('\n🚀 RECOMMENDATIONS:');
  console.log('==================');
  
  if (serviceResult.connected) {
    console.log('✅ Database is connected - app should use database authentication');
  } else {
    console.log('⚠️ Database is not connected - app should use fallback authentication');
    console.log('   - Check if webhook server is running');
    console.log('   - Check if PostgreSQL is configured');
    console.log('   - Verify database credentials');
  }
  
  if (fallbackResult) {
    console.log('✅ Fallback authentication is available');
  } else {
    console.log('❌ Fallback authentication is not available');
    console.log('   - Check localStorage access');
    console.log('   - Verify default user creation');
  }
  
  console.log('\n🔧 DEBUGGING STEPS:');
  console.log('==================');
  console.log('1. Check browser console for detailed logs');
  console.log('2. Verify webhook server is running on Render');
  console.log('3. Check if /api/postgres/health endpoint exists');
  console.log('4. Test database connection manually');
  console.log('5. Verify fallback data initialization');
}

// Run the tests
runAllTests();
