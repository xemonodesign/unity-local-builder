#!/usr/bin/env node

import dotenv from 'dotenv';
import { sendDiscordNotification } from '../src/discord-notifier.js';
import { mockPullRequest } from './test-data.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🔔 Testing Discord notifications...\n');

// 環境変数の確認
function checkEnvVars() {
  if (!process.env.DISCORD_WEBHOOK_URL) {
    console.error('❌ Missing DISCORD_WEBHOOK_URL environment variable');
    console.error('💡 Please set DISCORD_WEBHOOK_URL in your .env file');
    process.exit(1);
  }
  
  // テスト用ダミー値の場合は警告
  if (process.env.DISCORD_WEBHOOK_URL.includes('test_webhook_token')) {
    console.log('⚠️  Using test/dummy Discord webhook URL');
    console.log('   Notifications will not be sent to actual Discord channel');
    console.log('   Set real webhook URL for actual testing');
  } else {
    console.log('✅ Discord webhook URL loaded');
    console.log(`   Webhook URL: ${process.env.DISCORD_WEBHOOK_URL?.substring(0, 50)}...`);
  }
  console.log('');
}

async function testDiscordNotifications() {
  // 環境変数をチェック
  checkEnvVars();
  
  try {
    // テスト用ダミー値の場合はモックテスト
    if (process.env.DISCORD_WEBHOOK_URL.includes('test_webhook_token')) {
      console.log('🔄 Running in mock mode (dummy webhook URL detected)...\n');
      
      console.log('1. Testing build started notification...');
      console.log('   📤 Would send: Build Started notification');
      console.log('   ✅ Build started notification (mocked)\n');

      console.log('2. Testing build success notification...');
      console.log('   📤 Would send: Build Success notification with download link');
      console.log('   ✅ Build success notification (mocked)\n');

      console.log('3. Testing build failed notification...');
      console.log('   📤 Would send: Build Failed notification with error details');
      console.log('   ✅ Build failed notification (mocked)\n');
      
    } else {
      // 実際のDiscord通知テスト
      console.log('🔄 Running with real Discord webhook...\n');
      
      console.log('1. Testing build started notification...');
      await sendDiscordNotification({
        type: 'build_started',
        pr: mockPullRequest
      });
      console.log('✅ Build started notification sent\n');

      console.log('2. Testing build success notification...');
      await sendDiscordNotification({
        type: 'build_success',
        pr: mockPullRequest,
        downloadUrl: 'https://example.com/download/test-build.zip'
      });
      console.log('✅ Build success notification sent\n');

      console.log('3. Testing build failed notification...');
      await sendDiscordNotification({
        type: 'build_failed',
        pr: mockPullRequest,
        error: 'Test error message for demonstration'
      });
      console.log('✅ Build failed notification sent\n');
    }

  } catch (error) {
    console.error('❌ Discord test failed:', error.message);
    process.exit(1);
  }
}

testDiscordNotifications();