import { NextRequest, NextResponse } from "next/server";
import {
  userConfigManager,
  holdingManager,
  hotTopicsManager,
  recommendationManager,
} from "@/storage/database";
import { LLMClient, SearchClient, HeaderUtils, Config } from "coze-coding-dev-sdk";
import { getStockPrice } from "@/lib/stock-price";

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 1. 获取用户配置
    const userConfig = await userConfigManager.getLatestUserConfig();
    if (!userConfig) {
      return NextResponse.json({ message: "请先配置投资目标" }, { status: 400 });
    }

    // 2. 获取当前持仓
    const holdings = await holdingManager.getAllHoldings();

    // 3. 获取当前热点
    const hotTopics = await hotTopicsManager.getActiveHotTopics();

    // 4. 计算持仓分布
    const totalValue = holdings.reduce((sum, h) => sum + Number(h.costPrice) * h.quantity, 0);
    const positionValue = Number(userConfig.positionAmount);

    const stockAnalysis = holdings.map(h => {
      const stockValue = Number(h.costPrice) * h.quantity;
      const percentage = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;

      // 判断是否在热点中
      const relatedTopics = hotTopics.filter(topic => {
        if (!topic.relatedStocks) return false;
        const stocks = JSON.parse(topic.relatedStocks);
        return stocks.includes(h.stockCode);
      });

      return {
        stockCode: h.stockCode,
        stockName: h.stockName,
        value: stockValue,
        percentage,
        costPrice: h.costPrice,
        quantity: h.quantity,
        inHotTopic: relatedTopics.length > 0,
        hotTopics: relatedTopics.map(t => t.topicName),
      };
    });

    // 4.5 获取每只股票的实时价格和技术数据
    const searchConfig = new Config();
    // @ts-ignore
    const searchClient = new SearchClient(searchConfig, customHeaders as any);

    const stockWithPrice = [];
    for (const stock of stockAnalysis) {
      // 获取实时价格
      const priceResult = await getStockPrice(stock.stockCode, stock.stockName, false);

      // 获取技术指标数据
      let technicalData = "暂无实时数据";
      if (priceResult.source !== 'error') {
        try {
          const searchQuery = `${stock.stockName} ${stock.stockCode} 技术面 均线 MACD KDJ 成交量 site:finance.sina.com.cn OR site:quote.eastmoney.com`;
          const techSearch = await searchClient.webSearch(searchQuery, 3, true);

          if (techSearch.web_items && techSearch.web_items.length > 0) {
            const techInfo = techSearch.web_items.slice(0, 2).map((item: any) =>
              `${item.site_name}: ${item.snippet}`
            ).join('\n');
            technicalData = techInfo;
          }
        } catch (error) {
          console.error(`获取${stock.stockName}技术数据失败:`, error);
        }
      }

      stockWithPrice.push({
        ...stock,
        currentPrice: priceResult.price,
        priceSource: priceResult.source,
        profitLoss: priceResult.source !== 'error' ? ((priceResult.price - stock.costPrice) / stock.costPrice) * 100 : 0,
        technicalData,
      });
    }

    // 5. 构建配置建议
    const llmConfig = new Config();
    // @ts-ignore
    const llmClient = new LLMClient(llmConfig, customHeaders as any);

    const systemPrompt = `你是一位专业的投资组合管理专家，擅长根据现有持仓和年度目标，从技术分析角度给出调仓建议。

你的任务是基于当前持仓、热点和年度目标，从技术角度给出专业的调仓建议。

投资目标：
- 年度收益目标：${userConfig.profitTarget}%
- 单股盈利目标：${userConfig.profitTarget}%
- 最大回撤限制：15%
- 初始资金：¥${Number(userConfig.positionAmount).toLocaleString()}
- 操作风格：${userConfig.tradingStyle === 'short_term' ? '短期做T' : '中长期投资'}

当前持仓详情（含实时数据）：
${stockWithPrice.map(s =>
  `- ${s.stockName}(${s.stockCode})
   仓位占比：${s.percentage.toFixed(2)}%
   成本价：¥${s.costPrice}
   当前价：¥${s.currentPrice.toFixed(2)}（${s.priceSource === 'error' ? '获取失败' : '实时'}）
   盈亏：${s.profitLoss.toFixed(2)}%
   数量：${s.quantity}股
   持仓金额：¥${s.value.toLocaleString()}
   热点关联：${s.inHotTopic ? `热点板块(${s.hotTopics.join(', ')})` : '非热点板块'}
   技术数据：${s.technicalData}`
).join('\n\n')}

注意：以上技术数据来自搜索结果，仅供参考，不构成投资建议。

当前市场热点：
${hotTopics.map(t => `- ${t.topicName}(${t.sector})：强度${t.strength}，趋势${t.trend === 'rising' ? '上升' : t.trend === 'stable' ? '稳定' : '下降'}`).join('\n')}

技术分析要点：
1. 集中度分析：单股仓位占比、板块集中度
2. 热点匹配度：持仓与市场热点的关联度
3. 盈亏分析：基于当前价与成本价的盈亏情况
4. 风险评估：最大回撤、止损位设置
5. 盈利空间：达到年度目标的可行性分析

重要说明：
- 当前价格和技术数据来自实时搜索，可能存在延迟
- 请基于以上提供的数据进行分析，不要编造未提供的技术指标
- 如果某个股票缺少技术数据，请在分析中明确说明

请严格按照以下格式输出调仓建议（800字以内）：

## 持仓技术分析

[从技术角度分析当前持仓结构，包括：
- 仓位集中度分析（单股仓位、板块集中度）
- 热点匹配度分析
- 风险敞口分析
- 盈亏平衡点分析]

## 调仓技术建议

[针对每只持仓，给出具体的调仓建议，包括：
1. 股票名称和代码
2. 技术指标分析（均线、成交量、MACD等）
3. 压力位和支撑位
4. 具体操作建议（加仓/减仓/持有/卖出）
5. 操作价位和时机
6. 止损位设置]

## 目标达成路径

[基于调仓建议，给出达成年度目标的技术路径：
- 预期收益率测算
- 时间周期预估
- 风险控制措施
- 阶段性目标设置]

## 风险提示

[基于技术分析，给出风险提示和应对策略]`;

    const userPrompt = "请基于以上信息，从技术角度给出调仓建议。";

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    const llmResponse = await llmClient.invoke(messages, { temperature: 0.7 });

    const content = llmResponse.content || "";

    // 6. 保存建议到数据库
    await recommendationManager.createRecommendation({
      type: "report",
      content,
      explanation: `【持仓优化】持仓总值：¥${totalValue.toLocaleString()}\n` +
                   `持仓分布：${stockWithPrice.map(s => `${s.stockName}:${s.percentage.toFixed(2)}%`).join(', ')}`,
      sources: `热点数量：${hotTopics.length}\n` +
               `热点列表：${hotTopics.map(t => t.topicName).join(', ')}`,
    });

    // 7. 如果配置了飞书 webhook，推送配置建议
    if (userConfig.feishuWebhookUrl) {
      try {
        // 飞书文本元素最大支持 4096 字节，约 2000 中文字符
        // 为了安全起见，限制在 1500 字符
        const maxLength = 1500;
        const contentToSend = content.length > maxLength
          ? content.substring(0, maxLength) + "\n\n...（内容过长，已截断，请登录系统查看完整建议）"
          : content;

        await sendPortfolioReportToFeishu(userConfig.feishuWebhookUrl, {
          title: "持仓配置建议",
          content: contentToSend,
        });
      } catch (error) {
        console.error("推送飞书失败:", error);
      }
    }

    // 8. 返回详细分析数据和建议
    return NextResponse.json({
      advice: content,
      analysis: {
        totalValue,
        positionValue,
        cash: Number(userConfig.positionAmount) - totalValue,
        stockCount: holdings.length,
        hotTopicCount: hotTopics.length,
        stocks: stockWithPrice,
      },
    });
  } catch (error: any) {
    console.error("生成配置建议失败:", error);
    return NextResponse.json(
      { message: error.message || "生成配置建议失败" },
      { status: 500 }
    );
  }
}

/**
 * 发送持仓配置建议到飞书
 */
async function sendPortfolioReportToFeishu(webhookUrl: string, data: any) {
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
            content: `**${data.title}**\n\n${data.content}`,
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "div",
          text: {
            tag: "plain_text",
            content: "💡 点击“生成配置建议”可随时生成最新的持仓调仓建议",
          },
        },
      ],
      header: {
        title: {
          tag: "plain_text",
          content: data.title,
        },
        template: "green",
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
    throw new Error(`推送飞书失败: ${error}`);
  }
}
