#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🧪 Safe Testing Mode - Checking configurations...\n');

function checkDiscordConfig() {
  console.log('🔔 Discord Configuration:');
  if (process.env.DISCORD_WEBHOOK_URL) {
    if (process.env.DISCORD_WEBHOOK_URL.includes('test_webhook_token')) {
      console.log('   ⚠️  Using test/dummy Discord webhook URL');
      console.log('   💡 Set real Discord webhook URL for actual notifications');
    } else {
      console.log('   ✅ Discord webhook URL configured');
    }
  } else {
    console.log('   ❌ DISCORD_WEBHOOK_URL not set');
  }
  console.log('');
}

function checkR2Config() {
  console.log('☁️ Cloudflare R2 Configuration:');
  const requiredVars = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
  let allSet = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      if (process.env[varName].includes('test')) {
        console.log(`   ⚠️  ${varName}: Using test/dummy value`);
      } else {
        console.log(`   ✅ ${varName}: Configured`);
      }
    } else {
      console.log(`   ❌ ${varName}: Not set`);
      allSet = false;
    }
  });
  
  if (!allSet) {
    console.log('   💡 Set real R2 credentials for actual uploads');
  }
  console.log('');
}

function checkGitHubConfig() {
  console.log('🪝 GitHub Configuration:');
  if (process.env.GITHUB_WEBHOOK_SECRET) {
    if (process.env.GITHUB_WEBHOOK_SECRET.includes('test')) {
      console.log('   ⚠️  Using test/dummy webhook secret');
    } else {
      console.log('   ✅ GitHub webhook secret configured');
    }
  } else {
    console.log('   ❌ GITHUB_WEBHOOK_SECRET not set');
  }
  
  if (process.env.GITHUB_TOKEN) {
    if (process.env.GITHUB_TOKEN.includes('test')) {
      console.log('   ⚠️  Using test/dummy GitHub token');
    } else {
      console.log('   ✅ GitHub token configured');
    }
  } else {
    console.log('   ❌ GITHUB_TOKEN not set');
  }
  console.log('');
}

function checkUnityConfig() {
  console.log('🎮 Unity Configuration:');
  if (process.env.UNITY_PATH) {
    console.log(`   ✅ Unity path: ${process.env.UNITY_PATH}`);
  } else {
    console.log('   ❌ UNITY_PATH not set');
  }
  
  if (process.env.UNITY_BUILD_TARGET) {
    console.log(`   ✅ Build target: ${process.env.UNITY_BUILD_TARGET}`);
  } else {
    console.log('   ❌ UNITY_BUILD_TARGET not set');
  }
  console.log('');
}

function provideSuggestions() {
  console.log('💡 Next Steps:');
  console.log('');
  console.log('   1. For real testing, update .env with actual values:');
  console.log('      - Set real Discord webhook URL');
  console.log('      - Set real Cloudflare R2 credentials');
  console.log('      - Set real GitHub webhook secret');
  console.log('');
  console.log('   2. For safe testing with current dummy values:');
  console.log('      - npm run test:git (works without external services)');
  console.log('      - npm run test:unity (needs Unity project path)');
  console.log('');
  console.log('   3. See docs/testing-guide.md for detailed setup instructions');
  console.log('   4. See docs/cloudflare-r2-setup.md for R2 setup');
  console.log('');
}

// 設定チェック実行
checkDiscordConfig();
checkR2Config();
checkGitHubConfig();
checkUnityConfig();
provideSuggestions();