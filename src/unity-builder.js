import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildUnity({ projectPath, buildTarget, prNumber }) {
  // カンマ区切り文字列を配列に変換
  let buildTargets;
  if (Array.isArray(buildTarget)) {
    buildTargets = buildTarget;
  } else if (typeof buildTarget === 'string' && buildTarget.includes(',')) {
    buildTargets = buildTarget.split(',').map(t => t.trim());
  } else {
    buildTargets = [buildTarget];
  }
  
  console.log(`🔨 Building targets: ${buildTargets.join(', ')}`);
  const results = [];

  for (const target of buildTargets) {
    try {
      console.log(`\n🔨 Building for ${target}...`);
      const buildResult = await buildSingleTarget({ projectPath, buildTarget: target, prNumber });
      results.push({ target, success: true, path: buildResult });
    } catch (error) {
      console.error(`❌ Build failed for ${target}:`, error.message);
      results.push({ target, success: false, error: error.message });
    }
  }

  return results;
}

export async function buildSingleTarget({ projectPath, buildTarget, prNumber }) {
  const unityPath = process.env.UNITY_PATH;
  const buildOutputDir = path.join(__dirname, '..', 'builds', `pr-${prNumber}`, buildTarget);
  const buildOutputPath = path.join(buildOutputDir, `build-${buildTarget}-pr-${prNumber}`);
  
  await fs.mkdir(buildOutputDir, { recursive: true });

  const buildMethod = process.env.UNITY_BUILD_METHOD || 'BuildScript.PerformBuild';
  
  const args = [
    '-batchmode',
    '-nographics',
    '-silent-crashes',
    '-quit',
    '-projectPath', projectPath,
    '-buildTarget', buildTarget,
    '-executeMethod', buildMethod,
    '-buildPath', buildOutputPath,
    '-logFile', path.join(buildOutputDir, `build-${buildTarget}.log`)
  ];

  return new Promise((resolve, reject) => {
    console.log(`Starting Unity build for ${buildTarget} (PR #${prNumber})...`);
    console.log(`Unity command: ${unityPath} ${args.join(' ')}`);
    
    const unityProcess = spawn(unityPath, args);
    
    unityProcess.stdout.on('data', (data) => {
      console.log(`Unity (${buildTarget}): ${data}`);
    });
    
    unityProcess.stderr.on('data', (data) => {
      console.error(`Unity Error (${buildTarget}): ${data}`);
    });
    
    unityProcess.on('close', async (code) => {
      if (code !== 0) {
        const logContent = await fs.readFile(
          path.join(buildOutputDir, `build-${buildTarget}.log`), 
          'utf-8'
        ).catch(() => 'No log file found');
        reject(new Error(`Unity build failed for ${buildTarget} with code ${code}\nLog: ${logContent}`));
      } else {
        console.log(`✅ Unity build completed successfully for ${buildTarget} (PR #${prNumber})`);
        
        const finalPath = await processBuildOutput(buildOutputPath, buildTarget);
        resolve(finalPath);
      }
    });
  });
}

async function processBuildOutput(buildOutputPath, buildTarget) {
  try {
    // macOSビルドでは.appが自動的に追加される
    let actualBuildPath = buildOutputPath;
    if (buildTarget === 'OSXUniversal' || buildTarget === 'StandaloneOSX') {
      const appPath = `${buildOutputPath}.app`;
      try {
        await fs.stat(appPath);
        actualBuildPath = appPath;
      } catch {
        // .app拡張子がない場合は元のパスを使用
      }
    }
    
    const stats = await fs.stat(actualBuildPath);
    
    if (buildTarget.includes('Windows') || buildTarget === 'StandaloneWindows64' || buildTarget === 'Win64') {
      const zipPath = `${actualBuildPath}.zip`;
      await createZip(actualBuildPath, zipPath);
      return zipPath;
    } else if (buildTarget === 'StandaloneOSX' || buildTarget === 'OSXUniversal') {
      const zipPath = `${actualBuildPath}.zip`;
      await createZip(actualBuildPath, zipPath);
      return zipPath;
    } else if (buildTarget === 'WebGL') {
      // WebGLの場合はzipにせず、フォルダのパスをそのまま返す（プレビュー用）
      return actualBuildPath;
    } else {
      return actualBuildPath;
    }
  } catch (error) {
    console.error(`Failed to process build output: ${error.message}`);
    return buildOutputPath;
  }
}

async function createZip(sourcePath, outputPath) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    const stats = await fs.stat(sourcePath);
    
    if (stats.isDirectory()) {
      await execAsync(`zip -r "${outputPath}" .`, { cwd: sourcePath });
    } else {
      const dir = path.dirname(sourcePath);
      const file = path.basename(sourcePath);
      await execAsync(`zip "${outputPath}" "${file}"`, { cwd: dir });
    }
    
    console.log(`📦 Created zip: ${outputPath}`);
  } catch (error) {
    console.error(`Failed to create zip: ${error.message}`);
    throw error;
  }
}