#!/usr/bin/env node

import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import { mockWebhookPayload } from './test-data.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🪝 Testing Webhook endpoint...\n');

function createWebhookSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const signature = 'sha256=' + hmac.update(payload).digest('hex');
  return signature;
}

async function testWebhook() {
  const serverUrl = process.env.BOT_SERVER_URL || 'http://localhost:3000';
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  console.log('🔍 Checking environment variables...');
  if (!webhookSecret) {
    console.error('❌ GITHUB_WEBHOOK_SECRET environment variable is required');
    console.error('💡 Please set GITHUB_WEBHOOK_SECRET in your .env file');
    process.exit(1);
  }
  
  console.log('✅ Environment variables loaded:');
  console.log(`   Server URL: ${serverUrl}`);
  console.log(`   Webhook Secret: ${webhookSecret.substring(0, 8)}...`);
  console.log('');

  try {
    const payload = JSON.stringify(mockWebhookPayload);
    const signature = createWebhookSignature(payload, webhookSecret);

    console.log('📤 Sending webhook request to:', `${serverUrl}/webhook`);
    
    const response = await axios.post(`${serverUrl}/webhook`, mockWebhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request',
        'X-Hub-Signature-256': signature
      }
    });

    if (response.status === 200) {
      console.log('✅ Webhook test successful!');
      console.log('📋 Response:', response.data);
    } else {
      console.error('❌ Unexpected response status:', response.status);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused - make sure the bot server is running on', serverUrl);
      console.log('💡 Start the server with: npm start');
    } else {
      console.error('❌ Webhook test failed:', error.message);
    }
    process.exit(1);
  }
}

testWebhook();