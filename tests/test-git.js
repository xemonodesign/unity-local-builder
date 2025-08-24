#!/usr/bin/env node

import { cloneRepository } from '../src/git-manager.js';

console.log('📥 Testing Git clone functionality...\n');

async function testGitClone() {
  try {
    // パブリックリポジトリでテスト
    console.log('🔄 Cloning test repository...');
    const repoPath = await cloneRepository({
      cloneUrl: 'https://github.com/octocat/Hello-World.git',
      branch: 'master',
      prNumber: 999
    });

    console.log('✅ Repository cloned successfully!');
    console.log('📁 Repository path:', repoPath);

    // クローンされたディレクトリの内容を確認
    const { readdir } = await import('fs/promises');
    const files = await readdir(repoPath);
    console.log('📋 Repository contents:', files);

  } catch (error) {
    console.error('❌ Git clone test failed:', error.message);
    process.exit(1);
  }
}

testGitClone();