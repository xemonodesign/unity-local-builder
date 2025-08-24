# Unity ビルドスクリプトの設定方法

## UNITY_BUILD_METHODとは？

`UNITY_BUILD_METHOD=BuildScript.PerformBuild`は、Unityプロジェクト内に定義したカスタムビルドメソッドを指定します。

- `BuildScript` = クラス名
- `PerformBuild` = メソッド名

## Unity プロジェクトでのビルドスクリプト作成

### 1. ビルドスクリプトファイルを作成

Unityプロジェクト内の `Assets/Editor/BuildScript.cs` を作成:

```csharp
using UnityEditor;
using UnityEngine;
using System.Linq;
using System;

public class BuildScript
{
    public static void PerformBuild()
    {
        // コマンドライン引数を取得
        string[] args = Environment.GetCommandLineArgs();
        string buildPath = GetArg("-buildPath", args);
        
        if (string.IsNullOrEmpty(buildPath))
        {
            Debug.LogError("Build path not specified. Use -buildPath argument.");
            EditorApplication.Exit(1);
            return;
        }

        // ビルド設定
        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions();
        
        // シーンリストを取得（Build Settingsで有効になっているシーンのみ）
        buildPlayerOptions.scenes = EditorBuildSettings.scenes
            .Where(scene => scene.enabled)
            .Select(scene => scene.path)
            .ToArray();
            
        buildPlayerOptions.locationPathName = buildPath;
        buildPlayerOptions.target = EditorUserBuildSettings.activeBuildTarget;
        buildPlayerOptions.options = BuildOptions.None;

        Debug.Log($"Building to: {buildPath}");
        Debug.Log($"Target: {buildPlayerOptions.target}");
        Debug.Log($"Scenes: {string.Join(", ", buildPlayerOptions.scenes)}");

        // ビルド実行
        var report = BuildPipeline.BuildPlayer(buildPlayerOptions);
        
        // ビルド結果を確認
        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log($"Build succeeded: {report.summary.totalSize} bytes");
            EditorApplication.Exit(0);
        }
        else
        {
            Debug.LogError($"Build failed: {report.summary.result}");
            EditorApplication.Exit(1);
        }
    }
    
    // コマンドライン引数を取得するヘルパーメソッド
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

### 2. より柔軟なビルドスクリプトの例

```csharp
using UnityEditor;
using UnityEngine;
using System.Linq;
using System;
using System.IO;

public class BuildScript
{
    public static void PerformBuild()
    {
        string[] args = Environment.GetCommandLineArgs();
        string buildPath = GetArg("-buildPath", args);
        string productName = GetArg("-productName", args) ?? PlayerSettings.productName;
        
        if (string.IsNullOrEmpty(buildPath))
        {
            Debug.LogError("Build path not specified");
            EditorApplication.Exit(1);
            return;
        }

        // プラットフォーム別の設定
        BuildTarget target = EditorUserBuildSettings.activeBuildTarget;
        
        // 出力パスの調整（プラットフォームに応じて拡張子を追加）
        string finalBuildPath = AdjustBuildPath(buildPath, target, productName);
        
        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions
        {
            scenes = EditorBuildSettings.scenes
                .Where(scene => scene.enabled)
                .Select(scene => scene.path)
                .ToArray(),
            locationPathName = finalBuildPath,
            target = target,
            options = BuildOptions.None
        };

        Debug.Log($"Building {productName} for {target} to {finalBuildPath}");

        var report = BuildPipeline.BuildPlayer(buildPlayerOptions);
        
        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log($"Build succeeded! Size: {report.summary.totalSize} bytes");
            Debug.Log($"Build time: {report.summary.totalTime}");
            EditorApplication.Exit(0);
        }
        else
        {
            Debug.LogError($"Build failed: {report.summary.result}");
            
            // エラー詳細をログ出力
            foreach (var step in report.steps)
            {
                foreach (var message in step.messages)
                {
                    if (message.type == LogType.Error || message.type == LogType.Exception)
                    {
                        Debug.LogError($"Build Error: {message.content}");
                    }
                }
            }
            
            EditorApplication.Exit(1);
        }
    }
    
    static string AdjustBuildPath(string basePath, BuildTarget target, string productName)
    {
        switch (target)
        {
            case BuildTarget.StandaloneWindows:
            case BuildTarget.StandaloneWindows64:
                return Path.Combine(basePath, $"{productName}.exe");
                
            case BuildTarget.StandaloneOSX:
                return Path.Combine(basePath, $"{productName}.app");
                
            case BuildTarget.StandaloneLinux64:
                return Path.Combine(basePath, productName);
                
            default:
                return basePath;
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

## 3. カスタムビルド設定を使用する場合

### 独自のビルド設定がある場合の例

```csharp
public class MyCustomBuildScript
{
    public static void BuildForProduction()
    {
        // プロダクション用の特別な設定でビルド
        PlayerSettings.SetScriptingDefineSymbolsForGroup(
            BuildTargetGroup.Standalone, 
            "PRODUCTION;RELEASE"
        );
        
        PerformCustomBuild();
    }
    
    public static void BuildForDevelopment()
    {
        // 開発用の設定でビルド
        PlayerSettings.SetScriptingDefineSymbolsForGroup(
            BuildTargetGroup.Standalone, 
            "DEVELOPMENT;DEBUG"
        );
        
        PerformCustomBuild();
    }
    
    static void PerformCustomBuild()
    {
        // 実際のビルド処理
    }
}
```

この場合、`.env`では：
```bash
UNITY_BUILD_METHOD=MyCustomBuildScript.BuildForProduction
```

## 4. ファイル配置

ビルドスクリプトは以下のディレクトリに配置：

```
YourUnityProject/
├── Assets/
│   └── Editor/
│       └── BuildScript.cs    # ←ここに配置
├── ProjectSettings/
└── ...
```

## 5. トラブルシューティング

### よくあるエラー

**❌ "Method 'BuildScript.PerformBuild' not found"**
- ビルドスクリプトが`Assets/Editor/`フォルダにあるか確認
- メソッドが`public static`で定義されているか確認
- クラス名とメソッド名が正しいか確認

**❌ "No scenes in build settings"**
- Unity Editor の File → Build Settings でシーンを追加
- またはスクリプト内で手動でシーンパスを指定

**❌ ビルドが途中で止まる**
- Unity のライセンスが有効か確認
- 十分なディスク容量があるか確認
- ビルドターゲットがインストールされているか確認

## 6. 確認方法

Unity Editor で手動テスト：
1. Assets/Editor/ にスクリプトを配置
2. Unity メニュー → Window → General → Console でログ確認
3. 手動でメソッドを実行して動作確認

```csharp
[MenuItem("Build/Test Build")]
public static void TestBuild()
{
    PerformBuild();
}
```