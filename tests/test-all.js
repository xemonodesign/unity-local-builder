#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

console.log('🧪 Running all tests...\n');

const tests = [
  { name: 'Discord通知', file: 'test-discord.js' },
  { name: 'Cloudflare R2アップロード', file: 'test-r2.js' },
  { name: 'Gitクローン', file: 'test-git.js' },
  { name: 'Unity ビルド', file: 'test-unity.js' },
  { name: 'Webhook', file: 'test-webhook.js' }
];

async function runTest(testFile, testName) {
  return new Promise((resolve) => {
    const testProcess = spawn('node', [testFile], {
      stdio: 'inherit',
      cwd: path.dirname(new URL(import.meta.url).pathname)
    });

    testProcess.on('close', (code) => {
      resolve({ name: testName, passed: code === 0 });
    });
  });
}

async function runAllTests() {
  const results = [];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing: ${test.name}`);
    console.log(`${'='.repeat(50)}`);
    
    const result = await runTest(test.file, test.name);
    results.push(result);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 Test Results Summary');
  console.log(`${'='.repeat(50)}`);

  let passedCount = 0;
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.passed) passedCount++;
  });

  console.log(`\n📈 Total: ${passedCount}/${results.length} tests passed`);
  
  if (passedCount === results.length) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Check the output above for details.');
  }
}

runAllTests();