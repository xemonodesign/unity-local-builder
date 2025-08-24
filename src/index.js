import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { buildUnity } from './unity-builder.js';
import { uploadToR2 } from './r2-uploader.js';
import { sendDiscordNotification } from './discord-notifier.js';
import { cloneRepository } from './git-manager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function verifyWebhookSignature(payload, signature) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature)) {
    return res.status(401).send('Unauthorized');
  }

  const event = req.headers['x-github-event'];
  
  if (event === 'pull_request') {
    const { action, pull_request } = req.body;
    
    if (action === 'opened' || action === 'synchronize') {
      res.status(200).send('Processing build');
      
      try {
        console.log(`Processing PR #${pull_request.number}: ${pull_request.title}`);
        
        await sendDiscordNotification({
          type: 'build_started',
          pr: pull_request
        });

        const repoPath = await cloneRepository({
          cloneUrl: pull_request.head.repo.clone_url,
          branch: pull_request.head.ref,
          prNumber: pull_request.number
        });

        // 複数ビルドターゲットの処理
        const buildTargetConfig = process.env.UNITY_BUILD_TARGET || 'StandaloneWindows64';
        const buildTargets = buildTargetConfig.includes(',') 
          ? buildTargetConfig.split(',').map(t => t.trim())
          : buildTargetConfig;

        const buildResults = await buildUnity({
          projectPath: repoPath,
          buildTarget: buildTargets,
          prNumber: pull_request.number
        });

        const uploadResults = await uploadToR2({
          buildResults: buildResults,
          prNumber: pull_request.number,
          branch: pull_request.head.ref
        });

        await sendDiscordNotification({
          type: 'build_success',
          pr: pull_request,
          buildResults: uploadResults
        });

      } catch (error) {
        console.error('Build failed:', error);
        await sendDiscordNotification({
          type: 'build_failed',
          pr: pull_request,
          error: error.message
        });
      }
    }
  }
  
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Unity Build Bot listening on port ${PORT}`);
});