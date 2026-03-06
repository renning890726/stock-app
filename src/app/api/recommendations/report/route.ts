import { NextRequest, NextResponse } from "next/server";
import { userConfigManager, holdingManager, recommendationManager } from "@/storage/database";
import { LLMClient, HeaderUtils, Config } from "coze-coding-dev-sdk";
import { getMarketIndexFromAkshare, getMarketSummaryFromAkshare } from "@/lib/stock-price-akshare";
import { getStockPricesBatch } from "@/lib/stock-price-enhanced";
import { executeMultiRoundSearch, formatMultiRoundSearchResult, type MultiRoundSearchResult } from "@/lib/multi-round-search";

export async function POST(request: NextRequest) {
  try {
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

    // 合并股价数据到持仓对象
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

    // 3. 多轮搜索（市场概况 + 个股详情）
    console.log("🚀 开始执行多轮搜索...");
    let searchResult: MultiRoundSearchResult | null = null;
    const sources: string[] = [];

    try {
      searchResult = await executeMultiRoundSearch(
        holdingsWithPrice.map(h => ({ stockCode: h.stockCode, stockName: h.stockName })),
        dateStr,
        {
          enableTechnicalAnalysis: true, // 开启深度技术分析搜索，优化买卖价格生成
        }
      );

      if (searchResult) {
        console.log("✅ 多轮搜索成功完成");
        // 收集信源
        sources.push(...(searchResult.sources || []));
      }
    } catch (error) {
      console.error("❌ 多轮搜索失败:", error);
      // 多轮搜索失败不影响报告生成，继续使用Akshare数据
    }

    // 4. 获取市场指数数据（Akshare优先）
    let marketInfoFromAkshare: any = null;

    try {
      console.log("尝试使用 Akshare 获取市场指数...");
      const marketIndexData = await getMarketIndexFromAkshare();

      if (marketIndexData && marketIndexData.indices && marketIndexData.indices.length > 0) {
        marketInfoFromAkshare = marketIndexData;
        console.log("✅ Akshare 市场指数获取成功");
      } else {
        console.log("⚠️ Akshare 返回数据不完整");
      }
    } catch (error) {
      console.error("❌ Akshare 市场指数获取失败:", error);
    }

    // 5. 构建 LLM prompt
    const llmConfig = new Config();
    // @ts-ignore
    const llmClient = new LLMClient(llmConfig, customHeaders as any);

    // 计算实际持仓数据
    const totalCost = holdingsWithPrice.reduce((sum, h) => sum + h.quantity * h.costPrice, 0);
    const totalCurrentValue = holdingsWithPrice.reduce((sum, h) => sum + h.quantity * (h.currentPrice || h.costPrice), 0);
    const totalProfit = totalCurrentValue - totalCost;
    const profitPercent = totalCost > 0 ? (totalProfit / totalCost * 100) : 0;

    // 构建持仓数据字符串（准确数据）
    const holdingsDataString = holdingsWithPrice.map(h =>
      `  - ${h.stockName}（${h.stockCode}）：持有 ${h.quantity} 股，成本价 ¥${h.costPrice.toFixed(2)}，当前价 ¥${h.currentPrice.toFixed(2)}，涨跌幅 ${h.changePercent > 0 ? '+' : ''}${h.changePercent.toFixed(2)}%，市盈率 ${h.peRatio || 'N/A'}，数据来源：${h.priceSource}`
    ).join('\n');

    // 构建市场指数数据字符串
    let marketInfoString = "";
    if (marketInfoFromAkshare && marketInfoFromAkshare.indices) {
      const indices = marketInfoFromAkshare.indices;
      marketInfoString = `【市场数据来源：Akshare - 实时数据】

## 市场指数
${indices.map((idx: any) =>
  `- ${idx['指数名称']}: ${idx['最新点位']}点, 涨跌幅 ${idx['涨跌幅']}%`
).join('\n')}
`;
    }

    // 格式化多轮搜索结果
    const searchInfoString = searchResult ? formatMultiRoundSearchResult(searchResult) : "";

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
- 买卖价格必须重点参考【第三轮搜索：深度技术分析】中的支撑位、阻力位、技术指标、机构目标价等数据
- 结合K线形态、资金流向、交易量等多维度分析，给出精确的买入价区间和卖出价区间
- 避免给出过于宽泛的价格区间（如"18-25"），应该基于技术位给出更精确的区间（如"18.50-19.20"）

请根据【准确数据】和【网络资讯】，按照systemPrompt中定义的格式生成高质量的持仓分析报告。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // 6. 调用 LLM 生成报告
    const response = await llmClient.invoke(messages, {
      temperature: 0.6,
    });

    const content = response.content || "";
    
    // 6. 保存报告到数据库
    const stockCodeList = holdingsWithPrice.map(h => h.stockCode).join(',');
    const recommendation = await recommendationManager.createRecommendation({
      type: "report",
      content,
      explanation: `【多轮搜索报告】\n第一轮：市场概况\n第二轮：个股详情\n${searchInfoString.substring(0, 500)}`,
      relatedStock: stockCodeList.substring(0, 100), // 限制100字符
      sources: sources.join('\n'),
    });
    
    // 7. 如果配置了飞书 webhook，推送报告
    if (userConfig.feishuWebhookUrl) {
      try {
        // 去掉"## 重要信源"部分，不推送到飞书
        let contentToSend = content;
        const sourceSectionIndex = content.indexOf('## 重要信源');
        if (sourceSectionIndex !== -1) {
          contentToSend = content.substring(0, sourceSectionIndex).trim();
        }

        // 如果报告太长，拆分成多条消息发送
        const maxLength = 2500; // 每条消息最多 2500 字符
        if (contentToSend.length <= maxLength) {
          // 单条消息即可
          await sendReportToFeishu(userConfig.feishuWebhookUrl, {
            title: "每日持仓分析报告",
            content: contentToSend,
          });
        } else {
          // 需要拆分成多条消息
          console.log(`报告过长 (${contentToSend.length} 字符)，拆分成多条消息发送...`);

          // 智能分割：按章节边界分割
          const sections = contentToSend.split('\n##');
          const parts: string[] = [];
          let currentPart = sections[0]; // 第一部分（开头到第一个 ## 之前）

          for (let i = 1; i < sections.length; i++) {
            const section = '##' + sections[i];

            if (currentPart.length + section.length > maxLength) {
              // 当前部分已满，保存并开始新部分
              parts.push(currentPart);
              currentPart = section;
            } else {
              // 可以添加到当前部分
              currentPart += section;
            }
          }

          // 添加最后一部分
          if (currentPart) {
            parts.push(currentPart);
          }

          // 发送每一条消息
          const totalParts = parts.length;
          for (let i = 0; i < totalParts; i++) {
            await sendReportToFeishu(
              userConfig.feishuWebhookUrl,
              {
                title: "每日持仓分析报告",
                content: parts[i],
              },
              i + 1,
              totalParts
            );
            // 添加延迟，避免发送过快
            if (i < totalParts - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          console.log(`✅ 报告已拆分成 ${totalParts} 条消息发送`);
        }
      } catch (error) {
        console.error("推送飞书失败:", error);
      }
    }
    
    return NextResponse.json(recommendation);
  } catch (error: any) {
    console.error("生成报告失败:", error);
    return NextResponse.json(
      { message: error.message || "生成报告失败" },
      { status: 500 }
    );
  }
}

async function sendReportToFeishu(
  webhookUrl: string,
  data: { title: string; content: string },
  partIndex?: number,
  totalParts?: number
) {
  // 构建标题，如果有多条消息，添加序号
  const displayTitle = totalParts && totalParts > 1
    ? `${data.title} (${partIndex}/${totalParts})`
    : data.title;

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
            content: `**${displayTitle}**\n\n${data.content}`,
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "div",
          text: {
            tag: "plain_text",
            content: "💡 每日收盘后21:30自动推送",
          },
        },
      ],
      header: {
        title: {
          tag: "plain_text",
          content: displayTitle,
        },
        template: "blue",
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
    console.error("飞书推送失败:", error);
    throw new Error(`飞书推送失败: ${error}`);
  }
}
