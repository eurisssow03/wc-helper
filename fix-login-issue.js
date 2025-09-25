// Fix script for WC Helper login issue
// Run this in the browser console on https://wc-helper.onrender.com/

console.log('🔧 WC Helper Login Fix Script');
console.log('==============================');

// Step 1: Clear all authentication data
console.log('🧹 Step 1: Clearing authentication data...');
localStorage.removeItem('wc_session');
localStorage.removeItem('wc_users');
localStorage.removeItem('wc_settings');
console.log('✅ Cleared all auth data');

// Step 2: Create fresh default user
console.log('👤 Step 2: Creating fresh default user...');
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
console.log('✅ Created fresh default user');

// Step 3: Create fresh settings
console.log('⚙️ Step 3: Creating fresh settings...');
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
console.log('✅ Created fresh settings');

// Step 4: Clear any other potentially problematic data
console.log('🧽 Step 4: Clearing other data...');
localStorage.removeItem('wc_homestays');
localStorage.removeItem('wc_faqs');
localStorage.removeItem('wc_logs');
localStorage.removeItem('wc_conversation_memory');
localStorage.removeItem('wc_homestay_general_knowledge');
console.log('✅ Cleared other data');

// Step 5: Show current state
console.log('📊 Step 5: Current localStorage state:');
Object.keys(localStorage).forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${key}:`, value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'null');
});

// Step 6: Reload the page
console.log('🔄 Step 6: Reloading page...');
console.log('✅ Fix complete! The login page should now appear.');
window.location.reload();
