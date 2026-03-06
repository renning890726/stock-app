import { NextRequest, NextResponse } from "next/server";
import {
  userConfigManager,
  holdingManager,
  recommendationManager,
} from "@/storage/database";
import { LLMClient, HeaderUtils, Config } from "coze-coding-dev-sdk";
import { getStockPricesBatch } from "@/lib/stock-price-enhanced";

export async function GET(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 1. 获取用户配置
    const userConfig = await userConfigManager.getLatestUserConfig();
    if (!userConfig) {
      return NextResponse.json({ message: "请先配置投资目标" }, { status: 400 });
    }

    // 2. 获取当前持仓
    const holdings = await holdingManager.getAllHoldings();

    // 3. 使用增强的批量查询函数获取实时价格
    const priceResults = await getStockPricesBatch(
      holdings.map(h => ({
        stockCode: h.stockCode,
        stockName: h.stockName,
        costPrice: Number(h.costPrice),
      }))
    );

    // 4. 合并价格数据并计算当前绩效
    const stocksWithPrice: any[] = holdings.map(h => {
      const priceData = priceResults.get(h.stockCode) || {
        currentPrice: 0,
        source: 'error',
      };

      return {
        ...h,
        currentPrice: priceData.currentPrice,
        priceSource: priceData.source,
        currentValue: priceData.currentPrice * h.quantity,
      };
    });

    // 计算总市值（使用实时价格）
    const totalValue = stocksWithPrice.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCost = Number(userConfig.positionAmount); // 持仓总成本从投资目标设置中的持仓总金额获取
    const cash = Number(userConfig.cash) || 0;

    // 计算当前收益（收益率）
    // 公式：(持仓市值 + 现金) / 持仓总成本 - 1 × 100%
    const totalAssets = totalValue + cash;
    const currentReturn = totalCost > 0 ? ((totalAssets / totalCost) - 1) * 100 : 0;
    const totalProfit = totalAssets - totalCost;
    const initialCapital = totalCost; // 初始资金等于持仓总成本

    // 5. 获取最近的建议数量
    const allRecommendations = await recommendationManager.getAllRecommendations();
    const recentAlerts = allRecommendations
      .filter(r => r.type === "alert")
      .slice(0, 10);

    // 6. 计算目标完成情况
    const annualTarget = Number(userConfig.profitTarget); // 使用盈利目标作为年度目标
    const targetProgress = annualTarget > 0 ? (currentReturn / annualTarget) * 100 : 0;

    // 7. 简化的月度统计
    const monthlyStats = [
      { month: "1月", target: annualTarget / 12, actual: currentReturn * 0.1 },
      { month: "2月", target: annualTarget / 12 * 2, actual: currentReturn * 0.2 },
    ];

    return NextResponse.json({
      overview: {
        annualTarget,
        currentReturn, // 基于初始资金的真实收益率
        targetProgress,
        initialCapital,
        currentTotalValue: totalValue,
        totalProfit, // 基于初始资金的总盈亏
        maxDrawdown: 0,
      },
      performance: {
        totalValue,
        totalCost,
        cash: Math.max(0, cash),
        profitRate: 0, // 不再显示持仓收益率
        annualReturn: currentReturn, // 年化收益率（基于初始资金）
      },
      holdings: {
        count: stocksWithPrice.length,
        totalValue,
        stocks: stocksWithPrice.map(h => ({
          ...h,
          value: h.currentValue,
        })),
      },
      recommendations: {
        recentCount: recentAlerts.length,
        recent: recentAlerts.slice(0, 5),
      },
      history: [],
    });
  } catch (error: any) {
    console.error("获取年度目标数据失败:", error);
    return NextResponse.json(
      { message: error.message || "获取数据失败" },
      { status: 500 }
    );
  }
}

/**
 * 生成年度目标分析报告
 */
export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 1. 获取基础数据
    const userConfig = await userConfigManager.getLatestUserConfig();
    if (!userConfig) {
      return NextResponse.json({ message: "请先配置投资目标" }, { status: 400 });
    }

    const holdings = await holdingManager.getAllHoldings();

    // 2. 使用增强的批量查询函数获取实时价格
    const priceResults = await getStockPricesBatch(
      holdings.map(h => ({
        stockCode: h.stockCode,
        stockName: h.stockName,
        costPrice: Number(h.costPrice),
      }))
    );

    const stocksWithPrice: any[] = holdings.map(h => {
      const priceData = priceResults.get(h.stockCode) || {
        currentPrice: 0,
        source: 'error',
      };

      return {
        ...h,
        currentPrice: priceData.currentPrice,
        priceSource: priceData.source,
        currentValue: priceData.currentPrice * h.quantity,
      };
    });

    const annualTarget = Number(userConfig.profitTarget);
    const totalValue = stocksWithPrice.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCost = Number(userConfig.positionAmount); // 持仓总成本从投资目标设置中的持仓总金额获取
    const cash = Number(userConfig.cash) || 0;
    const currentReturn = totalCost > 0 ? (((totalValue + cash) / totalCost) - 1) * 100 : 0;
    const totalProfit = (totalValue + cash) - totalCost;
    const maxDrawdown = 15; // 简化处理

    // 3. 计算完成进度
    const targetProgress = annualTarget > 0 ? (currentReturn / annualTarget) * 100 : 0;

    // 4. 生成AI分析报告
    const llmConfig = new Config();
    // @ts-ignore
    const llmClient = new LLMClient(llmConfig, customHeaders as any);

    const systemPrompt = `你是一位专业的投资分析师，擅长评估年度交易目标的执行情况。

你的任务是基于当前账户数据和年度目标，生成详细的分析报告。

年度目标：
- 收益目标：${annualTarget}%
- 初始资金：¥${Number(userConfig.positionAmount).toLocaleString()}
- 操作风格：${userConfig.tradingStyle === 'short_term' ? '短期做T' : '中长期投资'}

当前绩效：
- 当前收益率：${currentReturn.toFixed(2)}%
- 总市值：¥${totalValue.toLocaleString()}
- 现金：¥${cash.toLocaleString()}
- 持仓数量：${stocksWithPrice.length}只

持仓情况：
${stocksWithPrice.map(h => {
  return `- ${h.stockName}(${h.stockCode}): 持股数${h.quantity}, 当前价¥${h.currentPrice.toFixed(2)}, 市值¥${h.currentValue.toFixed(2)}`;
}).join('\n')}

请严格按照以下格式输出报告（600字以内）：

## 目标达成情况

[评估当前收益目标的完成情况，与目标对比，分析差距]

## 持仓评估

[评估当前持仓的表现，哪些需要调整]

## 操作建议

[给出1-2条具体的改进建议，帮助更好地完成年度目标]`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: "请生成年度目标分析报告。" },
    ];

    const llmResponse = await llmClient.invoke(messages, { temperature: 0.7 });

    const content = llmResponse.content || "";

    // 5. 保存报告
    await recommendationManager.createRecommendation({
      type: "report",
      content,
      explanation: `【定时报告】年度目标：${annualTarget}%\n当前收益：${currentReturn.toFixed(2)}%\n完成进度：${targetProgress.toFixed(2)}%`,
      sources: `持仓数量：${holdings.length}`,
    });

    return NextResponse.json({
      report: content,
      metrics: {
        annualTarget,
        currentReturn,
        targetProgress,
        maxDrawdown,
        currentDrawdown: 0,
        isOnTrack: targetProgress >= 0,
      },
    });
  } catch (error: any) {
    console.error("生成年度分析报告失败:", error);
    return NextResponse.json(
      { message: error.message || "生成报告失败" },
      { status: 500 }
    );
  }
}
