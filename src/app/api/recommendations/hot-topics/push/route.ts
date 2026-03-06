import { NextRequest, NextResponse } from "next/server";
import { HeaderUtils } from "coze-coding-dev-sdk";
import { recommendationManager, userConfigManager } from "@/storage/database";

/**
 * 热点分析推送接口
 * 每天9:30盘前自动推送热点分析到飞书
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 获取用户配置
    const userConfig = await userConfigManager.getLatestUserConfig();
    if (!userConfig || !userConfig.feishuWebhookUrl) {
      return NextResponse.json(
        { message: "未配置飞书Webhook" },
        { status: 400 }
      );
    }

    // 2. 调用热点发现接口
    const discoverUrl = new URL(
      "/api/hot-topics/discover",
      request.url
    );

    const discoverResponse = await fetch(discoverUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!discoverResponse.ok) {
      const errorData = await discoverResponse.json();
      return NextResponse.json(
        { message: `热点发现失败: ${errorData.message || "未知错误"}` },
        { status: discoverResponse.status }
      );
    }

    const discoverData = await discoverResponse.json();

    // 3. 构建热点分析推送内容
    const now = new Date();
    const dateStr = now.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timeStr = now.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    let content = `## 📊 ${dateStr} 盘前热点分析\n\n`;
    content += `**推送时间**: ${timeStr}\n\n`;

    if (discoverData.topics && discoverData.topics.length > 0) {
      content += `### 🔥 今日市场热点\n\n`;

      discoverData.topics.forEach((topic: any, idx: number) => {
        const trendEmoji = topic.trend === "rising" ? "📈" : topic.trend === "stable" ? "➡️" : "📉";
        const trendText = topic.trend === "rising" ? "上升" : topic.trend === "stable" ? "稳定" : "下降";
        const strengthBar = "█".repeat(Math.floor(topic.strength / 10)) + "░".repeat(10 - Math.floor(topic.strength / 10));
        const relatedStocks = topic.relatedStocks ? JSON.parse(topic.relatedStocks) : [];

        content += `#### ${idx + 1}. ${topic.topicName} ${trendEmoji}\n`;
        content += `- **板块**: ${topic.sector}\n`;
        content += `- **强度**: ${topic.strength}/100 ${strengthBar}\n`;
        content += `- **趋势**: ${trendText}\n`;
        content += `- **描述**: ${topic.description}\n`;
        if (relatedStocks.length > 0) {
          content += `- **相关股票**: ${relatedStocks.join(", ")}\n`;
        }
        content += `- **信源**: ${topic.sources}\n\n`;
      });

      content += `---\n\n`;
    } else {
      content += `### ℹ️ 暂无明显热点\n\n今日市场暂无明显热点，请关注盘中动态。\n\n---\n\n`;
    }

    // 4. 添加热点分析报告
    if (discoverData.report) {
      content += `### 📋 详细分析报告\n\n`;
      content += discoverData.report + "\n\n";
    }

    // 5. 添加温馨提示
    content += `---\n\n`;
    content += `💡 **温馨提示**: \n`;
    content += `- 热点分析基于24小时内的最新市场数据\n`;
    content += `- 投资有风险，入市需谨慎\n`;
    content += `- 请结合自身风险承受能力理性投资\n`;

    // 6. 推送到飞书（discover 接口已经保存了报告，这里只推送）
    const webhookUrl = userConfig.feishuWebhookUrl;
    const payload = {
      msg_type: "interactive",
      card: {
        config: {
          wide_screen_mode: true,
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: content,
            },
          },
          {
            tag: "hr",
          },
          {
            tag: "div",
            text: {
              tag: "plain_text",
              content: "⏰ 盘前9:30自动推送",
            },
          },
        ],
        header: {
          title: {
            tag: "plain_text",
            content: `📊 ${dateStr} 盘前热点分析`,
          },
          template: discoverData.topics?.length > 0 ? "orange" : "gray",
        },
      },
    };

    const feishuResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!feishuResponse.ok) {
      const errorText = await feishuResponse.text();
      throw new Error(`飞书推送失败: ${errorText}`);
    }

    return NextResponse.json({
      message: "热点分析推送成功",
      topicCount: discoverData.topics?.length || 0,
      pushedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error("热点分析推送失败:", error);
    return NextResponse.json(
      { message: error.message || "热点分析推送失败" },
      { status: 500 }
    );
  }
}

/**
 * 手动触发热点分析推送
 */
export async function GET(request: NextRequest) {
  try {
    const response = await POST(request);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "热点分析推送失败" },
      { status: 500 }
    );
  }
}
