import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function cloneRepository({ cloneUrl, branch, prNumber }) {
  const repoDir = path.join(__dirname, '..', 'repos', `pr-${prNumber}`);
  
  await fs.rm(repoDir, { recursive: true, force: true });
  await fs.mkdir(repoDir, { recursive: true });
  
  const git = simpleGit();
  
  let finalCloneUrl = cloneUrl;
  
  if (process.env.GITHUB_TOKEN && cloneUrl.includes('github.com')) {
    finalCloneUrl = cloneUrl.replace(
      'https://github.com/',
      `https://${process.env.GITHUB_TOKEN}@github.com/`
    );
    console.log(`Cloning private repository (branch: ${branch})...`);
  } else {
    console.log(`Cloning repository from ${cloneUrl} (branch: ${branch})...`);
  }
  
  await git.clone(finalCloneUrl, repoDir, ['--branch', branch, '--single-branch']);
  
  console.log(`Repository cloned successfully to ${repoDir}`);
  
  return repoDir;
}