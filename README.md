# Unity Build Bot

GitHub PR発生時にUnityビルドを自動実行し、Cloudflare R2にアップロードしてDiscordに通知するローカルbotです。

## 機能

- GitHub Webhookを受信してPRイベントを検知
- PRブランチのコードを自動クローン
- Unityビルドを自動実行
- ビルド成果物をCloudflare R2にアップロード
- Discord webhookでビルド状況を通知

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env`にコピーして、必要な値を設定:

```bash
cp .env.example .env
```

#### 必要な環境変数

- **GITHUB_WEBHOOK_SECRET**: GitHubのWebhook設定で指定するシークレット
- **UNITY_PATH**: Unityの実行パス
  - Mac: `/Applications/Unity/Hub/Editor/[version]/Unity.app/Contents/MacOS/Unity`
  - Windows: `C:\Program Files\Unity\Hub\Editor\[version]\Editor\Unity.exe`
- **UNITY_BUILD_TARGET**: ビルドターゲット（例: StandaloneWindows64, StandaloneOSX）
- **UNITY_BUILD_METHOD**: Unityプロジェクト内のビルドメソッド
- **R2設定**: Cloudflare R2のアクセス情報
- **DISCORD_WEBHOOK_URL**: Discord通知用のWebhook URL

### 3. Unityプロジェクトの準備

Unityプロジェクトの`Assets/Editor/BuildScript.cs`にビルドスクリプトを追加:

```csharp
using UnityEditor;
using UnityEngine;
using System.Linq;
using System;

public class BuildScript
{
    public static void PerformBuild()
    {
        string[] args = Environment.GetCommandLineArgs();
        string buildPath = GetArg("-buildPath", args);
        
        if (string.IsNullOrEmpty(buildPath))
        {
            Debug.LogError("Build path not specified");
            EditorApplication.Exit(1);
            return;
        }

        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions();
        buildPlayerOptions.scenes = EditorBuildSettings.scenes
            .Where(scene => scene.enabled)
            .Select(scene => scene.path)
            .ToArray();
        buildPlayerOptions.locationPathName = buildPath;
        buildPlayerOptions.target = EditorUserBuildSettings.activeBuildTarget;
        buildPlayerOptions.options = BuildOptions.None;
        
        var report = BuildPipeline.BuildPlayer(buildPlayerOptions);
        
        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log("Build succeeded!");
            EditorApplication.Exit(0);
        }
        else
        {
            Debug.LogError($"Build failed: {report.summary.result}");
            EditorApplication.Exit(1);
        }
    }
    
    static string GetArg(string name, string[] args)
    {
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == name && args.Length > i + 1)
            {
                return args[i + 1];
            }
        }
        return null;
    }
}
```

**詳細なビルドスクリプト設定方法は `docs/unity-build-script.md` を参照してください。**

### 4. GitHub Webhook設定

1. GitHubリポジトリの Settings > Webhooks > Add webhook
2. Payload URL: `http://your-server:3000/webhook`
3. Content type: `application/json`
4. Secret: `.env`の`GITHUB_WEBHOOK_SECRET`と同じ値
5. Events: "Pull requests"を選択

### 5. Cloudflare R2設定

1. Cloudflare DashboardでR2バケットを作成
2. API トークンを生成（R2の読み書き権限）
3. パブリックアクセス用のカスタムドメインを設定（オプション）

### 6. Discord Webhook設定

1. Discordチャンネルの設定 > 連携サービス > Webhook
2. 新しいWebhookを作成
3. Webhook URLを`.env`に設定

## 起動方法

```bash
# 本番環境
npm start

# 開発環境（ファイル変更監視）
npm run dev
```

## 使用方法

1. botを起動
2. 対象リポジトリでPRを作成または更新
3. 自動的にビルドが開始され、Discordに通知
4. ビルド完了後、ダウンロードリンクがDiscordに投稿

## トラブルシューティング

### Unityビルドが失敗する場合

- Unityのライセンスが有効か確認
- ビルドメソッドが正しく実装されているか確認
- `builds/pr-*/build.log`でエラーログを確認

### Webhookが受信できない場合

- ファイアウォールやルーターの設定を確認
- ngrokなどのトンネリングサービスを使用する場合:
  ```bash
  ngrok http 3000
  ```

## セキュリティ注意事項

- `.env`ファイルは絶対にGitにコミットしない
- Webhook secretは強力なランダム文字列を使用
- R2のアクセスキーは最小限の権限で設定