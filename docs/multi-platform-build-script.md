# マルチプラットフォーム対応Unityビルドスクリプト

複数プラットフォームを順次ビルドするためのUnityスクリプト例です。

## 1. 基本的なマルチプラットフォームビルドスクリプト

`Assets/Editor/MultiPlatformBuildScript.cs`:

```csharp
using UnityEditor;
using UnityEngine;
using System;
using System.IO;
using System.Linq;

public class MultiPlatformBuildScript
{
    public static void PerformBuild()
    {
        string[] args = Environment.GetCommandLineArgs();
        string buildPath = GetArg("-buildPath", args);
        string targetStr = GetArg("-buildTarget", args);
        
        if (string.IsNullOrEmpty(buildPath) || string.IsNullOrEmpty(targetStr))
        {
            Debug.LogError("Build path and target must be specified");
            EditorApplication.Exit(1);
            return;
        }

        // ビルドターゲットを解析
        if (Enum.TryParse<BuildTarget>(targetStr, out BuildTarget target))
        {
            PerformSingleBuild(buildPath, target);
        }
        else
        {
            Debug.LogError($"Invalid build target: {targetStr}");
            EditorApplication.Exit(1);
        }
    }
    
    static void PerformSingleBuild(string buildPath, BuildTarget target)
    {
        // ビルドターゲットを切り替え
        EditorUserBuildSettings.SwitchActiveBuildTarget(
            BuildPipeline.GetBuildTargetGroup(target), 
            target
        );
        
        Debug.Log($"Building for {target} to {buildPath}");
        
        // プラットフォーム固有の設定
        ConfigurePlatformSettings(target);
        
        // 出力パスを調整
        string finalBuildPath = AdjustBuildPath(buildPath, target);
        
        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions
        {
            scenes = EditorBuildSettings.scenes
                .Where(scene => scene.enabled)
                .Select(scene => scene.path)
                .ToArray(),
            locationPathName = finalBuildPath,
            target = target,
            options = GetBuildOptions(target)
        };

        var report = BuildPipeline.BuildPlayer(buildPlayerOptions);
        
        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log($"✅ Build succeeded for {target}");
            Debug.Log($"📊 Size: {FormatBytes(report.summary.totalSize)}");
            Debug.Log($"⏱️ Time: {report.summary.totalTime}");
            EditorApplication.Exit(0);
        }
        else
        {
            Debug.LogError($"❌ Build failed for {target}: {report.summary.result}");
            LogBuildErrors(report);
            EditorApplication.Exit(1);
        }
    }
    
    static void ConfigurePlatformSettings(BuildTarget target)
    {
        switch (target)
        {
            case BuildTarget.StandaloneWindows64:
                PlayerSettings.SetScriptingBackend(BuildTargetGroup.Standalone, ScriptingImplementation.Mono2x);
                PlayerSettings.SetApiCompatibilityLevel(BuildTargetGroup.Standalone, ApiCompatibilityLevel.NET_Standard_2_0);
                break;
                
            case BuildTarget.StandaloneOSX:
                PlayerSettings.SetScriptingBackend(BuildTargetGroup.Standalone, ScriptingImplementation.Mono2x);
                PlayerSettings.macOS.buildNumber = "1.0";
                break;
                
            case BuildTarget.WebGL:
                PlayerSettings.SetScriptingBackend(BuildTargetGroup.WebGL, ScriptingImplementation.IL2CPP);
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
                PlayerSettings.WebGL.memorySize = 512;
                break;
                
            case BuildTarget.iOS:
                PlayerSettings.SetScriptingBackend(BuildTargetGroup.iOS, ScriptingImplementation.IL2CPP);
                PlayerSettings.iOS.buildNumber = "1";
                break;
                
            case BuildTarget.Android:
                PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
                PlayerSettings.Android.bundleVersionCode = 1;
                break;
        }
    }
    
    static string AdjustBuildPath(string basePath, BuildTarget target)
    {
        string productName = PlayerSettings.productName;
        
        switch (target)
        {
            case BuildTarget.StandaloneWindows:
            case BuildTarget.StandaloneWindows64:
                return Path.Combine(basePath, $"{productName}.exe");
                
            case BuildTarget.StandaloneOSX:
                return Path.Combine(basePath, $"{productName}.app");
                
            case BuildTarget.StandaloneLinux64:
                return Path.Combine(basePath, productName);
                
            case BuildTarget.WebGL:
                return basePath; // WebGLはディレクトリ
                
            case BuildTarget.iOS:
                return basePath; // iOSはXcodeプロジェクト
                
            case BuildTarget.Android:
                return Path.Combine(basePath, $"{productName}.apk");
                
            default:
                return basePath;
        }
    }
    
    static BuildOptions GetBuildOptions(BuildTarget target)
    {
        BuildOptions options = BuildOptions.None;
        
        // デバッグ情報を含める場合
        if (GetBoolArg("-development"))
        {
            options |= BuildOptions.Development;
        }
        
        // プロファイラー接続を有効にする場合
        if (GetBoolArg("-enableProfiler"))
        {
            options |= BuildOptions.ConnectWithProfiler;
        }
        
        // プラットフォーム固有の設定
        switch (target)
        {
            case BuildTarget.WebGL:
                // WebGLでは圧縮を有効にする
                options |= BuildOptions.CompressWithLz4HC;
                break;
        }
        
        return options;
    }
    
    static void LogBuildErrors(UnityEditor.Build.Reporting.BuildReport report)
    {
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
    }
    
    static string FormatBytes(ulong bytes)
    {
        string[] suffixes = { "B", "KB", "MB", "GB" };
        int counter = 0;
        decimal number = bytes;
        
        while (Math.Round(number / 1024) >= 1)
        {
            number /= 1024;
            counter++;
        }
        
        return $"{number:n1} {suffixes[counter]}";
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
    
    static bool GetBoolArg(string name)
    {
        string[] args = Environment.GetCommandLineArgs();
        return args.Contains(name);
    }
}
```

