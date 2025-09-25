// Test authentication with default admin user
// Run this in the browser console on https://wc-helper.onrender.com/

console.log('🧪 Testing Authentication with Default Admin User');
console.log('================================================');

// Test 1: Check if users exist
console.log('📊 Test 1: Checking users in localStorage...');
const users = JSON.parse(localStorage.getItem('wc_users') || '[]');
console.log('👥 Users found:', users.length);
if (users.length > 0) {
    console.log('👤 First user:', users[0]);
} else {
    console.log('❌ No users found!');
}

// Test 2: Check if default admin user exists
console.log('\n📊 Test 2: Checking for default admin user...');
const adminUser = users.find(u => u.username === 'admin@demo.com');
if (adminUser) {
    console.log('✅ Admin user found:', adminUser);
} else {
    console.log('❌ Admin user not found!');
}

// Test 3: Test password hashing
console.log('\n📊 Test 3: Testing password hashing...');
async function testPasswordHashing() {
    try {
        // Test SHA-256 hashing
        const testPassword = 'Passw0rd!';
        const encoder = new TextEncoder();
        const data = encoder.encode(testPassword);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log('🔑 Test password:', testPassword);
        console.log('🔑 Generated hash:', hash);
        
        if (adminUser) {
            console.log('🔑 Stored hash:', adminUser.password);
            console.log('✅ Hashes match:', hash === adminUser.password);
        }
        
        return hash;
    } catch (error) {
        console.error('❌ Error testing password hashing:', error);
        return null;
    }
}

// Test 4: Test login function
console.log('\n📊 Test 4: Testing login function...');
async function testLogin() {
    try {
        const email = 'admin@demo.com';
        const password = 'Passw0rd!';
        
        console.log('🔐 Testing login with:', email, password);
        
        // Hash the password
        const hash = await testPasswordHashing();
        
        if (adminUser && hash) {
            const usernameMatch = adminUser.username.toLowerCase() === email.toLowerCase();
            const passwordMatch = adminUser.password === hash;
            const isActive = adminUser.is_active;
            
            console.log('🔍 Login validation:');
            console.log('  Username match:', usernameMatch);
            console.log('  Password match:', passwordMatch);
            console.log('  Is active:', isActive);
            console.log('  Overall success:', usernameMatch && passwordMatch && isActive);
        }
    } catch (error) {
        console.error('❌ Error testing login:', error);
    }
}

// Test 5: Create default user if missing
console.log('\n📊 Test 5: Creating default user if missing...');
async function createDefaultUser() {
    if (users.length === 0) {
        console.log('👤 Creating default admin user...');
        
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
        console.log('✅ Default admin user created:', defaultUser);
    } else {
        console.log('✅ Users already exist, no need to create');
    }
}

// Run all tests
async function runAllTests() {
    await testPasswordHashing();
    await testLogin();
    await createDefaultUser();
    
    console.log('\n🎯 SUMMARY:');
    console.log('1. Check if users exist in localStorage');
    console.log('2. Verify admin user credentials');
    console.log('3. Test password hashing');
    console.log('4. Test login validation');
    console.log('5. Create default user if missing');
    
    console.log('\n🚀 Next steps:');
    console.log('1. If all tests pass, try logging in with admin@demo.com / Passw0rd!');
    console.log('2. If login fails, check the console for error messages');
    console.log('3. If no users exist, the createDefaultUser function will create them');
}

// Run the tests
runAllTests();
