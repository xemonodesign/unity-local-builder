using UnityEditor;
using UnityEngine;
using System;
using System.Linq;

public class BuildScript
{
    public static void PerformBuild()
    {
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
        
        // Build Settingsで有効になっているシーンを取得
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