# テスト実行ガイド

.envファイルの設定を使ってUnity Build Botの各機能をテストする方法です。

## 1. 事前準備

### 1.1 .envファイルの作成
```bash
# .env.exampleをコピー
cp .env.example .env
```

### 1.2 .envファイルの編集
実際の設定値を入力してください：

```bash
# GitHub Configuration
GITHUB_TOKEN=ghp_your_actual_token_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Unity Configuration
UNITY_PATH=/Applications/Unity/Hub/Editor/2022.3.10f1/Unity.app/Contents/MacOS/Unity
UNITY_BUILD_TARGET=StandaloneOSX
UNITY_BUILD_METHOD=BuildScript.PerformBuild

# Cloudflare R2 Configuration
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_actual_access_key_id
R2_SECRET_ACCESS_KEY=your_actual_secret_access_key
R2_BUCKET_NAME=unity-builds
R2_PUBLIC_URL=https://your-custom-domain.com

# Discord Configuration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

## 2. 個別機能のテスト

### 2.1 Discord通知テスト
```bash
npm run test:discord
```

**期待される出力:**
```
🔔 Testing Discord notifications...

✅ Discord webhook URL loaded
   Webhook URL: https://discord.com/api/webhooks/123456...

1. Testing build started notification...
✅ Build started notification sent

2. Testing build success notification...
✅ Build success notification sent

3. Testing build failed notification...
✅ Build failed notification sent
```

### 2.2 Cloudflare R2アップロードテスト
```bash
npm run test:r2
```

**期待される出力:**
```
☁️ Testing Cloudflare R2 upload...

✅ Environment variables loaded:
   R2_ENDPOINT: https://abc123def456.r2.cloudflarestorage.com
   R2_BUCKET_NAME: unity-builds
   R2_PUBLIC_URL: https://builds.example.com
   R2_ACCESS_KEY_ID: f1a2b3c4...

📁 Created test file: /path/to/test-build.txt
📤 Uploading to R2...
📤 Uploading build to R2: builds/pr-999/test-branch/2024-08-24T12-30-45-678Z/test-build.txt
✅ Upload successful: https://builds.example.com/builds/pr-999/test-branch/2024-08-24T12-30-45-678Z/test-build.txt
✅ Upload successful!
🔗 Download URL: https://builds.example.com/builds/pr-999/test-branch/2024-08-24T12-30-45-678Z/test-build.txt
🧹 Cleaned up test file
```

### 2.3 Gitクローンテスト
```bash
npm run test:git
```

**期待される出力:**
```
📥 Testing Git clone functionality...

🔄 Cloning test repository...
Cloning repository from https://github.com/octocat/Hello-World.git (branch: master)...
Repository cloned successfully to /path/to/repos/pr-999
✅ Repository cloned successfully!
📁 Repository path: /path/to/repos/pr-999
📋 Repository contents: [ 'README' ]
```

### 2.4 Webhookテスト
```bash
# まずbotサーバーを起動
npm start &

# 別のターミナルでテスト実行
npm run test:webhook
```

**期待される出力:**
```
🪝 Testing Webhook endpoint...

🔍 Checking environment variables...
✅ Environment variables loaded:
   Server URL: http://localhost:3000
   Webhook Secret: abc12345...

📤 Sending webhook request to: http://localhost:3000/webhook
✅ Webhook test successful!
📋 Response: Processing build
```

### 2.5 Unity ビルドテスト
```bash
# Unityプロジェクトのパスを指定してテスト
TEST_UNITY_PROJECT_PATH=/path/to/your/unity/project npm run test:unity
```

## 3. 全テスト実行

```bash
npm test
```

全テストを順番に実行し、最後に結果サマリを表示します。

## 4. よくあるエラーと対処法

### 4.1 環境変数が見つからない
```
❌ Missing required environment variables:
   - R2_ACCESS_KEY_ID
   - R2_SECRET_ACCESS_KEY
```

**対処法:** `.env`ファイルを確認し、不足している変数を追加

### 4.2 Discord通知が失敗
```
❌ Discord test failed: Request failed with status code 404
```

**対処法:** 
- Discord Webhook URLが正しいか確認
- Webhookが削除されていないか確認

### 4.3 R2アップロードが失敗
```
❌ R2 upload test failed: The AWS Access Key Id you provided does not exist in our records
```

**対処法:**
- R2のAccess Key IDとSecret Access Keyが正しいか確認
- APIトークンが有効か確認
- バケット名とエンドポイントURLが正しいか確認

### 4.4 Webhookテストが失敗
```
❌ Connection refused - make sure the bot server is running on http://localhost:3000
```

**対処法:**
```bash
# サーバーが起動していることを確認
npm start
# 別のターミナルでテスト実行
npm run test:webhook
```

## 5. デバッグのヒント

### 5.1 環境変数の確認
```bash
# .envファイルの内容を表示（機密情報は隠される）
node -e "
require('dotenv').config();
console.log('PORT:', process.env.PORT);
console.log('DISCORD_WEBHOOK_URL:', process.env.DISCORD_WEBHOOK_URL?.substring(0, 50) + '...');
console.log('R2_ENDPOINT:', process.env.R2_ENDPOINT);
console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME);
"
```

### 5.2 詳細ログの有効化
```bash
# デバッグモードで実行
DEBUG=* npm run test:r2
```

### 5.3 ネットワーク接続の確認
```bash
# R2エンドポイントへの接続確認
curl -I https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# Discord Webhookの確認
curl -X POST "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test message"}'
```

## 6. 継続的テストの設定

### 6.1 GitHub Actionsでのテスト
`.github/workflows/test.yml` を作成してCI/CDでテストを自動実行

### 6.2 定期テストの設定
```bash
# cronジョブで定期的にテスト実行
0 9 * * * cd /path/to/unity-build-bot && npm test
```

これでローカル環境での包括的なテストが可能になります！