import { NextRequest, NextResponse } from "next/server";
import { SearchClient } from "coze-coding-dev-sdk";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getStockPriceEnhanced } from "@/lib/stock-price-enhanced";
import type { Message } from "coze-coding-dev-sdk";

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
  console.warn(`[extractPublishTime] 无法提取发布时间: ${title}`);
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockCode = searchParams.get("stockCode");
    const stockName = searchParams.get("stockName");

    if (!stockCode || !stockName) {
      return NextResponse.json(
        { error: "请提供 stockCode 和 stockName 参数" },
        { status: 400 }
      );
    }

    console.log(`[stock-analysis] 开始分析 ${stockName} (${stockCode})...`);

    // 获取自定义headers
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 并行获取数据和搜索
    const [priceData, searchResults] = await Promise.all([
      getStockPriceEnhanced(stockCode, stockName, 0),
      searchStockNews(stockCode, stockName, customHeaders)
    ]);

    // 获取当前价格和涨跌幅
    const currentPrice = priceData.currentPrice || 0;
    const changePercent = priceData.changePercent || 0;

    // 使用LLM生成分析报告
    let analysis = "";
    let outlook = "";

    try {
      const analysisResult = await generateAnalysisReport(
        stockName,
        stockCode,
        currentPrice,
        changePercent,
        searchResults,
        customHeaders
      );
      analysis = analysisResult.analysis || "";
      outlook = analysisResult.outlook || "";
    } catch (error) {
      console.error("[stock-analysis] 生成分析报告失败:", error);
      analysis = "分析报告生成失败，请稍后重试。";
    }

    const result = {
      stockName,
      stockCode,
      currentPrice,
      changePercent,
      news: searchResults.news || [],
      analysis,
      outlook,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[stock-analysis] 分析失败:", error);
    return NextResponse.json(
      { error: error.message || "分析失败" },
      { status: 500 }
    );
  }
}

/**
 * 搜索股票新闻和研报
 * 只返回7天内的新闻，并显示真实的发布时间
 */
async function searchStockNews(
  stockCode: string,
  stockName: string,
  customHeaders: any
): Promise<{
  news: Array<{
    title: string;
    url: string;
    summary?: string;
    date?: string;
    publishTime?: Date;
  }>;
}> {
  try {
    const searchConfig = new Config();
    const searchClient = new SearchClient(searchConfig, customHeaders);

    // 搜索最近的新闻和研报
    const query = `${stockName} ${stockCode} 新闻 研报 最新 股价走势`;
    const response = await searchClient.webSearch(query, 8, false); // 多搜索一些，过滤后可能不足

    if (!response.web_items || response.web_items.length === 0) {
      console.log(`[stock-analysis] 未搜索到新闻`);
      return { news: [] };
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const news = response.web_items
      .map((item: any) => {
        const publishTime = extractPublishTime(item);
        return {
          title: item.title || "",
          url: item.url || "",
          summary: item.snippet || "",
          date: publishTime ? publishTime.toLocaleDateString('zh-CN') : undefined,
          publishTime: publishTime || undefined,
        };
      })
      .filter((newsItem) => {
        // 只保留有发布时间且在7天内的新闻
        if (!newsItem.publishTime) {
          console.warn(`[stock-analysis] 跳过无发布时间的新闻: ${newsItem.title}`);
          return false;
        }
        if (newsItem.publishTime < sevenDaysAgo) {
          console.log(`[stock-analysis] 跳过过期新闻 (${newsItem.publishTime.toLocaleDateString('zh-CN')}): ${newsItem.title}`);
          return false;
        }
        return true;
      });

    console.log(`[stock-analysis] 搜索到 ${news.length} 条7天内新闻（原始${response.web_items.length}条）`);
    return { news };
  } catch (error) {
    console.error("[stock-analysis] 搜索新闻失败:", error);
    return { news: [] };
  }
}

/**
 * 生成分析报告
 */
async function generateAnalysisReport(
  stockName: string,
  stockCode: string,
  currentPrice: number,
  changePercent: number,
  searchResults: any,
  customHeaders: any
): Promise<{
  analysis: string;
  outlook: string;
}> {
  try {
    const llmConfig = new Config();
    // @ts-ignore - customHeaders 传参在运行时有效
    const client = new LLMClient(llmConfig, customHeaders);

    // 构建prompt
    let prompt = `请分析以下股票，提供专业的技术分析和后市展望：

## 股票信息
- 股票名称：${stockName}
- 股票代码：${stockCode}
- 当前价格：¥${currentPrice.toFixed(2)}
- 涨跌幅：${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%

## 最新新闻摘要
`;

    if (searchResults.news && searchResults.news.length > 0) {
      searchResults.news.slice(0, 5).forEach((news: any, index: number) => {
        prompt += `${index + 1}. ${news.title}\n   ${news.summary || ''}\n\n`;
      });
    } else {
      prompt += "暂无最新新闻\n\n";
    }

    prompt += `请从以下几个方面进行分析：

### 1. 走势分析（基于近3个月股价数据）
- 技术指标分析（MACD、KDJ、RSI等）
- 价格走势形态（头肩顶、双底、三角形整理等）
- 支撑位和阻力位（基于近3个月高低点）
- 成交量分析
- 趋势线分析（上升、下降、横盘）
- 均线系统分析（5日、10日、20日、60日均线）

### 2. 后市展望
- 短期走势预测（1-2周）
- 中长期趋势判断（1-3个月）
- 投资建议（买入/持有/卖出/观望）
- 风险提示

**重要要求：**
1. 基于公开数据进行分析，重点关注近3个月的技术走势
2. 明确标注"基于公开数据分析，不构成投资建议"
3. 如果数据不足，诚实地说明局限性
4. 分析要客观，避免过度乐观或悲观
5. 使用专业的投资术语
6. 针对历史3个月的价格行为进行深度分析
7. 识别关键技术位（支撑位、阻力位、突破位）
8. 评估当前价格在3个月走势中的位置（高位、低位、中位）

请按以下格式输出：

【走势分析】
（详细内容）

【后市展望】
（详细内容）`;

    const messages: Message[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await client.invoke(messages, {
      temperature: 0.7,
    });

    let content = response.content || "";

    // 解析分析报告
    const analysisMatch = content.match(/【走势分析】([\s\S]*?)(?=\n【后市展望】|$)/);
    const outlookMatch = content.match(/【后市展望】([\s\S]*?)$/);

    const analysis = analysisMatch ? analysisMatch[1].trim() : "";
    const outlook = outlookMatch ? outlookMatch[1].trim() : "";

    return {
      analysis,
      outlook,
    };
  } catch (error) {
    console.error("[stock-analysis] 生成LLM报告失败:", error);
    return {
      analysis: "分析报告生成失败，请稍后重试。",
      outlook: "",
    };
  }
}
