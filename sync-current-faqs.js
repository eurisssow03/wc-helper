#!/usr/bin/env node

/**
 * Sync Current FAQ Data from Web App to Webhook Server
 * This script reads the current FAQ data from localStorage and syncs it to the webhook server
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3001',
  // Path to the built web app (adjust as needed)
  webAppPath: path.join(__dirname, 'dist') // or 'build' depending on your build output
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

function getSampleFAQs() {
  // Return the same sample FAQs that the web app uses
  return [
    {
      question: "Why do I need to pay a deposit?",
      answer: "A deposit is required to secure your reservation and cover any potential damages or incidental charges during your stay. The deposit amount varies by room type and length of stay, typically ranging from 1-2 nights' room rate. The deposit will be refunded after check-out, minus any charges for damages or additional services.",
      tags: ["deposit", "payment", "reservation", "security"],
      related_homestay: "",
      lang_hint: "en",
      embedding: [],
      source_id: "sample-1",
      updated_by: "system",
      updated_at: new Date().toISOString(),
      is_active: true
    },
    {
      question: "What time is check-in?",
      answer: "Check-in time is 3:00 PM. Please share your booking details for further check in procedure.",
      tags: ["check-in", "time", "early"],
      related_homestay: "",
      lang_hint: "en",
      embedding: [],
      source_id: "sample-2",
      updated_by: "system",
      updated_at: new Date().toISOString(),
      is_active: true
    },
    {
      question: "What time is check-out?",
      answer: "Check-out time is 12:00 PM. Late check-out may be available upon request, subject to room availability and additional charges.",
      tags: ["check-out", "time", "late"],
      related_homestay: "",
      lang_hint: "en",
      embedding: [],
      source_id: "sample-3",
      updated_by: "system",
      updated_at: new Date().toISOString(),
      is_active: true
    },
    {
      question: "Do you have parking?",
      answer: "Yes, we offer complimentary parking for all guests. Valet parking is also available for an additional fee. Please inform us of your vehicle details upon check-in.",
      tags: ["parking", "valet", "complimentary"],
      related_homestay: "",
      lang_hint: "en",
      embedding: [],
      source_id: "sample-4",
      updated_by: "system",
      updated_at: new Date().toISOString(),
      is_active: false  // This FAQ is disabled for testing
    },
    {
      question: "Is Wi-Fi available?",
      answer: "Yes, complimentary high-speed Wi-Fi is available throughout the homestay. The network name and password will be provided upon check-in.",
      tags: ["wifi", "internet", "complimentary"],
      related_homestay: "",
      lang_hint: "en",
      embedding: [],
      source_id: "sample-5",
      updated_by: "system",
      updated_at: new Date().toISOString(),
      is_active: true
    }
  ];
}

async function syncFAQsToWebhook(faqs) {
  log('\n🔍 Syncing FAQs to Webhook Server...', 'blue');
  
  try {
    const response = await makeRequest(`${config.webhookUrl}/api/sync/faqs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ faqs: faqs })
    });
    
    if (response.status === 200 && response.data.success) {
      log('✅ FAQ sync successful', 'green');
      log(`   Total FAQs: ${response.data.total}`, 'green');
      log(`   Active FAQs: ${response.data.active}`, 'green');
      log(`   Inactive FAQs: ${response.data.total - response.data.active}`, 'yellow');
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

async function verifySync() {
  log('\n🔍 Verifying Sync...', 'blue');
  
  try {
    const response = await makeRequest(`${config.webhookUrl}/api/debug/faqs`);
    
    if (response.status === 200 && response.data.success) {
      log('✅ Sync verification successful', 'green');
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
      log('❌ Sync verification failed', 'red');
      return null;
    }
  } catch (error) {
    log('❌ Sync verification error', 'red');
    log(`   Error: ${error.message}`, 'red');
    return null;
  }
}

async function runSync() {
  log('🔄 FAQ Sync Tool', 'bold');
  log(`📍 Webhook URL: ${config.webhookUrl}`, 'blue');
  
  // Get sample FAQs (in a real scenario, this would come from the web app's localStorage)
  const faqs = getSampleFAQs();
  
  log(`\n📚 Sample FAQs loaded:`, 'cyan');
  faqs.forEach((faq, index) => {
    const status = faq.is_active ? 'ACTIVE' : 'INACTIVE';
    log(`   ${index + 1}. [${status}] ${faq.question}`, 
        faq.is_active ? 'green' : 'red');
  });
  
  // Sync to webhook server
  const syncSuccess = await syncFAQsToWebhook(faqs);
  
  if (!syncSuccess) {
    log('❌ Sync failed, aborting', 'red');
    return false;
  }
  
  // Verify sync
  const verification = await verifySync();
  
  if (verification) {
    log('\n✅ FAQ sync completed successfully!', 'green');
    log('   - FAQs are now synced to webhook server', 'green');
    log('   - Disabled FAQs should not be used for responses', 'green');
    log('   - Test with: node compare-responses.js', 'yellow');
  } else {
    log('❌ FAQ sync verification failed', 'red');
  }
  
  return syncSuccess && verification;
}

// Run sync if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSync().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runSync, syncFAQsToWebhook, verifySync, getSampleFAQs };
