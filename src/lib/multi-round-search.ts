/**
 * 多轮搜索模块
 * 实现分阶段搜索策略：
 * 1. 第一轮：搜索市场概况（整体市场、指数、情绪、热点板块）
 * 2. 第二轮：搜索个股详情（新闻、公告、基础技术面）
 * 3. 第三轮：深度技术分析（支撑位、阻力位、技术指标、研报目标价）
 */

import { SearchClient, Config } from "coze-coding-dev-sdk";

/**
 * 定义权威行情数据源
 */
const TRUSTED_SITES = [
  '新浪财经', '东方财富', '同花顺', '证券之星', '和讯网',
  '搜狐证券', '网易财经', '腾讯财经', '金融界', '中国证券网',
  '上海证券报', '证券时报', '证券日报', '中国证券报'
];

/**
 * 排除关键词
 */
const EXCLUDE_KEYWORDS = ['股吧', '论坛', '社区', '吧', '讨论', '问答', '话题', '粉丝', '圈子'];

/**
 * 过滤搜索结果
 */
function filterSearchResults(web_items: any[]) {
  return web_items.filter(item => {
    const site = item.site_name || "";
    const title = item.title || "";

    // 排除非权威源和无关内容
    return !EXCLUDE_KEYWORDS.some(kw => site.includes(kw) || title.includes(kw)) &&
           TRUSTED_SITES.some(trusted => site.includes(trusted));
  });
}

/**
 * 多轮搜索结果接口
 */
export interface MultiRoundSearchResult {
  round1: {
    marketOverview: {
      summary: string;
      indices: Array<{ title: string; url: string; siteName: string }>;
      sentiment: string;
      hotSectors: Array<{ title: string; url: string; siteName: string }>;
      timestamp: string;
    };
  };
  round2: {
    stocks: Array<{
      stockCode: string;
      stockName: string;
      news: Array<{ title: string; url: string; siteName: string; summary: string }>;
      analysis: Array<{ title: string; url: string; siteName: string; summary: string }>;
    }>;
  };
  round3?: {
    technicalAnalysis: Array<{
      stockCode: string;
      stockName: string;
      supportLevels: Array<{ title: string; url: string; siteName: string; content?: string }>;
      resistanceLevels: Array<{ title: string; url: string; siteName: string; content?: string }>;
      technicalIndicators: Array<{ title: string; url: string; siteName: string; content?: string }>;
      klinePattern: Array<{ title: string; url: string; siteName: string; content?: string }>;
      analystTarget: Array<{ title: string; url: string; siteName: string; content?: string }>;
    }>;
  };
  sources: string[];
}

/**
 * 第一轮搜索：市场概况
 */
