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
      const uploadUrl = await uploadSingleFile({
        filePath: buildResult.path,
        prNumber,
        branch,
        target: buildResult.target
      });

      return {
        target: buildResult.target,
        success: true,
        downloadUrl: uploadUrl
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