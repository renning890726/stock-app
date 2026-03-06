import { NextRequest, NextResponse } from "next/server";
import { SearchClient, LLMClient, HeaderUtils, Config } from "coze-coding-dev-sdk";
import { hotTopicsManager } from "@/storage/database/hotTopicsManager";

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 1. 搜索今日市场热点
    const searchConfig = new Config();
    // @ts-ignore
    const searchClient = new SearchClient(searchConfig, customHeaders as any);

    const searchQueries = [
      "A股 今日热点板块 2026",
      "股市热门概念 资金流入",
      "A股板块轮动 主力资金动向",
      "A股市场热点题材",
    ];

    const allResults: any[] = [];

    for (const query of searchQueries) {
      try {
        const response = await searchClient.webSearch(query, 5, false);
        if (response.web_items && response.web_items.length > 0) {
          allResults.push(...response.web_items);
        }
      } catch (error) {
        console.error(`搜索失败: ${query}`, error);
      }
    }

    if (allResults.length === 0) {
      return NextResponse.json({ message: "未找到热点信息" }, { status: 404 });
    }

    // 2. 先使用LLM分析并提取热点信息（JSON格式）
    const llmConfig = new Config();
    // @ts-ignore
    const llmClient = new LLMClient(llmConfig, customHeaders as any);

    // 第一步：提取热点信息（JSON格式）
    const extractPrompt = `你是一位专业的A股市场分析师，擅长识别和评估市场热点。

你的任务是基于搜索结果，分析并提取当前A股市场的热点。

请严格按照以下JSON格式输出结果：

\`\`\`json
{
  "hotTopics": [
    {
      "topicName": "热点名称（如：AI人工智能）",
      "sector": "所属板块（如：科技）",
      "strength": 热点强度评分（0-100的数值）,
      "trend": "趋势（rising/stable/declining）",
      "keywords": "关键词1,关键词2,关键词3",
      "description": "热点描述（50-100字）",
      "relatedStocks": ["股票代码1", "股票代码2"],
      "sources": "主要信源"
    }
  ]
}
\`\`\`

评估标准：
- strength（强度）：0-100分，考虑因素包括：涨幅、资金流入、新闻报道数量、市场关注度
- trend（趋势）：
  * rising: 热点正在上升，有持续增强趋势
  * stable: 热点稳定，维持当前热度
  * declining: 热点正在衰退

要求：
1. 只提取强度评分 >= 60 的热点
2. 每个热点必须包含至少2个相关股票代码
3. 输出必须是有效的JSON格式
4. 热点数量控制在3-5个`;

    const searchResultsText = allResults
      .map(
        (item, idx) => `${idx + 1}. ${item.title}\n   ${item.snippet || ""}\n   来源：${item.site_name}`
      )
      .join("\n\n");

    const extractMessages = [
      { role: "system" as const, content: extractPrompt },
      { role: "user" as const, content: `基于以下搜索结果，分析当前A股市场的热点：\n\n${searchResultsText}` },
    ];

    const extractResponse = await llmClient.invoke(extractMessages, { temperature: 0.3 });

    // 3. 解析LLM返回的JSON
    const content = extractResponse.content.trim();
    let parsedData: any;

    try {
      // 提取JSON部分（可能被markdown代码块包裹）
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedData = JSON.parse(jsonStr);
    } catch (error) {
      console.error("解析JSON失败:", content);
      return NextResponse.json({ message: "热点分析失败" }, { status: 500 });
    }

    if (!parsedData.hotTopics || parsedData.hotTopics.length === 0) {
      return NextResponse.json({ message: "未发现有效热点" }, { status: 404 });
    }

    // 4. 保存热点到数据库
    const savedTopics = [];
    const now = new Date();

    // 先停用所有旧热点
    const activeTopics = await hotTopicsManager.getActiveHotTopics();
    for (const topic of activeTopics) {
      await hotTopicsManager.deactivateHotTopic(topic.id);
    }

    // 保存新热点
    for (const topic of parsedData.hotTopics) {
      try {
        const saved = await hotTopicsManager.createHotTopic({
          topicName: topic.topicName,
          sector: topic.sector,
          strength: topic.strength,
          trend: topic.trend,
          keywords: topic.keywords,
          description: topic.description,
          relatedStocks: JSON.stringify(topic.relatedStocks || []),
          sources: topic.sources,
          isActive: 1,
        });
        savedTopics.push(saved);
      } catch (error) {
        console.error(`保存热点失败: ${topic.topicName}`, error);
      }
    }

    // 4. 生成热点分析报告
    const reportPrompt = `你是一位专业的A股市场分析师，擅长分析市场热点和趋势。

你的任务是基于当前发现的热点，生成一份详细的热点分析报告。

当前热点信息：
${savedTopics.map((t: any, idx: number) =>
  `${idx + 1}. ${t.topicName}（${t.sector}）\n   强度：${t.strength}/100\n   趋势：${t.trend === 'rising' ? '上升' : t.trend === 'stable' ? '稳定' : '下降'}\n   描述：${t.description}\n   相关股票：${t.relatedStocks ? JSON.parse(t.relatedStocks).join(', ') : '无'}\n   信源：${t.sources}`
).join('\n\n')}

请严格按照以下格式输出报告（600字以内）：

## 市场热点概览

[简要总结当前市场的主要热点板块和整体趋势，80字以内]

## 热点板块分析

[对每个热点板块进行详细分析，包括：
- 板块上涨原因和驱动因素
- 资金流入情况
- 市场关注度和持续性评估]

## 趋势研判

[对热点板块的未来趋势进行研判，分析哪些热点有望持续，哪些可能分化]

## 个股推荐

[基于热点分析，推荐2-3只值得关注的个股，包括：
- 股票代码和名称
- 推荐理由（与热点关联度）
- 操作建议]`;

    const reportMessages = [
      { role: "system" as const, content: reportPrompt },
      { role: "user" as const, content: "请生成热点分析报告。" },
    ];

    const reportResponse = await llmClient.invoke(reportMessages, { temperature: 0.7 });
    const reportContent = reportResponse.content || "";

    // 5. 保存报告到推荐表（type: hot 表示市场热点报告）
    const { recommendationManager, userConfigManager } = await import("@/storage/database");

    const recommendation = await recommendationManager.createRecommendation({
      type: "hot",
      content: reportContent,
      explanation: `【发现热点】发现${savedTopics.length}个热点：${savedTopics.map((t: any) => t.topicName).join(', ')}`,
      sources: `热点数量：${savedTopics.length}\n强度最高：${savedTopics.reduce((max: any, t: any) => Number(t.strength) > Number(max.strength) ? t : max).topicName}`,
    });

    // 6. 推送到飞书（如果配置了）
    const userConfig = await userConfigManager.getLatestUserConfig();
    if (userConfig && userConfig.feishuWebhookUrl) {
      try {
        await pushToFeishu(userConfig.feishuWebhookUrl, {
          report: reportContent,
          topics: savedTopics,
        });
        console.log("热点报告已推送到飞书");
      } catch (error) {
        console.error("推送飞书失败:", error);
      }
    }

    return NextResponse.json({
      message: `成功发现 ${savedTopics.length} 个热点`,
      topics: savedTopics,
      report: reportContent,
      recommendationId: recommendation.id,
    });
  } catch (error: any) {
    console.error("发现热点失败:", error);
    return NextResponse.json(
      { message: error.message || "发现热点失败" },
      { status: 500 }
    );
  }
}

