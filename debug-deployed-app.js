// Debug script for deployed WC Helper app
// Run this in the browser console on your deployed app

console.log('🔍 WC Helper Debug Script');
console.log('========================');

// Check if we're on the deployed app
if (window.location.hostname.includes('render.com') || window.location.hostname.includes('wc-helper')) {
    console.log('✅ Running on deployed app');
} else {
    console.log('⚠️ Not running on deployed app - current URL:', window.location.href);
}

// Check localStorage
console.log('📊 localStorage contents:');
Object.keys(localStorage).forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${key}:`, value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : 'null');
});

// Check for session
const session = localStorage.getItem('wc_session');
if (session) {
    console.log('🔑 Active session found:', JSON.parse(session));
    console.log('⚠️ This might prevent login page from showing');
} else {
    console.log('✅ No active session - login page should show');
}

// Check for users
const users = localStorage.getItem('wc_users');
if (users) {
    const userData = JSON.parse(users);
    console.log('👥 Users found:', userData.length, 'users');
    console.log('  First user:', userData[0]);
} else {
    console.log('❌ No users data found');
}

// Check if login page elements exist
const loginElements = document.querySelectorAll('[class*="login"], [id*="login"]');
console.log('🔍 Login-related elements found:', loginElements.length);
loginElements.forEach((el, i) => {
    console.log(`  Element ${i + 1}:`, el.className, el.id, el.tagName);
});

// Check if dashboard elements exist
const dashboardElements = document.querySelectorAll('[class*="dashboard"], [class*="sidebar"]');
console.log('🏠 Dashboard-related elements found:', dashboardElements.length);
dashboardElements.forEach((el, i) => {
    console.log(`  Element ${i + 1}:`, el.className, el.id, el.tagName);
});

// Check for any error messages
const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
console.log('❌ Error elements found:', errorElements.length);
errorElements.forEach((el, i) => {
    console.log(`  Error ${i + 1}:`, el.textContent);
});

// Check console for errors
console.log('🔍 Check the console above for any red error messages');

// Provide solutions
console.log('\n🛠️ SOLUTIONS:');
console.log('1. If you see "Active session found" above, run: localStorage.removeItem("wc_session"); window.location.reload();');
console.log('2. If you see "No users data found", the app might not be initialized properly');
console.log('3. If you see dashboard elements but no login elements, the app is showing the dashboard instead of login');
console.log('4. Check the Network tab in DevTools for any failed requests');

// Auto-fix function
window.fixLoginIssue = function() {
    console.log('🔧 Attempting to fix login issue...');
    
    // Clear session
    localStorage.removeItem('wc_session');
    console.log('✅ Cleared session');
    
    // Create default user if none exists
    if (!localStorage.getItem('wc_users')) {
        const defaultUser = {
            id: 'admin-001',
            username: 'admin@demo.com',
            password: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA-256 of "Passw0rd!"
            role: 'admin',
            is_active: true,
            created_by: 'system',
            created_at: new Date().toISOString(),
            updated_by: 'system',
            updated_at: new Date().toISOString()
        };
        localStorage.setItem('wc_users', JSON.stringify([defaultUser]));
        console.log('✅ Created default user');
    }
    
    // Reload page
    console.log('🔄 Reloading page...');
    window.location.reload();
};

console.log('\n🚀 To auto-fix, run: fixLoginIssue()');
