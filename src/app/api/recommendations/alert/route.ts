import { NextRequest, NextResponse } from "next/server";
import { userConfigManager, holdingManager, recommendationManager } from "@/storage/database";
import { LLMClient, SearchClient, HeaderUtils, Config } from "coze-coding-dev-sdk";

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
    
    // 3. 搜索实时行情信息（带时间校验）
    const searchConfig = new Config();
    // @ts-ignore
    const searchClient = new SearchClient(searchConfig, customHeaders as any);

    // 定义权威行情数据源
    const trustedSites = ['新浪财经', '东方财富', '同花顺', '证券之星', '和讯网', '搜狐证券', '网易财经', '腾讯财经', '金融界'];

    const searchResults: any[] = [];
    const sources: string[] = [];

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24小时前

    for (const holding of holdings) {
      try {
        // 在搜索查询中添加时间关键词，确保获取最新信息
        const searchQuery = `${holding.stockName} ${holding.stockCode} 股票行情 股价 涨跌幅 今日 最新 实时`;
        const response = await searchClient.webSearch(searchQuery, 5, false);

        if (response.web_items && response.web_items.length > 0) {
          // 过滤掉股吧、论坛等非权威源
          const filteredItems = response.web_items.filter(item => {
            const site = item.site_name || "";
            const excludeKeywords = ['股吧', '论坛', '社区', '吧', '讨论'];
            return !excludeKeywords.some(kw => site.includes(kw) || item.title.includes(kw)) &&
                   trustedSites.some(trusted => site.includes(trusted));
          });

          // 进一步过滤：确保信息是最新的
          const recentItems = filteredItems.filter(item => {
            const publishTime = extractPublishTime(item);
            // 如果无法提取时间，保守起见排除
            if (!publishTime) {
              console.warn(`无法提取发布时间: ${item.title}`);
              return false;
            }
            // 只保留24小时内的信息
            const isRecent = publishTime >= oneDayAgo;
            if (!isRecent) {
              console.warn(`信息过时: ${item.title} (发布时间: ${publishTime.toISOString()})`);
            }
            return isRecent;
          });

          if (recentItems.length > 0) {
            searchResults.push({
              stockCode: holding.stockCode,
              stockName: holding.stockName,
              items: recentItems.slice(0, 3).map((item: any) => ({
                title: item.title,
                url: item.url,
                siteName: item.site_name,
                publishTime: extractPublishTime(item),
              })),
            });

            recentItems.slice(0, 2).forEach(item => {
              if (item.url && item.site_name) {
                const sourceKey = `${item.site_name}: ${item.url} (发布时间: ${extractPublishTime(item)?.toLocaleString('zh-CN')})`;
                if (!sources.some(s => s.includes(item.url!))) {
                  sources.push(sourceKey);
                }
              }
            });
          } else {
            console.warn(`${holding.stockName}: 没有找到24小时内的最新信息`);
          }
        }
      } catch (error) {
        console.error(`搜索 ${holding.stockName} 失败:`, error);
      }
    }
    
    // 4. 构建 LLM prompt
    const llmConfig = new Config();
    // @ts-ignore
    const llmClient = new LLMClient(llmConfig, customHeaders as any);

    // 计算实际持仓数据和年度盈利目标
    const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.costPrice, 0);
    const annualProfitTarget = totalCost * (userConfig.profitTarget / 100);

    const systemPrompt = `你是一位专业的 A 股持仓分析师，擅长基于年度盈利目标进行整体仓位分析，关注短期机会与长期布局。

## 核心目标
你的核心任务是在一个自然年内，帮助用户赚到 ¥${annualProfitTarget.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 的利润。
计算公式：总仓位 ¥${totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × 盈利目标 ${userConfig.profitTarget}% = ¥${annualProfitTarget.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

## 投资配置
- 目标持仓总金额：¥${userConfig.positionAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- 实际总仓位：¥${totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- 年度盈利目标：¥${annualProfitTarget.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${userConfig.profitTarget}%)
- 操作风格：${userConfig.tradingStyle === 'short_term' ? '短期做T为主' : '中长期投资为主'}
- 当前持仓数量：${holdings.length} 只

## 持仓明细
${holdings.map((h, i) => `${i + 1}. ${h.stockName} (${h.stockCode}): 持有 ${h.quantity} 股，成本价 ¥${h.costPrice.toFixed(2)}`).join('\n')}

## 你的任务
基于上述年度盈利目标和当前持仓，从整体仓位角度进行分析，关注短期机会与长期布局：

### 1. 短期机会
针对当前市场机会和风险，识别短期（日内、周内）的投资机会：
- 短期买入机会：看涨且有明确催化剂的标的
- 短期风险规避：看跌或达到短期高点的标的
- 做T机会：利用日内波动降低成本

### 2. 长期布局
基于基本面和长期趋势，规划中长线（月度、季度）的持仓策略：
- 核心持仓定位：明确哪些是长期持有的优质标的
- 长期加仓布局：识别回调时的长期买入机会
- 长期退出策略：基本面恶化或达到目标价位时的退出时机

## 输出格式要求

请严格按照以下格式输出：

【短期机会】
[机会/风险描述] - [股票代码]
[机会/风险描述] - [股票代码]

【长期布局】
[核心持仓规划和长期策略描述]

【核心逻辑】
[支撑观点的核心逻辑分析，包括基本面、技术面、资金面等维度]

【信源验证】
[列出2-3个权威信源，并说明交叉验证的结果]

## 关键要求

1. **整体视角**：从整体仓位角度进行分析，而非单只股票的孤立判断
2. **短期机会 + 长期布局**：必须同时给出短期机会和长期布局，形成完整的投资策略
3. **信源权威**：
   - 必须使用最新（24小时内）的权威数据源
   - 优先使用：新浪财经、东方财富、同花顺、证券之星、和讯网、金融界等
   - 严禁使用股吧、论坛、社区等非权威信源
4. **交叉验证**：
   - 至少引用2个不同信源的信息
   - 观点必须经过交叉验证，不能道听途说
   - 对于矛盾的观点要明确说明你的判断依据
5. **字数灵活**：总字数控制在400-600字，确保逻辑清晰，分析充分
6. **观点明确**：不模棱两可，给出清晰的操作指令
7. **风险提示**：如果涉及高波动标的，必须添加风险提示

## 示例输出

【短期建议】
买入 601012 - 光伏板块回暖，主力资金净流入
持有 603259 - CXO龙头企稳，建议继续持有
卖出 000657 - 短期技术面走弱，获利了结

【长期策略】
核心持仓：601012（隆基绿能）、603259（药明康德），长期持有，目标涨幅30%
加仓机会：港股通恒生科技ETF（520840）回调至1.5元以下时分批建仓

【核心逻辑】
光伏板块受政策利好驱动，中长期景气度向上；CXO板块估值处于历史低位，具备修复空间；港股科技板块受益于流动性改善，具备配置价值。

【信源验证】
1. 新浪财经：光伏行业政策持续加码，装机量预期上调
2. 东方财富：药明康德获QFII增持，外资回流明显
3. 证券之星：北向资金连续3日净流入，偏好新能源、医药板块
交叉验证结果：三个信源均指向新能源、医药板块的复苏趋势，观点一致可信。`;

    const userPrompt = `请基于以下最新的权威市场信息（均为24小时内发布），按照上述要求生成操作建议：

⚠️ 重要提醒：以下所有信息均为24小时内的最新数据，请基于这些实时信息进行分析，切勿使用历史数据或过时信息！

${searchResults.map(r => `【${r.stockName} (${r.stockCode})】
${r.items.map((i: any) => `  - ${i.siteName}: ${i.title} (${i.publishTime ? `发布时间: ${i.publishTime.toLocaleString('zh-CN')}` : '未知时间'})`).join('\n')}
`).join('\n')}

请严格遵循系统提示词的要求，给出针对年度盈利目标 ¥${annualProfitTarget.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 的短期和长期操作建议。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // 5. 调用 LLM 生成建议
    const response = await llmClient.invoke(messages, {
      temperature: 0.5,
    });

    const content = response.content || "";

    // 解析操作类型
    let action = "hold";
    if (content.includes("买入")) {
      action = "buy";
    } else if (content.includes("卖出")) {
      action = "sell";
    }

    // 智能提取相关股票代码
    let relatedStock = null;
    // 1. 优先从内容中提取操作建议中的股票代码
    const actionPattern = /【操作】(买入|卖出|持有)\s*(\d{6})/g;
    let match;
    while ((match = actionPattern.exec(content)) !== null) {
      relatedStock = match[2]; // 提取操作对应的股票代码
      break; // 只取第一个
    }

    // 2. 如果没有找到，尝试从短期建议中提取
    if (!relatedStock) {
      const shortTermPattern = /(买入|卖出|T\+0操作|持有)\s*[（\(]?(\d{6})/g;
      while ((match = shortTermPattern.exec(content)) !== null) {
        relatedStock = match[2];
        break;
      }
    }

    // 3. 如果还是没找到，才使用持仓第一只股票
    if (!relatedStock) {
      relatedStock = holdings[0]?.stockCode || null;
    }
    
    // 6. 保存建议到数据库
    const recommendation = await recommendationManager.createRecommendation({
      type: "alert",
      content,
      explanation: searchResults.map(r => r.items.map((i: any) => i.title).join('; ')).join('\n'),
      action,
      relatedStock: relatedStock || undefined,
      sources: sources.join('\n'),
    });
    
    // 7. 如果配置了飞书 webhook，推送建议
    if (userConfig.feishuWebhookUrl) {
      try {
        await sendAlertToFeishu(userConfig.feishuWebhookUrl, {
          content,
          action,
          relatedStock,
        });
      } catch (error) {
        console.error("推送飞书失败:", error);
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

async function sendAlertToFeishu(webhookUrl: string, data: any) {
  const actionColor = 'blue';

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
            content: "📊 持仓分析 - 手动触发",
          },
        },
      ],
      header: {
        title: {
          tag: "plain_text",
          content: `📊 持仓分析 - 短期机会 + 长期布局`,
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
    const error = await response.text();
    throw new Error(`飞书推送失败: ${error}`);
  }
}
