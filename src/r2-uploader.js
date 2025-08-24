import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

export async function uploadToR2({ buildResults, filePath, prNumber, branch }) {
  // 後方互換性のため、単一ファイルアップロードも対応
  if (filePath) {
    return await uploadSingleFile({ filePath, prNumber, branch });
  }

  // 複数ビルド結果のアップロード
  if (!buildResults || !Array.isArray(buildResults)) {
    throw new Error('buildResults must be an array');
  }

  console.log(`📤 Uploading ${buildResults.length} builds to R2...`);
  
  const uploadPromises = buildResults.map(async (buildResult) => {
    if (!buildResult.success) {
      return {
        target: buildResult.target,
        success: false,
        error: buildResult.error
      };
    }

    try {
      let uploadResult;
      
      // WebGLの場合は特別な処理
      if (buildResult.target === 'WebGL') {
        uploadResult = await uploadWebGLBuild({
          buildPath: buildResult.path,
          prNumber,
          branch,
          target: buildResult.target
        });
      } else {
        const uploadUrl = await uploadSingleFile({
          filePath: buildResult.path,
          prNumber,
          branch,
          target: buildResult.target
        });
        uploadResult = { downloadUrl: uploadUrl };
      }

      return {
        target: buildResult.target,
        success: true,
        ...uploadResult
      };
    } catch (error) {
      console.error(`Failed to upload ${buildResult.target}:`, error.message);
      return {
        target: buildResult.target,
        success: false,
        error: error.message
      };
    }
  });

  const uploadResults = await Promise.all(uploadPromises);
  
  const successCount = uploadResults.filter(r => r.success).length;
  console.log(`✅ Successfully uploaded ${successCount}/${uploadResults.length} builds`);
  
  return uploadResults;
}

export async function uploadWebGLBuild({ buildPath, prNumber, branch, target }) {
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseKey = `builds/pr-${prNumber}/${branch}/${timestamp}/${target}`;
  
  console.log(`📤 Uploading WebGL build directory to R2: ${baseKey}/`);

  try {
    const filePaths = await getFilesRecursively(buildPath);
    const uploadPromises = [];

    for (const filePath of filePaths) {
      const relativePath = path.relative(buildPath, filePath);
      const key = `${baseKey}/${relativePath}`;
      
      const fileContent = await fs.readFile(filePath);
      const contentType = getContentType(relativePath);
      const contentEncoding = getContentEncoding(relativePath);
      
      const uploadParams = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        // WebGLに必要なCORSヘッダーを設定
        Metadata: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD',
          'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding'
        }
      };
      
      // 圧縮ファイルの場合はContent-Encodingヘッダーを追加
      if (contentEncoding) {
        uploadParams.ContentEncoding = contentEncoding;
        console.log(`📦 Setting Content-Encoding: ${contentEncoding} for ${relativePath}`);
      }

      uploadPromises.push(r2Client.send(new PutObjectCommand(uploadParams)));
    }

    await Promise.all(uploadPromises);
    
    const previewUrl = `${process.env.R2_PUBLIC_URL}/${baseKey}/index.html`;
    console.log(`✅ WebGL build uploaded successfully. Preview: ${previewUrl}`);
    
    return { 
      previewUrl: previewUrl,
      downloadUrl: previewUrl // 後方互換性のため
    };
  } catch (error) {
    console.error('Failed to upload WebGL build to R2:', error);
    throw new Error(`WebGL R2 upload failed: ${error.message}`);
  }
}

async function getFilesRecursively(dirPath) {
  const filePaths = [];
  
  async function walkDir(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile()) {
        filePaths.push(fullPath);
      }
    }
  }
  
  await walkDir(dirPath);
  return filePaths;
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  // .br、.gz圧縮ファイルの場合は、圧縮前の拡張子を見る
  let actualExt = ext;
  if (ext === '.br' || ext === '.gz') {
    const nameWithoutCompression = fileName.replace(/\.(br|gz)$/, '');
    actualExt = path.extname(nameWithoutCompression).toLowerCase();
  }
  
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.data': 'application/octet-stream',
    '.unityweb': 'application/octet-stream'
  };
  
  return contentTypes[actualExt] || 'application/octet-stream';
}

function getContentEncoding(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.br') {
    return 'br';
  } else if (ext === '.gz') {
    return 'gzip';
  }
  return null;
}

export async function uploadSingleFile({ filePath, prNumber, branch, target = null }) {
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const fileContent = await fs.readFile(filePath);
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const key = target 
    ? `builds/pr-${prNumber}/${branch}/${timestamp}/${target}/${fileName}`
    : `builds/pr-${prNumber}/${branch}/${timestamp}/${fileName}`;

  const uploadParams = {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: fileName.endsWith('.zip') ? 'application/zip' : 'application/octet-stream',
  };

  try {
    console.log(`📤 Uploading ${target || 'build'} to R2: ${key}`);
    
    await r2Client.send(new PutObjectCommand(uploadParams));
    
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log(`✅ Upload successful: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('Failed to upload to R2:', error);
    throw new Error(`R2 upload failed: ${error.message}`);
  }
}