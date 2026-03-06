import { NextRequest, NextResponse } from "next/server";
import { userConfigManager, holdingManager, recommendationManager } from "@/storage/database";
import { LLMClient, Config, SearchClient, HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    
    // 1. 获取用户配置
    const userConfig = await userConfigManager.getLatestUserConfig();
    if (!userConfig) {
      return NextResponse.json(
        { message: "请先配置投资目标" },
        { status: 400 }
      );
    }
    
    // 2. 获取持仓信息
    const holdings = await holdingManager.getAllHoldings();
    if (holdings.length === 0) {
      return NextResponse.json(
        { message: "请先添加持仓信息" },
        { status: 400 }
      );
    }
    
    // 3. 搜索股市信息
    // @ts-ignore - customHeaders 传参在运行时有效
    const searchClient = new SearchClient(new Config(), customHeaders as any);
    
    // 为每个持仓股票搜索相关资讯
    const searchResults = [];
    for (const holding of holdings) {
      try {
        const searchQuery = `${holding.stockName} ${holding.stockCode} 股票 最新行情 研报 分析`;
        const response = await searchClient.webSearch(searchQuery, 5, true);
        
        if (response.web_items && response.web_items.length > 0) {
          searchResults.push({
            stockCode: holding.stockCode,
            stockName: holding.stockName,
            summary: response.summary || "",
            items: response.web_items.slice(0, 3).map(item => ({
              title: item.title,
              snippet: item.snippet,
              url: item.url,
            })),
          });
        }
      } catch (error) {
        console.error(`搜索 ${holding.stockName} 失败:`, error);
      }
    }
    
    // 4. 构建 LLM prompt
    // @ts-ignore - customHeaders 传参在运行时有效
    const llmClient = new LLMClient(new Config(), customHeaders as any);
    
    const systemPrompt = `你是一位专业的 A 股投资顾问，具有丰富的实战经验和深入的市场分析能力。

你的任务是根据用户的投资目标、持仓情况和最新市场信息，提供清晰、可执行的投资建议。

投资目标：
- 持仓总金额：¥${userConfig.positionAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- 盈利目标：${userConfig.profitTarget}%
- 操作风格：${userConfig.tradingStyle === 'short_term' ? '短期做T' : '中长期投资'}

持仓情况：
${holdings.map(h => `- ${h.stockName} (${h.stockCode}): 持有 ${h.quantity} 股，成本价 ¥${h.costPrice.toFixed(2)}`).join('\n')}

请严格按照以下格式输出建议，确保建议清晰可执行：

## 操作建议

[具体的操作建议，例如：买入、卖出、持有，以及对应的目标股票]

## 建议内容

[详细的操作建议说明，包括：]
[1. 具体操作：买入/卖出/持有多少股，什么价格区间]
[2. 风险提示：可能存在的风险因素]
[3. 预期收益：基于当前情况的收益预期]

## 分析说明

[详细的分析依据，包括：]
[1. 市场环境分析]
[2. 个股基本面分析]
[3. 技术面分析]
[4. 与用户投资目标的匹配度]

重要提示：
- 建议必须基于上述搜索到的市场信息
- 必须考虑用户的风险偏好和投资目标
- 必须提供明确、可执行的操作建议
- 必须包含充分的风险提示
- 建议应该具体到股票代码和操作数量`;

    // 构建市场信息上下文
    const marketContext = searchResults.map(result => `
${result.stockName} (${result.stockCode}) 最新信息：
${result.summary || '暂无汇总信息'}
关键资讯：
${result.items.map(item => `- ${item.title}: ${item.snippet}`).join('\n')}
`).join('\n');

    const userPrompt = `请基于以下最新市场信息，为用户提供投资建议：

${marketContext}

请按照指定的格式输出建议。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // 5. 调用 LLM 生成建议
    const response = await llmClient.invoke(messages, {
      temperature: 0.7,
    });

    // 6. 解析建议内容
    const content = response.content || "";
    
    // 提取操作类型
    let action = "hold";
    if (content.includes("买入") && !content.includes("不建议买入")) {
      action = "buy";
    } else if (content.includes("卖出") && !content.includes("不建议卖出")) {
      action = "sell";
    }
    
    // 提取相关股票（取第一个持仓股票）
    const relatedStock = holdings[0]?.stockCode || null;
    
    // 7. 保存建议到数据库
    const recommendation = await recommendationManager.createRecommendation({
      type: "alert",
      content,
      explanation: marketContext,
      action,
      relatedStock: relatedStock || undefined,
    });
    
    // 8. 如果配置了飞书 webhook，推送建议
    if (userConfig.feishuWebhookUrl) {
      try {
        await sendToFeishu(userConfig.feishuWebhookUrl, {
          title: "AI 投资建议",
          content,
          action: action === 'buy' ? '买入建议' : action === 'sell' ? '卖出建议' : '持有建议',
          relatedStock,
        });
      } catch (error) {
        console.error("推送飞书失败:", error);
        // 不影响主流程，继续返回结果
      }
    }
    
    return NextResponse.json(recommendation);
  } catch (error: any) {
    console.error("生成建议失败:", error);
    return NextResponse.json(
      { message: error.message || "生成建议失败" },
      { status: 500 }
    );
  }
}

async function sendToFeishu(webhookUrl: string, data: any) {
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
            content: `**${data.title}**\n\n${data.content.substring(0, 500)}...`,
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "查看详情",
              },
              type: "primary",
              url: "/", // 相对路径，在飞书中会打开应用首页
            },
          ],
        },
      ],
      header: {
        title: {
          tag: "plain_text",
          content: `${data.action} - ${data.relatedStock || '市场分析'}`,
        },
        template: data.action === '买入' ? 'green' : data.action === '卖出' ? 'red' : 'blue',
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
    const error = await response.text();
    throw new Error(`飞书推送失败: ${error}`);
  }
}
