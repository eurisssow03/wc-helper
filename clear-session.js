// Clear session and check localStorage
console.log('🧹 Clearing session and checking localStorage...');

// Show current localStorage state
console.log('📊 Current localStorage keys:', Object.keys(localStorage));
console.log('🔑 wc_session:', localStorage.getItem('wc_session'));
console.log('👥 wc_users:', localStorage.getItem('wc_users'));

// Clear session
localStorage.removeItem('wc_session');
console.log('✅ Session cleared');

// Show updated state
console.log('📊 After clearing - localStorage keys:', Object.keys(localStorage));
console.log('🔑 wc_session after clear:', localStorage.getItem('wc_session'));

// Reload the page
console.log('🔄 Reloading page...');
window.location.reload();
