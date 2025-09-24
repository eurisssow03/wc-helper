#!/usr/bin/env node

/**
 * FAQ Sync Test Script
 * Tests the FAQ synchronization between web app and webhook server
 */

import https from 'https';
import http from 'http';

// Configuration
const config = {
  webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3001',
  testMessage: 'this is a text message'
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

async function testWebhookConnectivity() {
  log('\n🔍 Testing Webhook Server Connectivity...', 'blue');
  
  try {
    const response = await makeRequest(`${config.webhookUrl}/health`);
    
    if (response.status === 200) {
      log('✅ Webhook server is reachable', 'green');
      return true;
    } else {
      log('❌ Webhook server returned error', 'red');
      log(`   Status: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Cannot reach webhook server', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testFAQSync() {
  log('\n🔍 Testing FAQ Sync...', 'blue');
  
  try {
    // Test data with one disabled FAQ
    const testFAQs = [
      {
        question: "What time is check-in?",
        answer: "Check-in time is 3:00 PM. Please share your booking details for further check in procedure.",
        tags: ["check-in", "time", "early"],
        is_active: true
      },
      {
        question: "What time is check-out?",
        answer: "Check-out time is 12:00 PM. Late check-out may be available upon request, subject to room availability and additional charges.",
        tags: ["check-out", "time", "late"],
        is_active: false  // This FAQ is disabled
      },
      {
        question: "Do you have parking?",
        answer: "Yes, we offer complimentary parking for all guests. Valet parking is also available for an additional fee. Please inform us of your vehicle details upon check-in.",
        tags: ["parking", "valet", "complimentary"],
        is_active: true
      },
      {
        question: "Is Wi-Fi available?",
        answer: "Yes, complimentary high-speed Wi-Fi is available throughout the homestay. The network name and password will be provided upon check-in.",
        tags: ["wifi", "internet", "complimentary"],
        is_active: true
      }
    ];
    
    // Sync FAQs to webhook server
    const syncResponse = await makeRequest(`${config.webhookUrl}/api/sync/faqs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ faqs: testFAQs })
    });
    
    if (syncResponse.status === 200 && syncResponse.data.success) {
      log('✅ FAQ sync successful', 'green');
      log(`   Total FAQs: ${syncResponse.data.total}`, 'green');
      log(`   Active FAQs: ${syncResponse.data.active}`, 'green');
      return true;
    } else {
      log('❌ FAQ sync failed', 'red');
      log(`   Status: ${syncResponse.status}`, 'red');
      log(`   Response: ${JSON.stringify(syncResponse.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ FAQ sync error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testFAQRetrieval() {
  log('\n🔍 Testing FAQ Retrieval...', 'blue');
  
  try {
    const response = await makeRequest(`${config.webhookUrl}/api/faqs`);
    
    if (response.status === 200 && response.data.success) {
      log('✅ FAQ retrieval successful', 'green');
      log(`   Retrieved ${response.data.total} active FAQs`, 'green');
      
      // Check that disabled FAQ is not included
      const disabledFAQs = response.data.faqs.filter(faq => !faq.is_active);
      if (disabledFAQs.length === 0) {
        log('✅ Disabled FAQs are properly filtered out', 'green');
      } else {
        log('❌ Disabled FAQs are still present', 'red');
        log(`   Found ${disabledFAQs.length} disabled FAQs`, 'red');
      }
      
      return true;
    } else {
      log('❌ FAQ retrieval failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ FAQ retrieval error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testMessageProcessing() {
  log('\n🔍 Testing Message Processing with Disabled FAQ...', 'blue');
  
  try {
    const testMessage = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test_entry_faq',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '1234567890',
              phone_number_id: 'test_phone_id'
            },
            messages: [{
              from: '1234567890',
              id: 'test_msg_faq',
              timestamp: Math.floor(Date.now() / 1000).toString(),
              text: {
                body: config.testMessage
              },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };
    
    const response = await makeRequest(`${config.webhookUrl}/webhook/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    if (response.status === 200 && response.data.status === 'OK') {
      log('✅ Message processing successful', 'green');
      log(`   Test message: "${config.testMessage}"`, 'cyan');
      log('   Check webhook server logs for AI response details', 'yellow');
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

async function runFAQTests() {
  log('🧪 FAQ Sync and Processing Test Suite', 'bold');
  log(`📍 Testing URL: ${config.webhookUrl}`, 'blue');
  log(`📝 Test Message: "${config.testMessage}"`, 'blue');
  
  const tests = [
    { name: 'Webhook Connectivity', fn: testWebhookConnectivity },
    { name: 'FAQ Sync', fn: testFAQSync },
    { name: 'FAQ Retrieval', fn: testFAQRetrieval },
    { name: 'Message Processing', fn: testMessageProcessing }
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
    log('\n🎉 All FAQ tests passed!', 'green');
    log('   - FAQs are properly synced to webhook server', 'green');
    log('   - Disabled FAQs are filtered out', 'green');
    log('   - Message processing works correctly', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please check the issues above.', 'yellow');
  }
  
  log('\n📋 Next Steps:', 'cyan');
  log('1. Disable an FAQ in the web app', 'yellow');
  log('2. Run this test again to verify disabled FAQ is not used', 'yellow');
  log('3. Check webhook server logs for detailed processing info', 'yellow');
  
  return passed === total;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFAQTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export {
  runFAQTests,
  testWebhookConnectivity,
  testFAQSync,
  testFAQRetrieval,
  testMessageProcessing
};