async function searchMarketOverview(
  searchClient: SearchClient,
  dateStr: string
): Promise<MultiRoundSearchResult['round1']> {
  console.log("🔍 [第一轮搜索] 开始搜索市场概况...");

  const sources: string[] = [];

  // 1.1 搜索A股整体市场情况
  let marketOverviewSummary = "";
  const marketOverviewItems: any[] = [];

  try {
    const response = await searchClient.webSearch(
      `${dateStr} A股市场 整体走势 市场分析`,
      5,
      true
    );

    if (response.web_items) {
      const filteredItems = filterSearchResults(response.web_items).slice(0, 3);
      marketOverviewItems.push(...filteredItems.map(item => ({
        title: item.title,
        url: item.url,
        siteName: item.site_name,
      })));

      // 收集信源
      filteredItems.forEach(item => {
        if (item.url && item.site_name) {
          const sourceKey = `${item.site_name}: ${item.url}`;
          if (!sources.includes(sourceKey)) {
            sources.push(sourceKey);
          }
        }
      });

      marketOverviewSummary = response.summary || "";
    }
  } catch (error) {
    console.error("搜索市场概况失败:", error);
  }

  // 1.2 搜索主要指数表现
  const indicesItems: any[] = [];

  try {
    const response = await searchClient.webSearch(
      `${dateStr} 上证指数 深证成指 创业板指 涨跌幅 收盘`,
      5,
      true
    );

    if (response.web_items) {
      const filteredItems = filterSearchResults(response.web_items).slice(0, 3);
      indicesItems.push(...filteredItems.map(item => ({
        title: item.title,
        url: item.url,
        siteName: item.site_name,
      })));

      // 收集信源
      filteredItems.forEach(item => {
        if (item.url && item.site_name) {
          const sourceKey = `${item.site_name}: ${item.url}`;
          if (!sources.includes(sourceKey)) {
            sources.push(sourceKey);
          }
        }
      });
    }
  } catch (error) {
    console.error("搜索指数表现失败:", error);
  }

  // 1.3 搜索市场情绪和资金流向
  let sentimentSummary = "";
  const sentimentItems: any[] = [];

  try {
    const response = await searchClient.webSearch(
      `${dateStr} A股市场情绪 资金流向 北向资金`,
      5,
      true
    );

    if (response.web_items) {
      const filteredItems = filterSearchResults(response.web_items).slice(0, 2);
      sentimentItems.push(...filteredItems.map(item => ({
        title: item.title,
        url: item.url,
        siteName: item.site_name,
      })));

      // 收集信源
      filteredItems.forEach(item => {
        if (item.url && item.site_name) {
          const sourceKey = `${item.site_name}: ${item.url}`;
          if (!sources.includes(sourceKey)) {
            sources.push(sourceKey);
          }
        }
      });

      sentimentSummary = response.summary || "";
    }
  } catch (error) {
    console.error("搜索市场情绪失败:", error);
  }

  // 1.4 搜索当日热点板块
  const hotSectorsItems: any[] = [];

  try {
    const response = await searchClient.webSearch(
      `${dateStr} A股热点板块 涨幅榜 热点概念`,
      5,
      true
    );

    if (response.web_items) {
      const filteredItems = filterSearchResults(response.web_items).slice(0, 3);
      hotSectorsItems.push(...filteredItems.map(item => ({
        title: item.title,
        url: item.url,
        siteName: item.site_name,
      })));

      // 收集信源
      filteredItems.forEach(item => {
        if (item.url && item.site_name) {
          const sourceKey = `${item.site_name}: ${item.url}`;
          if (!sources.includes(sourceKey)) {
            sources.push(sourceKey);
          }
        }
      });
    }
  } catch (error) {
    console.error("搜索热点板块失败:", error);
  }

  console.log("✅ [第一轮搜索] 市场概况搜索完成");

  return {
    marketOverview: {
      summary: marketOverviewSummary,
      indices: indicesItems,
      sentiment: sentimentSummary,
      hotSectors: hotSectorsItems,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * 第二轮搜索：个股详情
 */
async function searchStockDetails(
  searchClient: SearchClient,
  holdings: Array<{ stockCode: string; stockName: string }>,
  dateStr: string
): Promise<MultiRoundSearchResult['round2']> {
  console.log(`🔍 [第二轮搜索] 开始搜索 ${holdings.length} 只股票的详细信息...`);

  const stocks: any[] = [];
  const sources: string[] = [];

  for (const holding of holdings) {
    console.log(`  - 搜索 ${holding.stockName} (${holding.stockCode})...`);

    const news: any[] = [];
    const analysis: any[] = [];

    // 2.1 搜索个股新闻
    try {
      const response = await searchClient.webSearch(
        `${dateStr} ${holding.stockName} ${holding.stockCode} 最新消息 新闻 公告`,
        5,
        true
      );

      if (response.web_items) {
        const filteredItems = filterSearchResults(response.web_items).slice(0, 3);
        news.push(...filteredItems.map(item => ({
          title: item.title,
          url: item.url,
          siteName: item.site_name,
          summary: item.summary || item.snippet || "",
        })));

        // 收集信源
        filteredItems.forEach(item => {
          if (item.url && item.site_name) {
            const sourceKey = `${item.site_name}: ${item.url}`;
            if (!sources.includes(sourceKey)) {
              sources.push(sourceKey);
            }
          }
        });
      }
    } catch (error) {
      console.error(`  ❌ 搜索 ${holding.stockName} 新闻失败:`, error);
    }

    // 2.2 搜索个股技术面分析
    try {
      const response = await searchClient.webSearch(
        `${holding.stockName} ${holding.stockCode} 技术面分析 K线分析 走势分析`,
        4,
        true
      );

      if (response.web_items) {
        const filteredItems = filterSearchResults(response.web_items).slice(0, 2);
        analysis.push(...filteredItems.map(item => ({
          title: item.title,
          url: item.url,
          siteName: item.site_name,
          summary: item.summary || item.snippet || "",
        })));

        // 收集信源
        filteredItems.forEach(item => {
          if (item.url && item.site_name) {
            const sourceKey = `${item.site_name}: ${item.url}`;
            if (!sources.includes(sourceKey)) {
              sources.push(sourceKey);
            }
          }
        });
      }
    } catch (error) {
      console.error(`  ❌ 搜索 ${holding.stockName} 技术面分析失败:`, error);
    }

    stocks.push({
      stockCode: holding.stockCode,
      stockName: holding.stockName,
      news,
      analysis,
    });
  }

  console.log("✅ [第二轮搜索] 个股详情搜索完成");

  return {
    stocks,
  };
}

/**
 * 第三轮搜索：行业动态（可选）
 */
/**
 * 第三轮搜索：深度技术分析
 * 搜索个股的支撑位、阻力位、技术指标、K线形态、机构目标价等深度分析
 */
async function searchTechnicalAnalysis(
  searchClient: SearchClient,
  holdings: Array<{ stockCode: string; stockName: string }>,
  dateStr: string
): Promise<MultiRoundSearchResult['round3']> {
  console.log(`🔍 [第三轮搜索] 开始搜索 ${holdings.length} 个股票的深度技术分析...`);

  const technicalAnalysisResult: any[] = [];

  for (const stock of holdings) {
    console.log(`  - 搜索 ${stock.stockCode} ${stock.stockName} 技术分析...`);

    const stockAnalysis = {
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      supportLevels: [] as any[],
      resistanceLevels: [] as any[],
      technicalIndicators: [] as any[],
      klinePattern: [] as any[],
      analystTarget: [] as any[],
    };

    // 3.1 搜索支撑位和阻力位
    try {
      const response = await searchClient.webSearch(
        `${stock.stockCode} ${stock.stockName} 支撑位 阻力位 关键价位 技术位`,
        4,
        true
      );

      if (response.web_items) {
        const filteredItems = filterSearchResults(response.web_items).slice(0, 2);
        stockAnalysis.supportLevels = filteredItems.map(item => ({
          title: item.title,
          url: item.url,
          siteName: item.site_name,
          content: item.snippet || item.summary,
        }));

        stockAnalysis.resistanceLevels = filteredItems.map(item => ({
          title: item.title,
          url: item.url,
          siteName: item.site_name,
          content: item.snippet || item.summary,
        }));
      }
    } catch (error) {
      console.error(`    ❌ 搜索 ${stock.stockCode} 支撑位/阻力位失败:`, error);
    }

    // 3.2 搜索技术指标分析
    try {
      const response = await searchClient.webSearch(
        `${stock.stockCode} ${stock.stockName} MACD KDJ RSI 布林带 技术指标分析`,
        4,
        true
      );

      if (response.web_items) {
        const filteredItems = filterSearchResults(response.web_items).slice(0, 2);
        stockAnalysis.technicalIndicators = filteredItems.map(item => ({
          title: item.title,
          url: item.url,
          siteName: item.site_name,
          content: item.snippet || item.summary,
        }));
      }
    } catch (error) {
      console.error(`    ❌ 搜索 ${stock.stockCode} 技术指标失败:`, error);
    }

    // 3.3 搜索K线形态
    try {
      const response = await searchClient.webSearch(
        `${stock.stockCode} ${stock.stockName} K线形态 技术走势 趋势分析`,
        4,
        true
      );

      if (response.web_items) {
        const filteredItems = filterSearchResults(response.web_items).slice(0, 2);
        stockAnalysis.klinePattern = filteredItems.map(item => ({
          title: item.title,
          url: item.url,
          siteName: item.site_name,
          content: item.snippet || item.summary,
        }));
      }
    } catch (error) {
      console.error(`    ❌ 搜索 ${stock.stockCode} K线形态失败:`, error);
    }

    // 3.4 搜索机构研报和目标价
    try {
      const response = await searchClient.webSearch(
        `${stock.stockCode} ${stock.stockName} 机构研报 目标价 评级 投资建议`,
        4,
        true
      );

      if (response.web_items) {
        const filteredItems = filterSearchResults(response.web_items).slice(0, 2);
        stockAnalysis.analystTarget = filteredItems.map(item => ({
          title: item.title,
          url: item.url,
          siteName: item.site_name,
          content: item.snippet || item.summary,
        }));
      }
    } catch (error) {
      console.error(`    ❌ 搜索 ${stock.stockCode} 机构研报失败:`, error);
    }

    technicalAnalysisResult.push(stockAnalysis);
  }

  console.log("✅ [第三轮搜索] 深度技术分析搜索完成");

  return {
    technicalAnalysis: technicalAnalysisResult,
  };
}

/**
 * 执行多轮搜索
 */
export async function executeMultiRoundSearch(
  holdings: Array<{ stockCode: string; stockName: string }>,
  dateStr: string,
  options?: {
    enableTechnicalAnalysis?: boolean;
  }
): Promise<MultiRoundSearchResult> {
  const searchConfig = new Config();
  const searchClient = new SearchClient(searchConfig);

  const allSources: string[] = [];

  // 第一轮：市场概况
  const round1 = await searchMarketOverview(searchClient, dateStr);

  // 第二轮：个股详情
  const round2 = await searchStockDetails(searchClient, holdings, dateStr);

  // 第三轮：深度技术分析（可选）
  let round3: any;
  if (options?.enableTechnicalAnalysis) {
    round3 = await searchTechnicalAnalysis(searchClient, holdings, dateStr);
  }

  // 收集所有信源
  // ... (round1 和 round2 的信源已经在各自函数中收集)

  console.log("🎉 [多轮搜索] 全部搜索完成");

  return {
    round1,
    round2,
    round3,
    sources: allSources,
  };
}

/**
 * 将多轮搜索结果转换为LLM可读的文本
 */
export function formatMultiRoundSearchResult(result: MultiRoundSearchResult): string {
  let text = "";

  // 第一轮：市场概况
  text += "【第一轮搜索：市场概况】\n\n";

  if (result.round1.marketOverview.summary) {
    text += `## 市场整体情况\n${result.round1.marketOverview.summary}\n\n`;
  }

  if (result.round1.marketOverview.indices.length > 0) {
    text += `## 主要指数表现\n`;
    result.round1.marketOverview.indices.forEach((item, idx) => {
      text += `${idx + 1}. ${item.title} - ${item.siteName}\n`;
    });
    text += "\n";
  }

  if (result.round1.marketOverview.sentiment) {
    text += `## 市场情绪与资金流向\n${result.round1.marketOverview.sentiment}\n\n`;
  }

  if (result.round1.marketOverview.hotSectors.length > 0) {
    text += `## 当日热点板块\n`;
    result.round1.marketOverview.hotSectors.forEach((item, idx) => {
      text += `${idx + 1}. ${item.title} - ${item.siteName}\n`;
    });
    text += "\n";
  }

  // 第二轮：个股详情
  text += "【第二轮搜索：个股详情】\n\n";

  result.round2.stocks.forEach(stock => {
    text += `## ${stock.stockName} (${stock.stockCode})\n`;

    if (stock.news.length > 0) {
      text += `### 最新消息\n`;
      stock.news.forEach((item, idx) => {
        text += `${idx + 1}. ${item.title}\n`;
        if (item.summary) {
          text += `   摘要：${item.summary}\n`;
        }
        text += `   来源：${item.siteName}\n\n`;
      });
    }

    if (stock.analysis.length > 0) {
      text += `### 技术面分析\n`;
      stock.analysis.forEach((item, idx) => {
        text += `${idx + 1}. ${item.title}\n`;
        if (item.summary) {
          text += `   摘要：${item.summary}\n`;
        }
        text += `   来源：${item.siteName}\n\n`;
      });
    }

    text += "\n";
  });

  // 第三轮：深度技术分析（如果有）
  if (result.round3 && result.round3.technicalAnalysis && result.round3.technicalAnalysis.length > 0) {
    text += "【第三轮搜索：深度技术分析】\n\n";

    result.round3.technicalAnalysis.forEach(stock => {
      text += `## ${stock.stockName} (${stock.stockCode})\n`;

      // 支撑位
      if (stock.supportLevels.length > 0) {
        text += `### 支撑位分析\n`;
        stock.supportLevels.forEach((item, idx) => {
          text += `${idx + 1}. ${item.title}\n`;
          if (item.content) {
            text += `   内容：${item.content}\n`;
          }
          text += `   来源：${item.siteName}\n\n`;
        });
      }

      // 阻力位
      if (stock.resistanceLevels.length > 0) {
        text += `### 阻力位分析\n`;
        stock.resistanceLevels.forEach((item, idx) => {
          text += `${idx + 1}. ${item.title}\n`;
          if (item.content) {
            text += `   内容：${item.content}\n`;
          }
          text += `   来源：${item.siteName}\n\n`;
        });
      }

      // 技术指标
      if (stock.technicalIndicators.length > 0) {
        text += `### 技术指标分析\n`;
        stock.technicalIndicators.forEach((item, idx) => {
          text += `${idx + 1}. ${item.title}\n`;
          if (item.content) {
            text += `   内容：${item.content}\n`;
          }
          text += `   来源：${item.siteName}\n\n`;
        });
      }

      // K线形态
      if (stock.klinePattern.length > 0) {
        text += `### K线形态分析\n`;
        stock.klinePattern.forEach((item, idx) => {
          text += `${idx + 1}. ${item.title}\n`;
          if (item.content) {
            text += `   内容：${item.content}\n`;
          }
          text += `   来源：${item.siteName}\n\n`;
        });
      }

      // 机构目标价
      if (stock.analystTarget.length > 0) {
        text += `### 机构研报与目标价\n`;
        stock.analystTarget.forEach((item, idx) => {
          text += `${idx + 1}. ${item.title}\n`;
          if (item.content) {
            text += `   内容：${item.content}\n`;
          }
          text += `   来源：${item.siteName}\n\n`;
        });
      }

      text += "\n";
    });
  }

  return text;
}
