// Error diagnosis script
// Run this in the browser console on https://wc-helper.onrender.com/

console.log('🔍 Error Diagnosis');
console.log('==================');

// Test 1: Check for JavaScript errors
console.log('📊 Test 1: Checking for JavaScript errors...');
window.addEventListener('error', (event) => {
  console.error('❌ JavaScript Error:', event.error);
  console.error('❌ Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Test 2: Check for unhandled promise rejections
console.log('📊 Test 2: Checking for unhandled promise rejections...');
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled Promise Rejection:', event.reason);
});

// Test 3: Check console for existing errors
console.log('📊 Test 3: Checking console for existing errors...');
const originalError = console.error;
const errors = [];
console.error = function(...args) {
  errors.push(args);
  originalError.apply(console, args);
};

// Test 4: Check if React app is loading
console.log('📊 Test 4: Checking React app loading...');
const reactRoot = document.querySelector('#root');
if (reactRoot) {
  console.log('✅ React root element found');
  console.log('📊 React root content:', reactRoot.innerHTML.substring(0, 200) + '...');
} else {
  console.log('❌ React root element not found');
}

// Test 5: Check for network errors
console.log('📊 Test 5: Checking for network errors...');
fetch('/api/postgres/health')
  .then(response => {
    console.log('📊 API response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📊 API response data:', data);
  })
  .catch(error => {
    console.log('⚠️ API request failed (expected):', error.message);
  });

// Test 6: Check localStorage access
console.log('📊 Test 6: Checking localStorage access...');
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('✅ localStorage is accessible');
} catch (error) {
  console.log('❌ localStorage error:', error.message);
}

// Test 7: Check if modules are loading
console.log('📊 Test 7: Checking module loading...');
console.log('Window objects:', Object.keys(window).filter(key => key.includes('useAuth') || key.includes('database') || key.includes('test')));

// Test 8: Check page content
console.log('📊 Test 8: Checking page content...');
console.log('Document title:', document.title);
console.log('Body content length:', document.body.innerHTML.length);
console.log('Has login form:', !!document.querySelector('form'));
console.log('Has React app:', !!document.querySelector('#root'));

// Test 9: Check for specific error patterns
console.log('📊 Test 9: Checking for specific error patterns...');
const bodyText = document.body.textContent;
if (bodyText.includes('Error')) {
  console.log('⚠️ Page contains "Error" text');
}
if (bodyText.includes('Failed')) {
  console.log('⚠️ Page contains "Failed" text');
}
if (bodyText.includes('Exception')) {
  console.log('⚠️ Page contains "Exception" text');
}

// Test 10: Check browser compatibility
console.log('📊 Test 10: Checking browser compatibility...');
console.log('User Agent:', navigator.userAgent);
console.log('Supports fetch:', typeof fetch !== 'undefined');
console.log('Supports Promise:', typeof Promise !== 'undefined');
console.log('Supports async/await:', (async () => {})() instanceof Promise);

// Summary
console.log('\n🎯 DIAGNOSIS SUMMARY:');
console.log('====================');
console.log('1. JavaScript errors: Check above for any error messages');
console.log('2. React app: ' + (reactRoot ? '✅ Loading' : '❌ Not loading'));
console.log('3. localStorage: ' + (localStorage ? '✅ Accessible' : '❌ Not accessible'));
console.log('4. Network: API requests may fail (expected without database)');
console.log('5. Page content: Check if login form is present');

console.log('\n🔧 DEBUGGING STEPS:');
console.log('==================');
console.log('1. Check browser console for red error messages');
console.log('2. Check if the page is showing the login form');
console.log('3. Check if there are any network errors in Network tab');
console.log('4. Try refreshing the page (F5)');
console.log('5. Check if the React app is building correctly');

console.log('\n📞 If still having issues:');
console.log('=========================');
console.log('1. Copy any error messages from the console');
console.log('2. Check the Network tab for failed requests');
console.log('3. Try opening the page in an incognito/private window');
console.log('4. Check if JavaScript is enabled in your browser');

// Restore original console.error
setTimeout(() => {
  console.error = originalError;
  console.log('\n📊 Captured errors:', errors.length);
  if (errors.length > 0) {
    console.log('❌ Errors found:');
    errors.forEach((error, index) => {
      console.log(`${index + 1}.`, ...error);
    });
  } else {
    console.log('✅ No errors captured');
  }
}, 2000);
