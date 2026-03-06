import { NextRequest, NextResponse } from "next/server";
import { userConfigManager, holdingManager, recommendationManager, stockHighPriceManager } from "@/storage/database";
import { SearchClient, LLMClient, HeaderUtils, Config } from "coze-coding-dev-sdk";
import { getStockPricesBatch } from "@/lib/stock-price-enhanced";

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const searchConfig = new Config();
    // @ts-ignore - customHeaders 传参在运行时有效
    const searchClient = new SearchClient(searchConfig, customHeaders);

    const now = new Date();  // 当前时间
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);  // 24小时前

    // 1. 获取用户配置
    const userConfig = await userConfigManager.getLatestUserConfig();
    if (!userConfig) {
      return NextResponse.json(
        { triggered: false, reason: "请先配置投资目标" },
        { status: 400 }
      );
    }

    // 2. 获取持仓信息
    const holdings = await holdingManager.getAllHoldings();
    if (holdings.length === 0) {
      return NextResponse.json(
        { triggered: false, reason: "请先添加持仓信息" },
        { status: 400 }
      );
    }

    // 3. 使用增强的批量查询函数获取实时价格
    const priceResults = await getStockPricesBatch(
      holdings.map(h => ({
        stockCode: h.stockCode,
        stockName: h.stockName,
        costPrice: Number(h.costPrice),
      }))
    );

    // 4. 计算整体持仓盈亏
    const profitTarget = parseFloat(userConfig.profitTarget.toString()) / 100; // 转换为小数
    const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.costPrice, 0);
    const annualProfitTarget = totalCost * profitTarget; // 年度盈利目标金额

    console.log(`整体持仓成本: ¥${totalCost.toFixed(2)}`);
    console.log(`年度盈利目标: ¥${annualProfitTarget.toFixed(2)} (${userConfig.profitTarget}%)`);

    let totalCurrentValue = 0;
    const stockPriceData: any[] = [];
    let significantMoves: any[] = []; // 异动股票（当日涨跌超过5%）
    let threeMonthHighs: any[] = []; // 3个月历史新高股票

    for (const holding of holdings) {
      const priceData = priceResults.get(holding.stockCode);
      if (!priceData || !priceData.currentPrice) {
        console.warn(`${holding.stockName}: 无法获取实时价格，跳过`);
        continue;
      }

      const currentPrice = priceData.currentPrice;
      const openPrice = priceData.openPrice;
      const changePercent = priceData.changePercent || 0;

      // 计算当日涨跌幅
      const dailyChange = openPrice ? (currentPrice - openPrice) / openPrice : 0;

      const currentValue = holding.quantity * currentPrice;
      totalCurrentValue += currentValue;

      // 检测异动（只使用当日涨跌幅）
      if (openPrice && Math.abs(dailyChange) >= 0.05) {
        significantMoves.push({
          stockCode: holding.stockCode,
          stockName: holding.stockName,
          currentPrice,
          openPrice,
          dailyChange,
          direction: dailyChange > 0 ? 'up' : 'down',
        });
      }

      // 检测3个月历史新高
      const isHigh = await stockHighPriceManager.isThreeMonthHigh(
        holding.stockCode,
        currentPrice
      );

      if (isHigh) {
        // 检查今天是否已经推送过
        const hasAlertedToday = await stockHighPriceManager.hasAlertedToday(
          holding.stockCode
        );

        if (!hasAlertedToday) {
          threeMonthHighs.push({
            stockCode: holding.stockCode,
            stockName: holding.stockName,
            currentPrice,
            dailyChange,
          });

          // 更新历史最高价记录
          await stockHighPriceManager.upsertStockHighPrice({
            stockCode: holding.stockCode,
            stockName: holding.stockName,
            highPrice: currentPrice,
            highDate: new Date(),
          });
        }
      }

      stockPriceData.push({
        stockCode: holding.stockCode,
        stockName: holding.stockName,
        currentPrice,
        openPrice,
        dailyChange,
      });
    }

    console.log(`当前持仓市值: ¥${totalCurrentValue.toFixed(2)}`);
    console.log(`异动股票数量: ${significantMoves.length}`);
    console.log(`3个月新高股票数量: ${threeMonthHighs.length}`);

    // 判断是否触发推送
    let shouldTrigger = false;
    let triggerReason = "";
    const triggerType: string[] = []; // 记录触发类型

    // 触发条件1：有股票异动（当日涨跌超过5%）
    if (significantMoves.length > 0) {
      shouldTrigger = true;
      triggerType.push('异动');

      const upStocks = significantMoves.filter(s => s.direction === 'up');
      const downStocks = significantMoves.filter(s => s.direction === 'down');

      // 灵活生成触发原因文案
      if (upStocks.length > 0 && downStocks.length > 0) {
        // 有涨有跌
        triggerReason = `检测到${significantMoves.length}只股票异动：${upStocks.map(s => s.stockName).join('、')}等${upStocks.length}只上涨，${downStocks.map(s => s.stockName).join('、')}等${downStocks.length}只下跌`;
      } else if (upStocks.length > 0) {
        // 只有上涨
        triggerReason = `检测到${upStocks.length}只股票异动：${upStocks.map(s => s.stockName).join('、')}等${upStocks.length}只上涨`;
      } else {
        // 只有下跌
        triggerReason = `检测到${downStocks.length}只股票异动：${downStocks.map(s => s.stockName).join('、')}等${downStocks.length}只下跌`;
      }
    }

    // 触发条件2：3个月历史新高
    if (threeMonthHighs.length > 0) {
      shouldTrigger = true;
      triggerType.push('新高');

      if (triggerReason) {
        triggerReason += `；创3个月历史新高：${threeMonthHighs.map(s => s.stockName).join('、')}`;
      } else {
        triggerReason = `创3个月历史新高：${threeMonthHighs.map(s => s.stockName).join('、')}`;
      }
    }

    // 触发条件3：每周定期推送（即使没有异动）
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0-6 (周日到周六)
    const hour = today.getHours();
    const minute = today.getMinutes();
    const isFriday = dayOfWeek === 5;
    const isFridayAfternoon = isFriday && hour >= 14 && minute >= 30;

    if (!shouldTrigger && isFridayAfternoon) {
      shouldTrigger = true;
      triggerType.push('定期复盘');
      triggerReason = "周五下午定期复盘";
    }

    if (!shouldTrigger) {
      return NextResponse.json({
        triggered: false,
        reason: "未达到触发条件（当日异动或3个月历史新高）",
        tradingTime: true,
        data: {
          significantMoves: significantMoves.length,
          threeMonthHighs: threeMonthHighs.length,
        },
      });
    }

    // 4. 生成前瞻性分析建议
    const llmConfig = new Config();
    // @ts-ignore
    const llmClient = new LLMClient(llmConfig, customHeaders as any);

    // 整合所有需要关注的股票（异动股票 + 历史新高股票）
    const focusStocks = [...significantMoves];
    threeMonthHighs.forEach(high => {
      if (!focusStocks.find(s => s.stockCode === high.stockCode)) {
        focusStocks.push(high);
      }
    });

    const systemPrompt = `你是一位专业的 A 股实时交易顾问，擅长捕捉盘中异动和识别历史新高机会，给出精准的个股短期操作建议。

## 核心目标
基于当日实时股价异动和3个月历史新高识别，快速给出个股短期操作建议。

## 当前触发原因
${triggerReason}

## 异动股票（涨跌超5%）
${significantMoves.length > 0 ? significantMoves.map(s => `- ${s.stockName} (${s.stockCode}): ${s.direction === 'up' ? '上涨' : '下跌'} ${(s.dailyChange * 100).toFixed(2)}%`).join('\n') : '无'}

## 3个月历史新高股票
${threeMonthHighs.length > 0 ? threeMonthHighs.map(s => `- ${s.stockName} (${s.stockCode}): 当前价 ¥${s.currentPrice.toFixed(2)}，创3个月历史新高`).join('\n') : '无'}

## 持仓概览
- 当前持仓数量：${holdings.length} 只
- 异动股票：${significantMoves.length} 只
- 历史新高：${threeMonthHighs.length} 只

## 你的任务
**只针对上述【异动股票】和【历史新高股票】列表中的股票，给出明确的短期操作建议**：
- 买入：看涨，明确买点
- 卖出：看跌，明确卖点
- 持有：观望，明确理由

## 输出格式要求

请严格按照以下格式输出（150-200字，简短有力）：

[股票代码] [股票名称] - [买入/卖出/持有] - [简短理由]

[股票代码] [股票名称] - [买入/卖出/持有] - [简短理由]

触发原因：${triggerReason}

## 关键要求

1. **只分析关注股票**：严格按照【异动股票】和【历史新高股票】列表，不要分析其他股票
2. **个股精准**：针对具体股票给出明确操作建议
3. **简短有力**：每条建议20-30字，总计150-200字
4. **即时性强**：基于当天当时的实时异动
5. **操作明确**：买入/卖出/持有，不模棱两可
6. **理由充分**：每条建议必须有明确的触发理由（涨跌幅度、历史新高、技术面）
7. **历史新高重视**：对于创3个月历史新高的股票，重点分析是否继续持有或减仓锁定收益`;

    const userPrompt = `请基于上述持仓数据和触发原因，生成前瞻性的操作建议。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const llmResponse = await llmClient.invoke(messages, { temperature: 0.5 });

    const content = llmResponse.content || "";

    // 解析操作类型（根据内容判断）
    let action = "hold";
    if (content.includes("减仓") || content.includes("卖出") || content.includes("锁定收益")) {
      action = "sell";
    } else if (content.includes("加仓") || content.includes("买入")) {
      action = "buy";
    }

    // 收集信源（带时间校验）
    const sources: string[] = [];

    for (const stock of focusStocks) {
      try {
        const searchQuery = `${stock.stockName} ${stock.stockCode} 最新行情 资金流向 今日 最新`;
        const searchResponse = await searchClient.webSearch(searchQuery, 3, false);
        if (searchResponse.web_items && searchResponse.web_items.length > 0) {
          // 过滤掉过时的信息
          const recentItems = searchResponse.web_items.filter(item => {
            const publishTime = extractPublishTime(item);
            if (!publishTime) {
              return false;
            }
            return publishTime >= oneDayAgo;
          });

          recentItems.slice(0, 1).forEach((item: any) => {
            if (item.url && item.site_name) {
              const publishTime = extractPublishTime(item);
              const sourceKey = `${item.site_name}: ${item.url} (发布时间: ${publishTime ? publishTime.toLocaleString('zh-CN') : '未知'})`;
              if (!sources.some(s => s.includes(item.url)) && sources.length < 5) {
                sources.push(sourceKey);
              }
            }
          });
        }
      } catch (error) {
        continue;
      }
    }

    // 5. 推送去重检查（防止重复推送）
    const recentAlerts = await recommendationManager.getRecentRecommendations({
      type: "alert",
      limit: 5, // 检查最近5条
    });

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1小时前

    // 检查是否有相似的推送（1小时内）
    const hasSimilarAlert = recentAlerts.some(alert => {
      const alertTime = new Date(alert.createdAt);
      if (alertTime < oneHourAgo) return false; // 超过1小时，不考虑

      // 比较触发原因相似度
      const alertExplanation = alert.explanation || '';
      const reasonSimilar = triggerReason.includes(alertExplanation) ||
                           alertExplanation.includes(triggerReason) ||
                           (alertExplanation.includes('异动') && triggerReason.includes('异动')) ||
                           (alertExplanation.includes('新高') && triggerReason.includes('新高'));

      // 比较异动股票相似度
      const alertStocks = alert.relatedStock || '';
      const currentStocks = focusStocks.map(s => s.stockCode).join(',');
      const stockSimilar = alertStocks && currentStocks && currentStocks.includes(alertStocks);

      // 检查是否是相同的股票异动
      const sameStockMove = focusStocks.some(move => {
        return alertExplanation.includes(move.stockName) || alertExplanation.includes(move.stockCode);
      });

      return reasonSimilar || stockSimilar || sameStockMove;
    });

    if (hasSimilarAlert) {
      console.log(`检测到相似推送，跳过此次推送。触发原因: ${triggerReason}`);
      return NextResponse.json({
        triggered: false,
        reason: "检测到相似推送，跳过此次重复推送（1小时内）",
        data: {
          significantMoves: significantMoves.length,
          threeMonthHighs: threeMonthHighs.length,
          skipped: true,
        },
      });
    }

    // 6. 保存建议到数据库
    const recommendation = await recommendationManager.createRecommendation({
      type: "alert",
      content,
      explanation: triggerReason,
      action: action as "buy" | "sell" | "hold",
      relatedStock: focusStocks[0]?.stockCode || null, // 取第一只关注的股票
      sources: sources.join('\n'),
    });

    // 7. 更新历史新高的推送日期
    for (const high of threeMonthHighs) {
      await stockHighPriceManager.updateLastAlertDate(high.stockCode);
    }

    // 8. 如果配置了飞书 webhook，推送建议
    if (userConfig.feishuWebhookUrl) {
      try {
        await sendAlertToFeishu(userConfig.feishuWebhookUrl, {
          content,
          action,
          triggerReason,
          significantMoves: significantMoves.length,
          threeMonthHighs: threeMonthHighs.length,
        });
      } catch (error) {
        console.error("推送飞书失败:", error);
      }
    }

    // 返回触发结果
    return NextResponse.json({
      triggered: true,
      action,
      triggerReason,
      triggerType,
      significantMoves: significantMoves.length,
      threeMonthHighs: threeMonthHighs.length,
      stockPriceData: stockPriceData.map(h => ({
        stockCode: h.stockCode,
        stockName: h.stockName,
        dailyChange: h.dailyChange ? (h.dailyChange * 100).toFixed(2) : null,
      })),
    });
  } catch (error: any) {
    console.error("监控持仓失败:", error);
    return NextResponse.json(
      { triggered: false, reason: error.message || "监控失败" },
      { status: 500 }
    );
  }
}

/**
 * 从搜索结果中提取价格（当前价格和开盘价）
 * @returns { currentPrice: number | null, openPrice: number | null }
 */
function extractPriceFromSearchResults(items: any[], stockName: string): {
  currentPrice: number | null;
  openPrice: number | null;
} {
  let currentPrice: number | null = null;
  let openPrice: number | null = null;

  for (const item of items) {
    // 优先从 content 字段提取价格
    const text = item.content || item.title || item.description || "";

    // 提取当前价格
    if (!currentPrice) {
      // 更精确的价格匹配：优先匹配 "报X元" 格式，这是最常见的股票价格表示方式
      const pricePatterns = [
        /报\s*(\d{1,4}\.\d{2})\s*元/, // "报10.18元"
        /现价\(人民币\)\s*[▲▼\s]*(\d{1,4}\.\d{2})/, // "现价(人民币) 10.170"
        /现价\s*[▲▼\s]*(\d{1,4}\.\d{2})/, // "现价 10.170"
        /价格[：:]\s*(\d{1,4}\.\d{2})\s*元/,
        /最新价[：:]\s*(\d{1,4}\.\d{2})\s*元/,
        /当前价[：:]\s*(\d{1,4}\.\d{2})\s*元/,
        /报价[：:]\s*(\d{1,4}\.\d{2})\s*元/,
      ];

      for (const pattern of pricePatterns) {
        const match = text.match(pattern);
        if (match) {
          const price = parseFloat(match[1]);
          // 合理价格范围：0.5-1000元（股票价格通常在这个范围内）
          if (price >= 0.5 && price <= 1000) {
            currentPrice = price;
            console.log(`从 ${item.site_name} 提取到当前价格: ${price}`);
            break;
          }
        }
      }
    }

    // 提取开盘价
    if (!openPrice) {
      const openPatterns = [
        /今开[：:]\s*(\d{1,4}\.\d{2})/, // "今开: 10.00"
        /开盘[：:]\s*(\d{1,4}\.\d{2})/, // "开盘: 10.00"
        /开盘价[：:]\s*(\d{1,4}\.\d{2})/, // "开盘价: 10.00"
        /今日开盘[：:]\s*(\d{1,4}\.\d{2})/, // "今日开盘: 10.00"
      ];

      for (const pattern of openPatterns) {
        const match = text.match(pattern);
        if (match) {
          const price = parseFloat(match[1]);
          if (price >= 0.5 && price <= 1000) {
            openPrice = price;
            console.log(`从 ${item.site_name} 提取到开盘价: ${price}`);
            break;
          }
        }
      }
    }

    // 如果两个价格都找到了，提前退出
    if (currentPrice && openPrice) {
      break;
    }
  }

  if (!currentPrice) {
    console.log(`所有搜索结果中未找到有效当前价格`);
  }

  return { currentPrice, openPrice };
}

/**
 * 从搜索结果中提取发布时间
 * 支持多种时间格式：
 * - date字段
 * - published_at字段
 * - title中的时间（如"今日10:30"）
 * - URL中的日期
 */
function extractPublishTime(item: any): Date | null {
  // 1. 尝试从date字段提取
  if (item.date) {
    const date = new Date(item.date);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // 2. 尝试从published_at字段提取
  if (item.published_at) {
    const date = new Date(item.published_at);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // 3. 尝试从title中提取时间
  const title = item.title || "";
  const now = new Date();

  // 匹配"今日10:30"、"今日下午"等格式
  if (title.includes("今日")) {
    return now;
  }

  // 匹配具体时间格式（如"10:30"、"14:05"）
  const timePattern = /(\d{1,2}):(\d{2})/;
  const timeMatch = title.match(timePattern);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // 4. 尝试从URL中提取日期
  const url = item.url || "";
  const urlDatePattern = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
  const urlDateMatch = url.match(urlDatePattern);
  if (urlDateMatch) {
    const year = parseInt(urlDateMatch[1]);
    const month = parseInt(urlDateMatch[2]);
    const day = parseInt(urlDateMatch[3]);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // 5. 匹配"2月9日"、"2026年2月9日"等格式
  const chineseDatePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日|(\d{1,2})月(\d{1,2})日/;
  const chineseDateMatch = title.match(chineseDatePattern);
  if (chineseDateMatch) {
    if (chineseDateMatch[1]) {
      // 完整日期：2026年2月9日
      const year = parseInt(chineseDateMatch[1]);
      const month = parseInt(chineseDateMatch[2]);
      const day = parseInt(chineseDateMatch[3]);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } else {
      // 短日期：2月9日，假设是今年
      const month = parseInt(chineseDateMatch[4]);
      const day = parseInt(chineseDateMatch[5]);
      const date = new Date(now.getFullYear(), month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // 无法提取时间，返回null
  console.warn(`无法从以下内容提取发布时间: ${title}`);
  return null;
}

/**
 * 推送实时监控到飞书
 */
async function sendAlertToFeishu(webhookUrl: string, data: any) {
  const actionColor =
    data.action === "buy" ? "green" : data.action === "sell" ? "red" : "orange";
  const actionText =
    data.action === "buy"
      ? "买入"
      : data.action === "sell"
      ? "卖出"
      : "关注";

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
            content: data.content,
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "div",
          text: {
            tag: "plain_text",
            content: `⚡ 实时监控 - ${data.triggerReason}`,
          },
        },
      ],
      header: {
        title: {
          tag: "plain_text",
          content: `⚡ 实时监控 - ${actionText}`,
        },
        template: actionColor,
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
    throw new Error(`飞书推送失败: ${response.statusText}`);
  }
}
