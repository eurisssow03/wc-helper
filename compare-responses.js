#!/usr/bin/env node

/**
 * Compare Chat Tester vs Webhook Server Responses
 * Tests both systems with the same input to identify discrepancies
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

async function checkWebhookFAQs() {
  log('\n🔍 Checking Webhook Server FAQ Data...', 'blue');
  
  try {
    const response = await makeRequest(`${config.webhookUrl}/api/debug/faqs`);
    
    if (response.status === 200 && response.data.success) {
      log('✅ Webhook FAQ data retrieved', 'green');
      log(`   Total FAQs: ${response.data.total}`, 'green');
      log(`   Active FAQs: ${response.data.active}`, 'green');
      log(`   Inactive FAQs: ${response.data.inactive}`, 'yellow');
      
      if (response.data.activeFAQs.length > 0) {
        log('\n📋 Active FAQs in Webhook:', 'cyan');
        response.data.activeFAQs.forEach((faq, index) => {
          log(`   ${index + 1}. ${faq.question}`, 'green');
        });
      }
      
      if (response.data.inactiveFAQs.length > 0) {
        log('\n📋 Inactive FAQs in Webhook:', 'cyan');
        response.data.inactiveFAQs.forEach((faq, index) => {
          log(`   ${index + 1}. ${faq.question}`, 'red');
        });
      }
      
      return response.data;
    } else {
      log('❌ Failed to retrieve webhook FAQ data', 'red');
      return null;
    }
  } catch (error) {
    log('❌ Error retrieving webhook FAQ data', 'red');
    log(`   Error: ${error.message}`, 'red');
    return null;
  }
}

async function testWebhookResponse() {
  log('\n🔍 Testing Webhook Server Response...', 'blue');
  
  try {
    const testMessage = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test_entry_compare',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '1234567890',
              phone_number_id: 'test_phone_id'
            },
            messages: [{
              from: '1234567890',
              id: 'test_msg_compare',
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
      log('✅ Webhook response received', 'green');
      log(`   Test message: "${config.testMessage}"`, 'cyan');
      log('   Check webhook server logs for detailed processing', 'yellow');
      return true;
    } else {
      log('❌ Webhook response failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Webhook response error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function simulateChatTesterProcessing() {
  log('\n🔍 Simulating Chat Tester Processing...', 'blue');
  
  try {
    // This simulates what the Chat Tester would do
    // We'll use the same FAQ data that should be in localStorage
    
    // First, let's check what FAQs are available in the webhook
    const webhookFAQs = await checkWebhookFAQs();
    
    if (!webhookFAQs) {
      log('❌ Cannot simulate Chat Tester without FAQ data', 'red');
      return null;
    }
    
    // Simulate the simple similarity scoring
    const query = config.testMessage.toLowerCase();
    const queryTokens = query.split(/\s+/).filter(Boolean);
    
    log(`\n📝 Simulating Chat Tester for: "${config.testMessage}"`, 'cyan');
    log(`   Query tokens: [${queryTokens.join(', ')}]`, 'cyan');
    
    let bestMatch = null;
    let bestScore = 0;
    
    // Process all FAQs (both active and inactive for comparison)
    const allFAQs = [...webhookFAQs.activeFAQs, ...webhookFAQs.inactiveFAQs];
    
    for (const faq of allFAQs) {
      // Simulate the simpleSimilarityScore function
      const corpus = [faq.question, faq.answer, (faq.tags || []).join(" ")].join(" ");
      const corpusTokens = corpus.toLowerCase().split(/\s+/).filter(Boolean);
      
      // Calculate Jaccard similarity
      const querySet = new Set(queryTokens);
      const corpusSet = new Set(corpusTokens);
      const intersection = [...querySet].filter(x => corpusSet.has(x)).length;
      const union = new Set([...querySet, ...corpusSet]).size || 1;
      const score = intersection / union;
      
      const status = faq.is_active ? 'ACTIVE' : 'INACTIVE';
      log(`   ${status}: "${faq.question}" - Score: ${score.toFixed(4)}`, 
          faq.is_active ? 'green' : 'red');
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { ...faq, score };
      }
    }
    
    if (bestMatch) {
      log(`\n✅ Best match: "${bestMatch.question}"`, 'green');
      log(`   Score: ${bestMatch.score.toFixed(4)}`, 'green');
      log(`   Status: ${bestMatch.is_active ? 'ACTIVE' : 'INACTIVE'}`, 
          bestMatch.is_active ? 'green' : 'red');
      
      if (bestMatch.is_active) {
        log('   → Chat Tester would return this answer', 'green');
      } else {
        log('   → Chat Tester would return fallback (inactive FAQ)', 'yellow');
      }
    } else {
      log('❌ No match found - Chat Tester would return fallback', 'yellow');
    }
    
    return bestMatch;
    
  } catch (error) {
    log('❌ Error simulating Chat Tester', 'red');
    log(`   Error: ${error.message}`, 'red');
    return null;
  }
}

async function runComparison() {
  log('🔍 Chat Tester vs Webhook Server Comparison', 'bold');
  log(`📍 Testing URL: ${config.webhookUrl}`, 'blue');
  log(`📝 Test Message: "${config.testMessage}"`, 'blue');
  
  // Step 1: Check webhook FAQ data
  const webhookFAQs = await checkWebhookFAQs();
  if (!webhookFAQs) {
    log('❌ Cannot proceed without webhook FAQ data', 'red');
    return false;
  }
  
  // Step 2: Simulate Chat Tester processing
  const chatTesterResult = await simulateChatTesterProcessing();
  
  // Step 3: Test webhook response
  const webhookSuccess = await testWebhookResponse();
  
  log('\n📊 Comparison Results:', 'bold');
  
  if (chatTesterResult) {
    log(`✅ Chat Tester would find: "${chatTesterResult.question}"`, 'green');
    log(`   Score: ${chatTesterResult.score.toFixed(4)}`, 'green');
    log(`   Status: ${chatTesterResult.is_active ? 'ACTIVE' : 'INACTIVE'}`, 
        chatTesterResult.is_active ? 'green' : 'red');
  } else {
    log('❌ Chat Tester would find no match', 'yellow');
  }
  
  if (webhookSuccess) {
    log('✅ Webhook server processed message', 'green');
    log('   Check webhook server logs for actual response', 'yellow');
  } else {
    log('❌ Webhook server failed to process message', 'red');
  }
  
  log('\n🔍 Key Differences to Check:', 'cyan');
  log('1. FAQ data sync between web app and webhook server', 'yellow');
  log('2. is_active filtering in both systems', 'yellow');
  log('3. Processing algorithms (simple vs RAG)', 'yellow');
  log('4. Fallback message handling', 'yellow');
  
  return true;
}

// Run comparison if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComparison().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runComparison, checkWebhookFAQs, testWebhookResponse, simulateChatTesterProcessing };
