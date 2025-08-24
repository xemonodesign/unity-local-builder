#!/usr/bin/env node

import dotenv from 'dotenv';
import { uploadToR2 } from '../src/r2-uploader.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('☁️ Testing Cloudflare R2 upload...\n');

// 環境変数の確認
function checkEnvVars() {
  const requiredVars = [
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID', 
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Please check your .env file');
    process.exit(1);
  }
  
  console.log('✅ Environment variables loaded:');
  console.log(`   R2_ENDPOINT: ${process.env.R2_ENDPOINT}`);
  console.log(`   R2_BUCKET_NAME: ${process.env.R2_BUCKET_NAME}`);
  console.log(`   R2_PUBLIC_URL: ${process.env.R2_PUBLIC_URL}`);
  console.log(`   R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID?.substring(0, 8)}...`);
  console.log('');
}

async function testR2Upload() {
  // 環境変数をチェック
  checkEnvVars();
  
  try {
    // テスト用のファイルを作成
    const testFilePath = path.join(__dirname, 'test-build.txt');
    await fs.writeFile(testFilePath, 'This is a test build file for R2 upload testing.');
    console.log('📁 Created test file:', testFilePath);

    // テスト用ダミー値の場合はモックテスト
    if (process.env.R2_ACCESS_KEY_ID.includes('test') || process.env.R2_ENDPOINT.includes('test')) {
      console.log('🔄 Running in mock mode (dummy R2 credentials detected)...\n');
      
      console.log('📤 Would upload to R2...');
      console.log(`   📍 Bucket: ${process.env.R2_BUCKET_NAME}`);
      console.log(`   📍 Key: builds/pr-999/test-branch/[timestamp]/test-build.txt`);
      console.log('   ✅ R2 upload (mocked)');
      
      const mockUrl = `${process.env.R2_PUBLIC_URL}/builds/pr-999/test-branch/2024-08-24T12-00-00-000Z/test-build.txt`;
      console.log('🔗 Mock download URL:', mockUrl);
      
    } else {
      // 実際のR2アップロードテスト
      console.log('🔄 Running with real R2 credentials...\n');
      
      console.log('📤 Uploading to R2...');
      const uploadUrl = await uploadToR2({
        filePath: testFilePath,
        prNumber: 999,
        branch: 'test-branch'
      });

      console.log('✅ Upload successful!');
      console.log('🔗 Download URL:', uploadUrl);
    }

    // テストファイルを削除
    await fs.unlink(testFilePath);
    console.log('🧹 Cleaned up test file');

  } catch (error) {
    console.error('❌ R2 upload test failed:', error.message);
    process.exit(1);
  }
}

testR2Upload();