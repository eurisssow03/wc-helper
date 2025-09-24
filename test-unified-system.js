#!/usr/bin/env node

/**
 * Test Unified AI System
 * Tests the unified AI processing across Chat Tester, Messages, and Webhook
 */

import https from 'https';
import http from 'http';

// Configuration
const config = {
  webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3001',
  testMessages: [
    'this is a text message',
    'what time is check-in?',
    'do you have parking?',
    'hello, I need help'
  ]
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

async function syncSampleData() {
  log('\n🔄 Syncing Sample Data...', 'blue');
  
  const sampleFAQs = [
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
      is_active: false  // This FAQ is disabled for testing
    },
    {
      question: "Is Wi-Fi available?",
      answer: "Yes, complimentary high-speed Wi-Fi is available throughout the homestay. The network name and password will be provided upon check-in.",
      tags: ["wifi", "internet", "complimentary"],
      is_active: true
    }
  ];
  
  const sampleHomestays = [
    {
      name: "Trefoil Shah Alam",
      city: "Shah Alam",
      checkin_time: "15:00",
      checkout_time: "12:00",
      amenities: ["Free Wi-Fi", "Swimming Pool", "Fitness Center", "Restaurant", "Parking"]
    },
    {
      name: "Palas Horizon Cameron",
      city: "Cameron Highlands", 
      checkin_time: "14:00",
      checkout_time: "11:00",
      amenities: ["Free Wi-Fi", "Mountain View", "Tea Garden Access", "Restaurant", "Parking"]
    }
  ];
  
  try {
    // Sync FAQs
    const faqResponse = await makeRequest(`${config.webhookUrl}/api/sync/faqs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faqs: sampleFAQs })
    });
    
    if (faqResponse.status === 200) {
      log('✅ FAQs synced successfully', 'green');
    } else {
      log('❌ FAQ sync failed', 'red');
    }
    
    // Sync Homestays
    const homestayResponse = await makeRequest(`${config.webhookUrl}/api/sync/homestays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homestays: sampleHomestays })
    });
    
    if (homestayResponse.status === 200) {
      log('✅ Homestays synced successfully', 'green');
    } else {
      log('❌ Homestay sync failed', 'red');
    }
    
    return true;
  } catch (error) {
    log('❌ Error syncing sample data:', 'red');
    log(`   ${error.message}`, 'red');
    return false;
  }
}

