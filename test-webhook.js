#!/usr/bin/env node

/**
 * WhatsApp Webhook Test Script
 * Tests webhook endpoints for proper functionality
 */

import https from 'https';
import http from 'http';

// Configuration
const config = {
  baseUrl: process.env.WEBHOOK_URL || 'http://localhost:3001',
  verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'my_verify_token_123',
  testChallenge: 'test_challenge_12345'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

async function testHealthCheck() {
  log('\n🔍 Testing Health Check...', 'blue');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/health`);
    
    if (response.status === 200 && response.data.status === 'OK') {
      log('✅ Health check passed', 'green');
      log(`   Uptime: ${response.data.uptime}s`, 'green');
      return true;
    } else {
      log('❌ Health check failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Health check error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testWebhookVerification() {
  log('\n🔍 Testing Webhook Verification...', 'blue');
  
  try {
    const verifyUrl = `${config.baseUrl}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${config.verifyToken}&hub.challenge=${config.testChallenge}`;
    const response = await makeRequest(verifyUrl);
    
    if (response.status === 200 && response.data === config.testChallenge) {
      log('✅ Webhook verification passed', 'green');
      log(`   Challenge returned: ${response.data}`, 'green');
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

async function testWebhookMessage() {
  log('\n🔍 Testing Webhook Message Handling...', 'blue');
  
  try {
    const testMessage = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test_entry_id',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '1234567890',
              phone_number_id: 'test_phone_id'
            },
            messages: [{
              from: '1234567890',
              id: 'test_message_id',
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: {
                body: 'Hello, this is a test message'
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
      log('✅ Webhook message handling passed', 'green');
      return true;
    } else {
      log('❌ Webhook message handling failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Webhook message handling error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testTestEndpoint() {
  log('\n🔍 Testing Test Endpoint...', 'blue');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/test`);
    
    if (response.status === 200 && response.data.webhookUrl) {
      log('✅ Test endpoint passed', 'green');
      log(`   Webhook URL: ${response.data.webhookUrl}`, 'green');
      log(`   Verify Token: ${response.data.verifyToken}`, 'green');
      return true;
    } else {
      log('❌ Test endpoint failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Test endpoint error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting WhatsApp Webhook Tests', 'bold');
  log(`📍 Testing URL: ${config.baseUrl}`, 'blue');
  log(`🔑 Verify Token: ${config.verifyToken}`, 'blue');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Webhook Verification', fn: testWebhookVerification },
    { name: 'Webhook Message Handling', fn: testWebhookMessage },
    { name: 'Test Endpoint', fn: testTestEndpoint }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const result = await test.fn();
    if (result) passed++;
  }
  
  log('\n📊 Test Results:', 'bold');
  log(`✅ Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('🎉 All tests passed! Your webhook is ready for WhatsApp integration.', 'green');
  } else {
    log('⚠️  Some tests failed. Please check the errors above.', 'yellow');
  }
  
  return passed === total;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export {
  runAllTests,
  testHealthCheck,
  testWebhookVerification,
  testWebhookMessage,
  testTestEndpoint
};
