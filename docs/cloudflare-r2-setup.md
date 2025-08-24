# Cloudflare R2 設定ガイド

Unity Build BotでCloudflare R2を使用するための設定手順です。

## 1. Cloudflare アカウント設定

### 1.1 Cloudflareアカウントにログイン
1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. 左サイドバーから **R2 Object Storage** をクリック

### 1.2 R2バケットの作成
1. **Create bucket** ボタンをクリック
2. バケット名を入力（例: `unity-builds`）
3. リージョンを選択（推奨: **Auto**）
4. **Create bucket** をクリック

## 2. API トークン（アクセスキー）の作成

### 2.1 R2 API トークンページへ移動
1. Cloudflare Dashboard → **R2 Object Storage** → **Manage R2 API Tokens**
2. または直接 [R2 API Tokens](https://dash.cloudflare.com/?to=/:account/r2/api-tokens) へ

### 2.2 新しいAPIトークンを作成
1. **Create API token** ボタンをクリック
2. 設定項目を入力：

#### 基本設定
- **Token name**: `Unity Build Bot` （任意の名前）
- **Permissions**: 
  - **Object Read & Write** を選択

#### バケット権限の設定
- **Include** を選択
- **Bucket**: 作成したバケット名（例: `unity-builds`）を選択

#### オプション設定（推奨）
- **Client IP Address Filtering**: 
  - botを動かすマシンのIPアドレスを指定（セキュリティ向上）
- **TTL (Time to Live)**: 
  - 期限を設定（例: 1年後）

3. **Create API token** をクリック

### 2.3 認証情報の取得
作成完了画面で以下の情報が表示されます：

```
Access Key ID: f1a2b3c4d5e6f7g8h9i0
Secret Access Key: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

**⚠️ 重要**: この情報は一度しか表示されません！必ずコピーして保存してください。

## 3. エンドポイントURL の確認

### 3.1 アカウント ID の確認
1. Cloudflare Dashboard → 右サイドバーの **Account ID** をコピー

### 3.2 エンドポイント URL
R2エンドポイントのフォーマット：
```
https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

例：アカウントIDが `abc123def456` の場合
```
https://abc123def456.r2.cloudflarestorage.com
```

## 4. .env ファイルの設定

取得した情報を `.env` ファイルに設定：

```bash
# Cloudflare R2 Configuration
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=f1a2b3c4d5e6f7g8h9i0
R2_SECRET_ACCESS_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
R2_BUCKET_NAME=unity-builds
R2_PUBLIC_URL=https://your-custom-domain.com
```

### 設定項目の説明
- **R2_ENDPOINT**: アカウントIDを含むR2エンドポイントURL
- **R2_ACCESS_KEY_ID**: 作成したAPIトークンのAccess Key ID
- **R2_SECRET_ACCESS_KEY**: 作成したAPIトークンのSecret Access Key
- **R2_BUCKET_NAME**: 作成したバケット名
- **R2_PUBLIC_URL**: パブリックアクセス用URL（後述）

## 5. パブリックアクセスの設定（オプション）

### 5.1 カスタムドメインの設定
ビルドファイルを直接ダウンロードできるようにする場合：

1. **R2 → バケット → Settings**
2. **Custom Domains** セクション
3. **Connect Domain** をクリック
4. ドメイン名を入力（例: `builds.example.com`）
5. DNS設定を完了

### 5.2 パブリックアクセスポリシー（非推奨）
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::unity-builds/*"
    }
  ]
}
```

**⚠️ セキュリティ注意**: パブリックアクセスは慎重に検討してください。

## 6. 接続テスト

### 6.1 テストスクリプト実行
```bash
npm run test:r2
```

### 6.2 手動テスト
```bash
# AWS CLI を使用した接続テスト
aws s3 ls s3://unity-builds \
  --endpoint-url=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --profile=r2
```

## 7. トラブルシューティング

### よくあるエラー

**❌ "Access Denied"**
- APIトークンの権限を確認
- バケット名が正しいか確認
- エンドポイントURLにアカウントIDが含まれているか確認

**❌ "Invalid endpoint"**
- `R2_ENDPOINT`にアカウントIDが含まれているか確認
- URLが `https://` で始まっているか確認

**❌ "Bucket does not exist"**
- バケット名のスペルを確認
- バケットが正しいアカウントに作成されているか確認

**❌ "Rate limit exceeded"**
- APIトークンの使用頻度制限を確認
- 必要に応じて複数のトークンを作成

### セキュリティのベストプラクティス

1. **最小権限の原則**
   - 必要最小限の権限のみ付与
   - 特定のバケットのみアクセス許可

2. **IP制限**
   - APIトークンに送信元IP制限を設定

3. **定期的なローテーション**
   - APIトークンを定期的に再生成

4. **監視**
   - R2の使用量とアクセスログを監視

## 8. コスト管理

### R2の料金体系（2024年時点）
- **ストレージ**: $0.015 per GB/month
- **Class A operations** (PUT, POST): $4.50 per million
- **Class B operations** (GET, HEAD): $0.36 per million
- **データ転送**: 無料（Cloudflareネットワーク経由）

### コスト最適化のヒント
1. 古いビルドファイルを定期的に削除
2. ライフサイクルポリシーを設定
3. 必要に応じて複数バケットを使用（PR毎など）

## 9. 高度な設定

### プリサインドURLの使用
```javascript
// 期限付きダウンロードURLの生成例
const presignedUrl = await r2Client.send(new GetObjectCommand({
  Bucket: 'unity-builds',
  Key: 'builds/pr-123/build.zip',
  Expires: 3600 // 1時間
}));
```

### Cross-Origin Resource Sharing (CORS)
WebGLビルドの場合のCORS設定：
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```