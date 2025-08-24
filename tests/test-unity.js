#!/usr/bin/env node

import dotenv from 'dotenv';
import { buildUnity } from '../src/unity-builder.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🎮 Testing Unity build functionality...\n');

// 環境変数の確認
function checkEnvVars() {
  console.log('🔍 Checking Unity configuration...');
  
  if (process.env.UNITY_PATH) {
    console.log(`   ✅ UNITY_PATH: ${process.env.UNITY_PATH}`);
  } else {
    console.log('   ❌ UNITY_PATH not set');
  }
  
  if (process.env.UNITY_BUILD_TARGET) {
    console.log(`   ✅ UNITY_BUILD_TARGET: ${process.env.UNITY_BUILD_TARGET}`);
  } else {
    console.log('   ❌ UNITY_BUILD_TARGET not set');
  }
  
  if (process.env.TEST_UNITY_PROJECT_PATH) {
    console.log(`   ✅ TEST_UNITY_PROJECT_PATH: ${process.env.TEST_UNITY_PROJECT_PATH}`);
  } else {
    console.log('   ❌ TEST_UNITY_PROJECT_PATH not set in .env file');
  }
  console.log('');
}

async function testUnityBuild() {
  try {
    console.log('⚠️  注意: このテストは実際のUnityプロジェクトが必要です');
    
    // 環境変数をチェック
    checkEnvVars();
    
    const testProjectPath = process.env.TEST_UNITY_PROJECT_PATH;
    
    if (!testProjectPath) {
      console.log('❌ TEST_UNITY_PROJECT_PATH環境変数が設定されていません');
      console.log('💡 .envファイルに以下を追加してください:');
      console.log('   TEST_UNITY_PROJECT_PATH=/path/to/unity/project');
      console.log('');
      console.log('または、コマンドラインで直接指定:');
      console.log('   TEST_UNITY_PROJECT_PATH=/path/to/unity/project npm run test:unity');
      return;
    }

    // プロジェクトパスの存在確認
    try {
      await fs.access(testProjectPath);
      console.log('✅ Unity project found at:', testProjectPath);
    } catch {
      console.error('❌ Unity project not found at:', testProjectPath);
      console.error('💡 パスが正しいか確認してください');
      return;
    }

    // Unity実行パスの存在確認
    if (process.env.UNITY_PATH) {
      try {
        await fs.access(process.env.UNITY_PATH);
        console.log('✅ Unity executable found');
      } catch {
        console.error('❌ Unity executable not found at:', process.env.UNITY_PATH);
        console.error('💡 UNITY_PATH環境変数を確認してください');
        return;
      }
    } else {
      console.error('❌ UNITY_PATH環境変数が設定されていません');
      return;
    }

    // プロジェクトファイルの確認
    const projectVersionPath = path.join(testProjectPath, 'ProjectSettings', 'ProjectVersion.txt');
    try {
      await fs.access(projectVersionPath);
      const versionContent = await fs.readFile(projectVersionPath, 'utf-8');
      const versionMatch = versionContent.match(/m_EditorVersion: (.+)/);
      if (versionMatch) {
        console.log('✅ Unity project version:', versionMatch[1]);
      }
    } catch {
      console.warn('⚠️  ProjectVersion.txt not found - might not be a valid Unity project');
    }

    console.log('\n🔨 Starting Unity build test...');
    console.log('⏳ This may take several minutes...');
    
    const buildResults = await buildUnity({
      projectPath: testProjectPath,
      buildTarget: process.env.UNITY_BUILD_TARGET || 'StandaloneWindows64',
      prNumber: 999
    });

    // ビルド結果の処理（配列の場合）
    if (Array.isArray(buildResults)) {
      console.log(`✅ Unity build test completed! (${buildResults.length} build(s))`);
      buildResults.forEach((result, index) => {
        if (result.success) {
          console.log(`📁 Build ${index + 1} (${result.target}): ${result.path}`);
        } else {
          console.log(`❌ Build ${index + 1} (${result.target}): ${result.error}`);
        }
      });
    } else {
      // 単一ビルド結果の場合
      console.log('✅ Unity build test completed!');
      console.log('📁 Build output:', buildResults);

      // ビルド結果の確認
      try {
        const stats = await fs.stat(buildResults);
        console.log('📊 Build file size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
      } catch (error) {
        console.warn('⚠️  Could not get build file stats:', error.message);
      }
    }


  } catch (error) {
    console.error('❌ Unity build test failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('- Unity Editorが正しくインストールされているか確認');
    console.log('- UNITY_PATH環境変数が正しく設定されているか確認');
    console.log('- Unityプロジェクトにビルドスクリプトが含まれているか確認');
    process.exit(1);
  }
}

testUnityBuild();