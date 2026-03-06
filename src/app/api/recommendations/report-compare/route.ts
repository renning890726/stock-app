import { NextRequest, NextResponse } from "next/server";
import { userConfigManager, holdingManager, recommendationManager } from "@/storage/database";
import { LLMClient, HeaderUtils, Config } from "coze-coding-dev-sdk";
import type { Message } from "coze-coding-dev-sdk";
import { getMarketIndexFromAkshare, getMarketSummaryFromAkshare } from "@/lib/stock-price-akshare";
import { getStockPricesBatch } from "@/lib/stock-price-enhanced";
import { executeMultiRoundSearch, formatMultiRoundSearchResult, type MultiRoundSearchResult } from "@/lib/multi-round-search";

/**
 * 调用 Google Gemini API
 */
async function callGemini(
  messages: Message[],
  apiKey: string,
  modelName: string = "gemini-1.5-pro"
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  // 转换消息格式
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

  // 如果有system消息，放在最前面
  const systemMessage = messages.find(m => m.role === 'system');
  const requestBody = systemMessage
    ? { systemInstruction: { parts: [{ text: systemMessage.content }] }, contents }
    : { contents };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API 错误: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * 调用通义千问 API (阿里云)
 */
async function callQwen(
  messages: Message[],
  apiKey: string,
  modelName: string = "qwen-plus"
): Promise<string> {
  const url = `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
      })),
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`通义千问 API 错误: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * 调用豆包 API (通过 coze-coding-dev-sdk)
 */
async function callDoubao(
  messages: Message[],
  config: Config
): Promise<string> {
  const llmClient = new LLMClient(config);

  const response = await llmClient.invoke(messages, {
    temperature: 0.6,
  });

  return response.content || "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { triggerType = "manual", geminiApiKey, qwenApiKey } = body;

    console.log("🧪 开始模型对比测试...");

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 获取当前日期（提前获取，用于搜索）
    const now = new Date();
    const todayStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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

    // 2.5 获取实时股价数据
    const priceResults = await getStockPricesBatch(holdings);
    const holdingsWithPrice = holdings.map(h => {
      const priceData = priceResults.get(h.stockCode) || {
        currentPrice: Number(h.costPrice),
        openPrice: Number(h.costPrice),
        changePercent: 0,
        peRatio: 0,
        source: 'cost',
        timestamp: Date.now(),
      };
      return {
        ...h,
        currentPrice: priceData.currentPrice || Number(h.costPrice),
        openPrice: priceData.openPrice || Number(h.costPrice),
        changePercent: priceData.changePercent || 0,
        peRatio: priceData.peRatio || 0,
        priceSource: priceData.source || 'cost',
      } as any;
    });

    // 3. 多轮搜索（只执行一次，三个模型共用）
    console.log("🚀 开始执行多轮搜索...");
    let searchResult: MultiRoundSearchResult | null = null;

    try {
      searchResult = await executeMultiRoundSearch(
        holdingsWithPrice.map(h => ({ stockCode: h.stockCode, stockName: h.stockName })),
        dateStr,
        { enableTechnicalAnalysis: true }
      );
      console.log("✅ 多轮搜索成功完成");
    } catch (error) {
      console.error("❌ 多轮搜索失败:", error);
    }

    // 4. 获取市场指数数据
    let marketInfoFromAkshare: any = null;
    try {
      const marketIndexData = await getMarketIndexFromAkshare();
      if (marketIndexData && marketIndexData.indices) {
        marketInfoFromAkshare = marketIndexData;
      }
    } catch (error) {
      console.error("❌ Akshare 市场指数获取失败:", error);
    }

    // 5. 计算持仓数据
    const totalCost = holdingsWithPrice.reduce((sum, h) => sum + h.quantity * h.costPrice, 0);
    const totalCurrentValue = holdingsWithPrice.reduce((sum, h) => sum + h.quantity * (h.currentPrice || h.costPrice), 0);
    const totalProfit = totalCurrentValue - totalCost;
    const profitPercent = totalCost > 0 ? (totalProfit / totalCost * 100) : 0;

    // 构建数据字符串
    const holdingsDataString = holdingsWithPrice.map(h =>
      `  - ${h.stockName}（${h.stockCode}）：持有 ${h.quantity} 股，成本价 ¥${h.costPrice.toFixed(2)}，当前价 ¥${h.currentPrice.toFixed(2)}，涨跌幅 ${h.changePercent > 0 ? '+' : ''}${h.changePercent.toFixed(2)}%，市盈率 ${h.peRatio || 'N/A'}，数据来源：${h.priceSource}`
    ).join('\n');

    let marketInfoString = "";
    if (marketInfoFromAkshare?.indices) {
      const indices = marketInfoFromAkshare.indices;
      marketInfoString = `【市场数据来源：Akshare - 实时数据】

## 市场指数
${indices.map((idx: any) =>
  `- ${idx['指数名称']}: ${idx['最新点位']}点, 涨跌幅 ${idx['涨跌幅']}%`
).join('\n')}
`;
    }

    const searchInfoString = searchResult ? formatMultiRoundSearchResult(searchResult) : "";

    // 6. 构建Prompt（三个模型共用）
    const systemPrompt = `你是一位专业的 A 股投资分析师，擅长撰写简洁、准确的持仓分析报告。

【重要提示】
- 当前日期：${todayStr}（${weekday}）
- 你正在生成的是 ${todayStr} 的收盘后分析报告
- **必须使用下方【准确数据】部分提供的数据**，所有指数涨跌、个股价格、资金流向等信息必须严格按照【准确数据】部分的数据生成
- 严禁使用历史数据或旧数据，所有分析必须基于 ${todayStr} 的实际市场表现
- 【网络资讯】部分仅作为参考，用于了解市场动态和新闻背景，不能用于替换【准确数据】中的数值
- **数据准确性是最高优先级**，任何与【准确数据】不符的内容都将被视为错误

你的任务是分析用户的持仓情况，生成一份收盘后的分析报告。

投资目标：
- 目标持仓总金额：¥${userConfig.positionAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- 盈利目标：${userConfig.profitTarget}%
- 操作风格：${userConfig.tradingStyle === 'short_term' ? '短期做T' : '中长期投资'}

【准确数据】（必须使用）
持仓情况：
- 实际总仓位：¥${totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- 当前持仓总市值：¥${totalCurrentValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- 总盈亏：¥${totalProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(2)}%)
- 持仓明细（数据来源：Akshare）：
${holdingsDataString}

${marketInfoString}

【网络资讯】（仅供参考，用于了解市场动态和新闻背景，不能替换准确数据）
${searchInfoString}

请严格按照以下格式输出报告，使用简洁文字，确保清晰易读：

## 今日市场概况
[2-3句话，描述今日整体市场走势、指数涨跌、成交量、情绪指数，**必须使用【准确数据】中的指数数据**，结合【网络资讯】中的市场概况信息]

## 趋势研判
[整体市场分析（200-300字）：涵盖当前市场整体走势、主要板块轮动情况、资金流向、技术面分析、政策支撑等，避免分板块单独分析，整合成一个连贯的市场研判。充分利用【网络资讯】中的热点板块、市场情绪等信息]

## 操作建议
### 个股操作
[逐个列出所有个股，每行格式：
**股票名称**（代码）：收盘价 XX.XX，建议XX，买入：XX-XX，卖出：XX-XX。简短理由XX。
**注意**：收盘价必须使用【准确数据】中提供的股价。参考【网络资讯】中的个股新闻和技术面分析]
### 风险控制
[风险控制措施，2-3句话]

要求：
1. **数据准确性（最高优先级）**：报告中的所有数值数据（指数涨跌、个股价格、涨跌幅、盈亏等）必须严格使用【准确数据】部分提供的数值，**严禁使用【网络资讯】中的数值或自行推断**
2. 使用简洁文字展示，避免表格（飞书不支持表格）
3. 语言简洁但内容丰富，信息量大
4. 数据准确，有据可查
5. 观点明确，不模棱两可
6. 重点突出技术面分析和操作建议
7. **买卖价格必须基于深度技术分析（第三轮搜索）**：重点参考支撑位、阻力位、技术指标（MACD、KDJ、RSI）、K线形态、机构研报目标价等数据，给出精确的价格区间
   - 买入价：应设置在支撑位附近，结合技术指标的金叉或超卖信号
   - 卖出价：应设置在阻力位附近，结合技术指标的死叉或超买信号
   - 避免给出过于宽泛的价格区间（如"18-25"），应该基于技术位给出更精确的区间（如"18.50-19.20"）
   - 如果有机构研报目标价，可以作为参考，但要结合当前价格和技术位综合判断
8. **总字数控制在 2500-3000 字符范围内**（确保在一条飞书消息内可以完整显示，同时内容尽量丰富）
9. **不要输出"## 重要信源"部分**`;

    const userPrompt = `请基于以上 ${todayStr} 的市场数据生成今日收盘分析报告。

【多轮搜索已完成】
- 第一轮搜索：市场概况（整体走势、指数表现、市场情绪、热点板块）
- 第二轮搜索：个股详情（最新消息、技术面分析）
- 第三轮搜索：深度技术分析（支撑位、阻力位、技术指标、K线形态、机构研报目标价）

**重要提示**：
买卖价格必须重点参考【第三轮搜索：深度技术分析】中的支撑位、阻力位、技术指标、机构目标价等数据
结合K线形态、资金流向、交易量等多维度分析，给出精确的买入价区间和卖出价区间
避免给出过于宽泛的价格区间（如"18-25"），应该基于技术位给出更精确的区间（如"18.50-19.20"）

请根据【准确数据】和【网络资讯】，按照systemPrompt中定义的格式生成高质量的持仓分析报告。`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 7. 分别调用三个模型
    const results: any = {
      timestamp: new Date().toISOString(),
      holdingsCount: holdings.length,
      searchCompleted: !!searchResult,
      models: {}
    };

    // 豆包 (当前方案)
    console.log("📝 正在调用豆包...");
    try {
      const doubaoConfig = new Config();
      const startTime = Date.now();
      const doubaoContent = await callDoubao(messages, doubaoConfig);
      const endTime = Date.now();

      results.models.doubao = {
        name: "豆包 (当前方案)",
        content: doubaoContent,
        duration: endTime - startTime,
        charCount: doubaoContent.length,
        success: true
      };
      console.log(`✅ 豆包完成 (${endTime - startTime}ms, ${doubaoContent.length}字符)`);
    } catch (error: any) {
      console.error("❌ 豆包失败:", error.message);
      results.models.doubao = {
        name: "豆包 (当前方案)",
        error: error.message,
        success: false
      };
    }

    // Google Gemini
    if (geminiApiKey) {
      console.log("📝 正在调用 Google Gemini...");
      try {
        const startTime = Date.now();
        const geminiContent = await callGemini(messages, geminiApiKey, "gemini-1.5-pro");
        const endTime = Date.now();

        results.models.gemini = {
          name: "Google Gemini 1.5 Pro",
          content: geminiContent,
          duration: endTime - startTime,
          charCount: geminiContent.length,
          success: true
        };
        console.log(`✅ Gemini完成 (${endTime - startTime}ms, ${geminiContent.length}字符)`);
      } catch (error: any) {
        console.error("❌ Gemini失败:", error.message);
        results.models.gemini = {
          name: "Google Gemini 1.5 Pro",
          error: error.message,
          success: false
        };
      }
    } else {
      results.models.gemini = {
        name: "Google Gemini 1.5 Pro",
        error: "未提供 API Key",
        success: false
      };
    }

    // 通义千问
    if (qwenApiKey) {
      console.log("📝 正在调用通义千问...");
      try {
        const startTime = Date.now();
        const qwenContent = await callQwen(messages, qwenApiKey, "qwen-plus");
        const endTime = Date.now();

        results.models.qwen = {
          name: "通义千问 Plus",
          content: qwenContent,
          duration: endTime - startTime,
          charCount: qwenContent.length,
          success: true
        };
        console.log(`✅ 通义千问完成 (${endTime - startTime}ms, ${qwenContent.length}字符)`);
      } catch (error: any) {
        console.error("❌ 通义千问失败:", error.message);
        results.models.qwen = {
          name: "通义千问 Plus",
          error: error.message,
          success: false
        };
      }
    } else {
      results.models.qwen = {
        name: "通义千问 Plus",
        error: "未提供 API Key",
        success: false
      };
    }

    // 8. 保存对比结果到数据库（可选）
    // 可以根据需要保存到数据库

    return NextResponse.json(results);

  } catch (error: any) {
    console.error("❌ 模型对比失败:", error);
    return NextResponse.json(
      { message: "模型对比失败", error: error.message },
      { status: 500 }
    );
  }
}
