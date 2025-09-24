#!/usr/bin/env node

/**
 * WhatsApp Webhook Diagnostic Script
 * Helps diagnose webhook configuration issues
 */

import https from 'https';
import http from 'http';

// Configuration
const config = {
  baseUrl: process.env.WEBHOOK_URL || 'http://localhost:3001',
  verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'my_verify_token_123'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function checkEnvironmentVariables() {
  log('\n🔍 Checking Environment Variables...', 'blue');
  
  const requiredVars = [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WEBHOOK_VERIFY_TOKEN'
  ];
  
  const optionalVars = [
    'WHATSAPP_API_VERSION',
    'WEBHOOK_URL'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log(`✅ ${varName}: Set`, 'green');
    } else {
      log(`❌ ${varName}: Missing (REQUIRED)`, 'red');
      allPresent = false;
    }
  }
  
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      log(`✅ ${varName}: Set`, 'green');
    } else {
      log(`⚠️  ${varName}: Not set (using default)`, 'yellow');
    }
  }
  
  return allPresent;
}

async function testWebhookConnectivity() {
  log('\n🔍 Testing Webhook Connectivity...', 'blue');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/health`);
    
    if (response.status === 200) {
      log('✅ Webhook server is reachable', 'green');
      log(`   Uptime: ${response.data.uptime}s`, 'green');
      return true;
    } else {
      log('❌ Webhook server returned error', 'red');
      log(`   Status: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Cannot reach webhook server', 'red');
    log(`   Error: ${error.message}`, 'red');
    log(`   URL: ${config.baseUrl}`, 'red');
    return false;
  }
}

async function testWebhookVerification() {
  log('\n🔍 Testing Webhook Verification...', 'blue');
  
  try {
    const verifyUrl = `${config.baseUrl}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${config.verifyToken}&hub.challenge=test_challenge_123`;
    const response = await makeRequest(verifyUrl);
    
    if (response.status === 200 && response.data === 'test_challenge_123') {
      log('✅ Webhook verification works', 'green');
      return true;
    } else {
      log('❌ Webhook verification failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Webhook verification error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testMessageProcessing() {
  log('\n🔍 Testing Message Processing...', 'blue');
  
  try {
    const testMessage = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test_entry_diagnostic',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '1234567890',
              phone_number_id: 'test_phone_id'
            },
            messages: [{
              from: '1234567890',
              id: 'test_msg_diagnostic',
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: {
                body: 'Hello, this is a diagnostic test message'
              },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };
    
    const response = await makeRequest(`${config.baseUrl}/webhook/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    if (response.status === 200 && response.data.status === 'OK') {
      log('✅ Message processing works', 'green');
      return true;
    } else {
      log('❌ Message processing failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Message processing error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testWhatsAppAPIConnection() {
  log('\n🔍 Testing WhatsApp API Connection...', 'blue');
  
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
  
  if (!accessToken || !phoneNumberId) {
    log('❌ Missing WhatsApp API credentials', 'red');
    log('   Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID', 'red');
    return false;
  }
  
  try {
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      log('✅ WhatsApp API connection successful', 'green');
      log(`   Phone Number: ${result.display_phone_number}`, 'green');
      log(`   Status: ${result.status}`, 'green');
      return true;
    } else {
      log('❌ WhatsApp API connection failed', 'red');
      log(`   Error: ${result.error?.message || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ WhatsApp API connection error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function checkWebhookConfiguration() {
  log('\n🔍 Webhook Configuration Checklist...', 'blue');
  
  log('\n📋 Facebook App Configuration:', 'cyan');
  log('1. Go to Facebook Developers Console', 'yellow');
  log('2. Select your app > WhatsApp > Configuration', 'yellow');
  log('3. Set Webhook URL:', 'yellow');
  log(`   ${config.baseUrl}/webhook/whatsapp`, 'green');
  log('4. Set Verify Token:', 'yellow');
  log(`   ${config.verifyToken}`, 'green');
  log('5. Subscribe to "messages" field', 'yellow');
  
  log('\n📋 WhatsApp Business Manager:', 'cyan');
  log('1. Go to WhatsApp Business Manager', 'yellow');
  log('2. Verify your business phone number', 'yellow');
  log('3. Ensure phone number is active', 'yellow');
  
  log('\n📋 Common Issues:', 'cyan');
  log('• Webhook URL must be publicly accessible (use ngrok for local testing)', 'yellow');
  log('• Phone number must be verified in WhatsApp Business Manager', 'yellow');
  log('• Access token must have proper permissions', 'yellow');
  log('• Webhook must be subscribed to "messages" field', 'yellow');
}

async function runDiagnostics() {
  log('🔧 WhatsApp Webhook Diagnostic Tool', 'bold');
  log(`📍 Testing URL: ${config.baseUrl}`, 'blue');
  log(`🔑 Verify Token: ${config.verifyToken}`, 'blue');
  
  const tests = [
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'Webhook Connectivity', fn: testWebhookConnectivity },
    { name: 'Webhook Verification', fn: testWebhookVerification },
    { name: 'Message Processing', fn: testMessageProcessing },
    { name: 'WhatsApp API Connection', fn: testWhatsAppAPIConnection }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const result = await test.fn();
    if (result) passed++;
  }
  
  log('\n📊 Diagnostic Results:', 'bold');
  log(`✅ Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 All diagnostics passed! Your webhook should work correctly.', 'green');
  } else {
    log('\n⚠️  Some diagnostics failed. Please check the issues above.', 'yellow');
  }
  
  await checkWebhookConfiguration();
  
  return passed === total;
}

// Run diagnostics if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDiagnostics().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export {
  runDiagnostics,
  checkEnvironmentVariables,
  testWebhookConnectivity,
  testWebhookVerification,
  testMessageProcessing,
  testWhatsAppAPIConnection
};
