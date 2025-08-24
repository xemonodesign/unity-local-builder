# テストガイド

各機能を個別にテストするためのスクリプト集です。

## 前提条件

1. `.env`ファイルが適切に設定されていること
2. 必要なサービス（Discord Webhook、Cloudflare R2）が設定済みであること

## 個別テスト

### 1. Discord通知テスト
```bash
node tests/test-discord.js
```
- ビルド開始、成功、失敗の3つの通知をテスト
- `DISCORD_WEBHOOK_URL`が必要

### 2. Cloudflare R2アップロードテスト
```bash
node tests/test-r2.js
```
- テストファイルを作成してR2にアップロード
- R2関連の環境変数が必要

### 3. Gitクローンテスト
```bash
node tests/test-git.js
```
- パブリックリポジトリをクローンしてテスト
- 環境変数不要（パブリックリポジトリを使用）

### 4. Unity ビルドテスト
```bash
# テスト用Unityプロジェクトパスを指定
TEST_UNITY_PROJECT_PATH=/path/to/unity/project node tests/test-unity.js
```
- 実際のUnityプロジェクトが必要
- `UNITY_PATH`環境変数が必要
- 時間がかかります（数分）

### 5. Webhookテスト
```bash
# サーバーを起動してから別ターミナルで実行
npm start &
node tests/test-webhook.js
```
- サーバーが起動している必要があります
- `GITHUB_WEBHOOK_SECRET`が必要

## 全テスト実行

```bash
node tests/test-all.js
```

## トラブルシューティング

### Discord通知が送信されない
- `DISCORD_WEBHOOK_URL`が正しく設定されているか確認
- DiscordのWebhook URLが有効か確認

### R2アップロードが失敗する
- R2の認証情報が正しいか確認
- バケット名が存在するか確認
- R2のアクセス権限を確認

### Unity ビルドが失敗する
- Unityのライセンスが有効か確認
- `UNITY_PATH`が正しいか確認
- Unityプロジェクトにビルドスクリプトが含まれているか確認

### Webhookテストが失敗する
- サーバーが起動しているか確認 (`npm start`)
- `GITHUB_WEBHOOK_SECRET`が設定されているか確認
- ファイアウォールでポートがブロックされていないか確認