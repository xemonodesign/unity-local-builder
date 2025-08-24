# プライベートリポジトリでの設定方法

プライベートリポジトリでUnity Build Botを使用するための設定手順です。

## 1. GitHub Personal Access Token (PAT) の作成

### PAT作成手順
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" をクリック
3. 必要な権限を選択:
   - `repo` (プライベートリポジトリアクセス用)
   - `admin:repo_hook` (Webhook管理用)
4. トークンをコピーして保存

### 環境変数に追加
`.env`ファイルに以下を追加:
```bash
GITHUB_TOKEN=ghp_your_personal_access_token_here
```

## 2. Git認証の設定

### src/git-manager.jsを更新
プライベートリポジトリクローン用に認証情報を追加:

```javascript
export async function cloneRepository({ cloneUrl, branch, prNumber }) {
  const repoDir = path.join(__dirname, '..', 'repos', `pr-${prNumber}`);
  
  await fs.rm(repoDir, { recursive: true, force: true });
  await fs.mkdir(repoDir, { recursive: true });
  
  const git = simpleGit();
  
  // プライベートリポジトリの場合、認証付きURLを使用
  const authenticatedUrl = cloneUrl.replace(
    'https://github.com/',
    `https://${process.env.GITHUB_TOKEN}@github.com/`
  );
  
  console.log(`Cloning private repository (branch: ${branch})...`);
  
  await git.clone(authenticatedUrl, repoDir, ['--branch', branch, '--single-branch']);
  
  console.log(`Repository cloned successfully to ${repoDir}`);
  
  return repoDir;
}
```

## 3. Webhook設定

### 3.1 ローカル環境の準備

**ngrokを使用する場合（推奨）:**
```bash
# ngrokをインストール
npm install -g ngrok

# ngrokでローカルサーバーを公開
ngrok http 3000
```

ngrokが提供するHTTPS URLをメモ（例: `https://abc123.ngrok.io`）

### 3.2 GitHubでWebhook設定

1. **プライベートリポジトリ** → Settings → Webhooks → Add webhook
2. 設定値:
   - **Payload URL**: `https://abc123.ngrok.io/webhook` (ngrokのURL)
   - **Content type**: `application/json`
   - **Secret**: `.env`の`GITHUB_WEBHOOK_SECRET`と同じ値
   - **Events**: "Pull requests"を選択
   - **Active**: チェック

## 4. セキュリティ設定

### 4.1 .envファイル例（プライベートリポジトリ用）
```bash
# GitHub認証
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_WEBHOOK_SECRET=your_strong_secret_here

# サーバー設定
PORT=3000

# Unity設定
UNITY_PATH=/Applications/Unity/Hub/Editor/2022.3.10f1/Unity.app/Contents/MacOS/Unity
UNITY_BUILD_TARGET=StandaloneWindows64
UNITY_BUILD_METHOD=BuildScript.PerformBuild

# Cloudflare R2設定
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=unity-builds
R2_PUBLIC_URL=https://your-public-domain.com

# Discord設定
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### 4.2 セキュリティのベストプラクティス

1. **PAT権限を最小限に**:
   - 必要なリポジトリのみアクセス可能なFine-grained tokenを検討
   
2. **Webhook Secretを強力に**:
   ```bash
   # 強力なランダム文字列生成例
   openssl rand -hex 32
   ```

3. **.envファイルの保護**:
   - 絶対にGitにコミットしない
   - 適切なファイル権限を設定: `chmod 600 .env`

## 5. 動作確認

### 5.1 テスト用PRの作成
```bash
# プライベートリポジトリでテスト用ブランチ作成
git checkout -b test-build-bot
echo "test" > test.txt
git add test.txt
git commit -m "Test build bot"
git push origin test-build-bot
```

### 5.2 PR作成とbotテスト
1. GitHubでPRを作成
2. Discordに通知が来ることを確認
3. ビルドが実行されることを確認

## 6. トラブルシューティング

### よくある問題

**❌ クローンに失敗する**
- PATの権限を確認（`repo`権限が必要）
- PATが有効期限内か確認
- リポジトリ名が正しいか確認

**❌ Webhookが届かない**
- ngrokのURLが有効か確認
- Webhook Secretが一致しているか確認
- ファイアウォール設定を確認

**❌ 認証エラー**
- PATが正しく環境変数に設定されているか確認
- `.env`ファイルを再読み込み: `npm restart`

### ログ確認
```bash
# botのログをリアルタイム表示
npm run dev
```

## 7. 本番環境への移行

開発が完了したら、以下の本番環境への移行を検討:

1. **VPS/クラウドサーバーでの運用**
2. **GitHub Actionsでの実行**（別途設定が必要）
3. **Docker化**での運用

詳細は`docs/production-setup.md`を参照してください。