async function testWebhookProcessing() {
  log('\n🧪 Testing Webhook Processing...', 'blue');
  
  const results = [];
  
  for (const testMessage of config.testMessages) {
    log(`\n📝 Testing: "${testMessage}"`, 'cyan');
    
    try {
      const testPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'test_entry_unified',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: 'test_phone_id'
              },
              messages: [{
                from: '1234567890',
                id: `test_msg_${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: { body: testMessage },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };
      
      const response = await makeRequest(`${config.webhookUrl}/webhook/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      
      if (response.status === 200) {
        log('✅ Webhook processed successfully', 'green');
        results.push({ message: testMessage, success: true });
      } else {
        log('❌ Webhook processing failed', 'red');
        log(`   Status: ${response.status}`, 'red');
        results.push({ message: testMessage, success: false, error: response.data });
      }
    } catch (error) {
      log('❌ Webhook test error', 'red');
      log(`   ${error.message}`, 'red');
      results.push({ message: testMessage, success: false, error: error.message });
    }
  }
  
  return results;
}

async function checkWebhookMessages() {
  log('\n📨 Checking Webhook Messages...', 'blue');
  
  try {
    const response = await makeRequest(`${config.webhookUrl}/api/messages?limit=10`);
    
    if (response.status === 200 && response.data.success) {
      const messages = response.data.messages;
      log(`✅ Found ${messages.length} messages in webhook`, 'green');
      
      if (messages.length > 0) {
        log('\n📋 Recent Messages:', 'cyan');
        messages.slice(0, 5).forEach((msg, index) => {
          log(`   ${index + 1}. From: ${msg.from}`, 'green');
          log(`      Text: ${msg.text}`, 'green');
          log(`      AI Response: ${msg.aiResponse?.substring(0, 100)}...`, 'green');
          log(`      Confidence: ${msg.confidence}`, 'green');
          log(`      Status: ${msg.status}`, 'green');
          log('');
        });
      }
      
      return messages;
    } else {
      log('❌ Failed to fetch webhook messages', 'red');
      return [];
    }
  } catch (error) {
    log('❌ Error fetching webhook messages', 'red');
    log(`   ${error.message}`, 'red');
    return [];
  }
}

async function checkWebhookFAQs() {
  log('\n📚 Checking Webhook FAQ Data...', 'blue');
  
  try {
    const response = await makeRequest(`${config.webhookUrl}/api/debug/faqs`);
    
    if (response.status === 200 && response.data.success) {
      const data = response.data;
      log(`✅ Webhook FAQ data:`, 'green');
      log(`   Total FAQs: ${data.total}`, 'green');
      log(`   Active FAQs: ${data.active}`, 'green');
      log(`   Inactive FAQs: ${data.inactive}`, 'yellow');
      
      if (data.inactiveFAQs.length > 0) {
        log('\n📋 Inactive FAQs (should not be used):', 'red');
        data.inactiveFAQs.forEach((faq, index) => {
          log(`   ${index + 1}. ${faq.question}`, 'red');
        });
      }
      
      return data;
    } else {
      log('❌ Failed to fetch webhook FAQ data', 'red');
      return null;
    }
  } catch (error) {
    log('❌ Error fetching webhook FAQ data', 'red');
    log(`   ${error.message}`, 'red');
    return null;
  }
}

async function runUnifiedTest() {
  log('🧪 Unified AI System Test', 'bold');
  log(`📍 Webhook URL: ${config.webhookUrl}`, 'blue');
  
  // Step 1: Sync sample data
  const syncSuccess = await syncSampleData();
  if (!syncSuccess) {
    log('❌ Cannot proceed without sample data', 'red');
    return false;
  }
  
  // Step 2: Check FAQ data
  const faqData = await checkWebhookFAQs();
  if (!faqData) {
    log('❌ Cannot proceed without FAQ data', 'red');
    return false;
  }
  
  // Step 3: Test webhook processing
  const processingResults = await testWebhookProcessing();
  
  // Step 4: Check messages
  const messages = await checkWebhookMessages();
  
  // Step 5: Summary
  log('\n📊 Test Results Summary:', 'bold');
  
  const successfulTests = processingResults.filter(r => r.success).length;
  const totalTests = processingResults.length;
  
  log(`✅ Webhook Processing: ${successfulTests}/${totalTests} tests passed`, 
      successfulTests === totalTests ? 'green' : 'yellow');
  
  log(`✅ Messages Stored: ${messages.length} messages found`, 
      messages.length > 0 ? 'green' : 'yellow');
  
  log(`✅ FAQ Data: ${faqData.active} active, ${faqData.inactive} inactive`, 'green');
  
  // Check for disabled FAQ responses
  const disabledFAQResponses = messages.filter(msg => 
    msg.aiResponse && msg.aiResponse.includes('parking')
  );
  
  if (disabledFAQResponses.length > 0) {
    log('❌ ISSUE: Disabled FAQ (parking) is still being used!', 'red');
    log('   This means the AI system is not properly filtering inactive FAQs', 'red');
  } else {
    log('✅ Disabled FAQ filtering is working correctly', 'green');
  }
  
  log('\n🔍 Next Steps:', 'cyan');
  log('1. Open your web app and check the Messages page', 'yellow');
  log('2. Check the Dashboard for message counts', 'yellow');
  log('3. Test Chat Tester with the same messages', 'yellow');
  log('4. Verify all systems show the same data', 'yellow');
  
  return successfulTests === totalTests && messages.length > 0;
}

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runUnifiedTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runUnifiedTest, syncSampleData, testWebhookProcessing, checkWebhookMessages, checkWebhookFAQs };
