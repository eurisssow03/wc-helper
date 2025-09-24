#!/usr/bin/env node

/**
 * Manual FAQ Sync Test
 * Manually sync FAQ data and test the response
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

async function checkCurrentFAQs() {
  log('\n🔍 Checking Current FAQ Data...', 'blue');
  
  try {
    const response = await makeRequest(`${config.webhookUrl}/api/debug/faqs`);
    
    if (response.status === 200 && response.data.success) {
      log('✅ FAQ data retrieved successfully', 'green');
      log(`   Total FAQs: ${response.data.total}`, 'green');
      log(`   Active FAQs: ${response.data.active}`, 'green');
      log(`   Inactive FAQs: ${response.data.inactive}`, 'yellow');
      
      if (response.data.activeFAQs.length > 0) {
        log('\n📋 Active FAQs:', 'cyan');
        response.data.activeFAQs.forEach((faq, index) => {
          log(`   ${index + 1}. ${faq.question}`, 'green');
        });
      }
      
      if (response.data.inactiveFAQs.length > 0) {
        log('\n📋 Inactive FAQs:', 'cyan');
        response.data.inactiveFAQs.forEach((faq, index) => {
          log(`   ${index + 1}. ${faq.question}`, 'red');
        });
      }
      
      return response.data;
    } else {
      log('❌ Failed to retrieve FAQ data', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return null;
    }
  } catch (error) {
    log('❌ Error retrieving FAQ data', 'red');
    log(`   Error: ${error.message}`, 'red');
    return null;
  }
}

async function syncTestFAQs() {
  log('\n🔍 Syncing Test FAQ Data...', 'blue');
  
  try {
    // Test data with parking FAQ disabled
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
        is_active: true
      },
      {
        question: "Do you have parking?",
        answer: "Yes, we offer complimentary parking for all guests. Valet parking is also available for an additional fee. Please inform us of your vehicle details upon check-in.",
        tags: ["parking", "valet", "complimentary"],
        is_active: false  // This FAQ is disabled
      },
      {
        question: "Is Wi-Fi available?",
        answer: "Yes, complimentary high-speed Wi-Fi is available throughout the homestay. The network name and password will be provided upon check-in.",
        tags: ["wifi", "internet", "complimentary"],
        is_active: true
      }
    ];
    
    const response = await makeRequest(`${config.webhookUrl}/api/sync/faqs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ faqs: testFAQs })
    });
    
    if (response.status === 200 && response.data.success) {
      log('✅ FAQ sync successful', 'green');
      log(`   Total FAQs: ${response.data.total}`, 'green');
      log(`   Active FAQs: ${response.data.active}`, 'green');
      return true;
    } else {
      log('❌ FAQ sync failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ FAQ sync error', 'red');
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
        id: 'test_entry_manual',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '1234567890',
              phone_number_id: 'test_phone_id'
            },
            messages: [{
              from: '1234567890',
              id: 'test_msg_manual',
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

async function runManualTest() {
  log('🧪 Manual FAQ Sync and Test', 'bold');
  log(`📍 Testing URL: ${config.webhookUrl}`, 'blue');
  log(`📝 Test Message: "${config.testMessage}"`, 'blue');
  
  // Step 1: Check current state
  await checkCurrentFAQs();
  
  // Step 2: Sync test data
  const syncSuccess = await syncTestFAQs();
  if (!syncSuccess) {
    log('❌ Sync failed, aborting test', 'red');
    return false;
  }
  
  // Step 3: Check state after sync
  await checkCurrentFAQs();
  
  // Step 4: Test message processing
  const processSuccess = await testMessageProcessing();
  
  log('\n📊 Test Results:', 'bold');
  if (syncSuccess && processSuccess) {
    log('✅ Manual test completed successfully', 'green');
    log('   - FAQ data synced with parking FAQ disabled', 'green');
    log('   - Message processing should now use only active FAQs', 'green');
    log('   - Check webhook server logs for detailed processing info', 'yellow');
  } else {
    log('❌ Manual test failed', 'red');
  }
  
  return syncSuccess && processSuccess;
}

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runManualTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runManualTest, checkCurrentFAQs, syncTestFAQs, testMessageProcessing };