/**
 * 推送热点报告到飞书
 */
async function pushToFeishu(webhookUrl: string, data: { report: string; topics: any[] }) {
  const { report, topics } = data;

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

  let content = `## 📊 ${dateStr} 市场热点分析\n\n`;
  content += `**推送时间**: ${timeStr}\n\n`;

  if (topics && topics.length > 0) {
    content += `### 🔥 今日市场热点\n\n`;

    topics.forEach((topic: any, idx: number) => {
      const trendEmoji = topic.trend === "rising" ? "📈" : topic.trend === "stable" ? "➡️" : "📉";
      const trendText = topic.trend === "rising" ? "上升" : topic.trend === "stable" ? "稳定" : "下降";
      const strengthBar = "█".repeat(Math.floor(Number(topic.strength) / 10)) + "░".repeat(10 - Math.floor(Number(topic.strength) / 10));
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
  }

  // 添加热点分析报告
  if (report) {
    content += `### 📋 详细分析报告\n\n`;
    content += report + "\n\n";
  }

  // 添加温馨提示
  content += `---\n\n`;
  content += `💡 **温馨提示**: \n`;
  content += `- 热点分析基于24小时内的最新市场数据\n`;
  content += `- 投资有风险，入市需谨慎\n`;
  content += `- 请结合自身风险承受能力理性投资\n`;

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
            content: "⏰ 实时发现热点",
          },
        },
      ],
      header: {
        title: {
          tag: "plain_text",
          content: `📊 ${dateStr} 市场热点分析`,
        },
        template: topics?.length > 0 ? "orange" : "gray",
      },
    },
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`飞书推送失败: ${errorText}`);
  }
}

/**
 * 获取活跃热点
 */
export async function GET(request: NextRequest) {
  try {
    const activeTopics = await hotTopicsManager.getActiveHotTopics();
    const stats = await hotTopicsManager.getHotTopicsStats();

    // 解析relatedStocks
    const topicsWithStocks = activeTopics.map(topic => ({
      ...topic,
      relatedStocks: topic.relatedStocks ? JSON.parse(topic.relatedStocks) : [],
    }));

    return NextResponse.json({
      topics: topicsWithStocks,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "获取热点失败" },
      { status: 500 }
    );
  }
}