## 2. 環境変数による設定

`.env`ファイルでの設定例:

```bash
# 単一プラットフォーム
UNITY_BUILD_TARGET=StandaloneOSX
UNITY_BUILD_METHOD=MultiPlatformBuildScript.PerformBuild

# 複数プラットフォーム（カンマ区切り）
UNITY_BUILD_TARGET=StandaloneOSX,StandaloneWindows64,WebGL
UNITY_BUILD_METHOD=MultiPlatformBuildScript.PerformBuild
```

## 3. プロダクション用ビルドスクリプト

プロダクション用の最適化されたビルド:

```csharp
using UnityEditor;
using UnityEngine;
using System;
using System.IO;
using System.Linq;

public class ProductionBuildScript
{
    public static void BuildAllPlatforms()
    {
        string[] platforms = { "StandaloneWindows64", "StandaloneOSX", "WebGL" };
        string baseBuildPath = GetArg("-buildPath", Environment.GetCommandLineArgs());
        
        if (string.IsNullOrEmpty(baseBuildPath))
        {
            Debug.LogError("Build path not specified");
            EditorApplication.Exit(1);
            return;
        }

        foreach (string platformStr in platforms)
        {
            if (Enum.TryParse<BuildTarget>(platformStr, out BuildTarget target))
            {
                try
                {
                    string platformPath = Path.Combine(baseBuildPath, platformStr);
                    Directory.CreateDirectory(platformPath);
                    
                    Debug.Log($"🔨 Building {platformStr}...");
                    PerformOptimizedBuild(platformPath, target);
                    Debug.Log($"✅ {platformStr} build completed");
                }
                catch (Exception e)
                {
                    Debug.LogError($"❌ {platformStr} build failed: {e.Message}");
                }
            }
        }
        
        Debug.Log("🎉 All builds completed!");
        EditorApplication.Exit(0);
    }
    
    static void PerformOptimizedBuild(string buildPath, BuildTarget target)
    {
        // プロダクション用の最適化設定
        PlayerSettings.stripEngineCode = true;
        PlayerSettings.SetManagedStrippingLevel(BuildTargetGroup.Standalone, ManagedStrippingLevel.High);
        
        // プラットフォーム別最適化
        ApplyPlatformOptimizations(target);
        
        // ビルド実行
        EditorUserBuildSettings.SwitchActiveBuildTarget(
            BuildPipeline.GetBuildTargetGroup(target), 
            target
        );
        
        string finalPath = AdjustBuildPath(buildPath, target);
        
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = EditorBuildSettings.scenes
                .Where(scene => scene.enabled)
                .Select(scene => scene.path)
                .ToArray(),
            locationPathName = finalPath,
            target = target,
            options = BuildOptions.None
        };
        
        var report = BuildPipeline.BuildPlayer(options);
        
        if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            throw new Exception($"Build failed: {report.summary.result}");
        }
    }
    
    static void ApplyPlatformOptimizations(BuildTarget target)
    {
        switch (target)
        {
            case BuildTarget.StandaloneWindows64:
                PlayerSettings.SetScriptingBackend(BuildTargetGroup.Standalone, ScriptingImplementation.IL2CPP);
                break;
                
            case BuildTarget.WebGL:
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
                PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
                PlayerSettings.WebGL.debugSymbols = false;
                break;
        }
    }
    
    // ヘルパーメソッド
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
    
    static string AdjustBuildPath(string basePath, BuildTarget target)
    {
        string productName = PlayerSettings.productName;
        
        switch (target)
        {
            case BuildTarget.StandaloneWindows:
            case BuildTarget.StandaloneWindows64:
                return Path.Combine(basePath, $"{productName}.exe");
                
            case BuildTarget.StandaloneOSX:
                return Path.Combine(basePath, $"{productName}.app");
                
            case BuildTarget.StandaloneLinux64:
                return Path.Combine(basePath, productName);
                
            case BuildTarget.WebGL:
                return basePath; // WebGLはディレクトリ
                
            case BuildTarget.iOS:
                return basePath; // iOSはXcodeプロジェクト
                
            case BuildTarget.Android:
                return Path.Combine(basePath, $"{productName}.apk");
                
            default:
                return basePath;
        }
    }
}
```

## 4. 使用例

### 単一プラットフォーム
```bash
UNITY_BUILD_TARGET=StandaloneOSX
UNITY_BUILD_METHOD=MultiPlatformBuildScript.PerformBuild
```

### 複数プラットフォーム（順次ビルド）
```bash
UNITY_BUILD_TARGET=StandaloneOSX,StandaloneWindows64,WebGL
UNITY_BUILD_METHOD=MultiPlatformBuildScript.PerformBuild
```

### 全プラットフォーム（一括ビルド）
```bash
UNITY_BUILD_METHOD=ProductionBuildScript.BuildAllPlatforms
```

## 5. トラブルシューティング

### WebGLビルドが失敗する
- IL2CPPが必要: `PlayerSettings.SetScriptingBackend(BuildTargetGroup.WebGL, ScriptingImplementation.IL2CPP)`
- メモリ設定を調整: `PlayerSettings.WebGL.memorySize = 512`

### iOSビルドが失敗する
- Xcodeがインストールされているか確認
- iOS Build Supportがインストールされているか確認

### Androidビルドが失敗する
- Android SDKとNDKが設定されているか確認
- Java JDKが設定されているか確認

### ビルドサイズが大きい
- Managed Stripping Levelを"High"に設定
- `PlayerSettings.stripEngineCode = true`を設定
- 使用していないアセットを削除