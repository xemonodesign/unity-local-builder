import axios from 'axios';

export async function sendDiscordNotification({ type, pr, downloadUrl, buildResults, error }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured');
    return;
  }

  let embed;
  
  switch (type) {
    case 'build_started':
      embed = {
        title: '🔨 Build Started',
        description: `Building PR #${pr.number}: ${pr.title}`,
        color: 0x3498db,
        fields: [
          {
            name: 'Repository',
            value: pr.base.repo.full_name,
            inline: true
          },
          {
            name: 'Branch',
            value: pr.head.ref,
            inline: true
          },
          {
            name: 'Author',
            value: pr.user.login,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        url: pr.html_url
      };
      break;
      
    case 'build_success':
      if (buildResults && Array.isArray(buildResults)) {
        // 複数ビルド結果の場合
        const successBuilds = buildResults.filter(r => r.success);
        const failedBuilds = buildResults.filter(r => !r.success);
        
        const fields = [
          {
            name: 'Repository',
            value: pr.base.repo.full_name,
            inline: true
          },
          {
            name: 'Branch',
            value: pr.head.ref,
            inline: true
          },
          {
            name: 'Build Summary',
            value: `✅ ${successBuilds.length} success / ❌ ${failedBuilds.length} failed`,
            inline: true
          }
        ];

        // 成功したビルドのダウンロードリンク
        if (successBuilds.length > 0) {
          const downloadLinks = successBuilds
            .map(build => `🔗 [${build.target}](${build.downloadUrl})`)
            .join('\n');
          
          fields.push({
            name: '📥 Downloads',
            value: downloadLinks,
            inline: false
          });
        }

        // 失敗したビルド
        if (failedBuilds.length > 0) {
          const failedList = failedBuilds
            .map(build => `❌ ${build.target}: ${build.error?.substring(0, 100) || 'Unknown error'}`)
            .join('\n');
          
          fields.push({
            name: '💥 Build Failures',
            value: failedList,
            inline: false
          });
        }

        embed = {
          title: successBuilds.length === buildResults.length ? '✅ All Builds Successful' : '⚠️ Partial Build Success',
          description: `PR #${pr.number}: ${pr.title}`,
          color: successBuilds.length === buildResults.length ? 0x2ecc71 : 0xf39c12,
          fields: fields,
          timestamp: new Date().toISOString(),
          url: pr.html_url
        };
      } else {
        // 単一ビルド結果の場合（後方互換性）
        embed = {
          title: '✅ Build Successful',
          description: `PR #${pr.number}: ${pr.title}`,
          color: 0x2ecc71,
          fields: [
            {
              name: 'Repository',
              value: pr.base.repo.full_name,
              inline: true
            },
            {
              name: 'Branch',
              value: pr.head.ref,
              inline: true
            },
            {
              name: 'Download',
              value: `[Click here to download](${downloadUrl})`,
              inline: false
            }
          ],
          timestamp: new Date().toISOString(),
          url: pr.html_url
        };
      }
      break;
      
    case 'build_failed':
      embed = {
        title: '❌ Build Failed',
        description: `PR #${pr.number}: ${pr.title}`,
        color: 0xe74c3c,
        fields: [
          {
            name: 'Repository',
            value: pr.base.repo.full_name,
            inline: true
          },
          {
            name: 'Branch',
            value: pr.head.ref,
            inline: true
          },
          {
            name: 'Error',
            value: error ? error.substring(0, 1000) : 'Unknown error',
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        url: pr.html_url
      };
      break;
      
    default:
      return;
  }

  try {
    await axios.post(webhookUrl, {
      embeds: [embed]
    });
    console.log(`Discord notification sent: ${type}`);
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
  }
}