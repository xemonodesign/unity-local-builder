import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function cloneRepository({ cloneUrl, branch, prNumber, repoName }) {
  // リポジトリ名でベースディレクトリを作成（複数PRで共有）
  const baseRepoName = repoName || extractRepoName(cloneUrl);
  const baseRepoDir = path.join(__dirname, '..', 'repos', baseRepoName);
  const prDir = path.join(__dirname, '..', 'repos', `pr-${prNumber}`);
  
  let finalCloneUrl = cloneUrl;
  if (process.env.GITHUB_TOKEN && cloneUrl.includes('github.com')) {
    finalCloneUrl = cloneUrl.replace(
      'https://github.com/',
      `https://${process.env.GITHUB_TOKEN}@github.com/`
    );
  }
  
  try {
    // ベースリポジトリが存在するか確認
    const baseRepoExists = await checkDirectoryExists(baseRepoDir);
    const git = simpleGit();
    
    if (!baseRepoExists) {
      // 初回: ベースリポジトリをクローン
      console.log(`🔄 First time cloning repository: ${baseRepoName}`);
      await fs.mkdir(baseRepoDir, { recursive: true });
      await git.clone(finalCloneUrl, baseRepoDir);
      console.log(`✅ Base repository cloned to ${baseRepoDir}`);
    } else {
      // 既存リポジトリをアップデート
      console.log(`🔄 Updating existing repository: ${baseRepoName}`);
      const baseGit = simpleGit(baseRepoDir);
      await baseGit.fetch(['--all']);
      console.log(`✅ Repository updated`);
    }
    
    // PR専用ディレクトリの準備
    await fs.rm(prDir, { recursive: true, force: true });
    await fs.mkdir(prDir, { recursive: true });
    
    // ベースリポジトリからPR用にコピー
    console.log(`📋 Creating PR workspace: pr-${prNumber}`);
    await copyDirectory(baseRepoDir, prDir);
    
    // PR用ディレクトリで指定ブランチをチェックアウト
    const prGit = simpleGit(prDir);
    await prGit.checkout(['-B', `pr-${prNumber}`, `origin/${branch}`]);
    
    console.log(`✅ PR ${prNumber} workspace ready: ${prDir}`);
    console.log(`📂 Branch: ${branch}`);
    
    return prDir;
    
  } catch (error) {
    console.error('Git operation failed:', error.message);
    // フォールバック: 従来の全体clone方式
    console.log('🔄 Falling back to full clone method...');
    return await fullCloneRepository({ cloneUrl: finalCloneUrl, branch, prNumber });
  }
}

function extractRepoName(cloneUrl) {
  // https://github.com/owner/repo.git から "owner-repo" を抽出
  const match = cloneUrl.match(/github\.com[/:](.*?)\/(.*?)(?:\.git)?$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  // フォールバック
  return 'unknown-repo';
}

async function checkDirectoryExists(dirPath) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// フォールバック用の従来のクローン方式
async function fullCloneRepository({ cloneUrl, branch, prNumber }) {
  const repoDir = path.join(__dirname, '..', 'repos', `pr-${prNumber}`);
  
  await fs.rm(repoDir, { recursive: true, force: true });
  await fs.mkdir(repoDir, { recursive: true });
  
  const git = simpleGit();
  
  console.log(`⚠️ Full cloning repository (branch: ${branch})...`);
  await git.clone(cloneUrl, repoDir, ['--branch', branch, '--single-branch']);
  
  console.log(`Repository cloned successfully to ${repoDir}`);
  return repoDir;
}