/**
 * 增强版股票价格获取模块
 * 集成 AkShare（Python FastAPI）作为主要数据源，支持降级到新浪财经API、东方财富API
 */

import { SearchClient, APIError } from 'coze-coding-dev-sdk';
import {
  getCachedPrice,
  setCachedPrice,
  setRateLimited,
  checkRateLimited,
  getRateLimitResetSeconds,
  getCacheTTL,
  getCacheTTLDesc,
  isTradingTime,
} from './price-cache';
import {
  getStockPriceFromAkshare,
  getBatchPricesFromAkshare,
  type AkshareStockPrice,
} from './stock-price-akshare';

/**
 * 股价数据接口
 */
export interface StockPriceData {
  currentPrice: number;
  openPrice?: number;
  preClosePrice?: number;
  changePercent?: number;
  peRatio?: number;
  source: 'sina' | 'eastmoney' | 'search' | 'cached' | 'cost' | 'simulate' | 'error' | 'akshare';
  timestamp: number;
  error?: string;
}

let searchClient: SearchClient | null = null;

/**
 * 初始化 Search Client
 */
function getSearchClient(): SearchClient {
  if (!searchClient) {
    searchClient = new SearchClient();
  }
  return searchClient;
}

/**
 * 从新浪财经获取股价
 * API格式：http://hq.sinajs.cn/list=sh600000
 * 返回：var hq_str_sh600000="平安银行,9.88,9.90,9.89,10.00,10.10,10.05,9.88,10.15,54321000,5432100000,0.00,0,0,54321000,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2026-02-10,15:00:00,00"
 *
 * 数据字段索引：
 * 0: 股票名称
 * 1: 开盘价
 * 2: 昨收价
 * 3: 现价（当前价）
 * 4: 最高价
 * 5: 最低价
 * 6: 买一价
 * 7: 卖一价
 * 8: 成交量（股）
 * 9: 成交额（元）
 */
async function getPriceFromSina(stockCode: string): Promise<Partial<StockPriceData>> {
  try {
    // 转换为新浪格式：沪市sh，深市sz
    // 优先级：6开头=sh，其他=sz（但以5开头的ETF可能是sh，需要尝试）
    const prefix = stockCode.startsWith('6') ? 'sh' : 'sz';
    const url = `http://hq.sinajs.cn/list=${prefix}${stockCode}`;

    // 方案二：添加完整的浏览器请求头以绕过反爬虫
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
      'Referer': 'http://finance.sina.com.cn/',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
    };

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(5000), // 5秒超时
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();

    // 解析数据
    const match = text.match(/"([^"]+)"/);
    if (!match || !match[1]) {
      console.warn(`[Sina API] No data found for ${stockCode}`);
      return {};
    }

    const parts = match[1].split(',');
    if (parts.length < 30) {
      console.warn(`[Sina API] Invalid data format for ${stockCode}`);
      return {};
    }

    const currentPrice = parseFloat(parts[3]);
    const openPrice = parseFloat(parts[1]);
    const preClosePrice = parseFloat(parts[2]);

    // 验证价格是否有效
    // 检查：当前价、开盘价、昨收价都必须大于0
    if (isNaN(currentPrice) || currentPrice <= 0 || 
        isNaN(openPrice) || openPrice <= 0 ||
        isNaN(preClosePrice) || preClosePrice <= 0) {
      console.log(`[Sina API] ${stockCode} - Invalid price data, trying alternative prefix...`);
      
      // 如果是第一次尝试失败，尝试另一个前缀
      const altPrefix = prefix === 'sh' ? 'sz' : 'sh';
      const altUrl = `http://hq.sinajs.cn/list=${altPrefix}${stockCode}`;
      
      try {
        const altResponse = await fetch(altUrl, {
          headers,
          signal: AbortSignal.timeout(5000),
        });
        
        if (altResponse.ok) {
          const altText = await altResponse.text();
          const altMatch = altText.match(/"([^"]+)"/);
          if (altMatch && altMatch[1]) {
            const altParts = altMatch[1].split(',');
            if (altParts.length >= 30) {
              const altCurrentPrice = parseFloat(altParts[3]);
              const altOpenPrice = parseFloat(altParts[1]);
              const altPreClosePrice = parseFloat(altParts[2]);
              
              if (!isNaN(altCurrentPrice) && altCurrentPrice > 0) {
                const altChangePercent = altPreClosePrice > 0
                  ? ((altCurrentPrice - altPreClosePrice) / altPreClosePrice) * 100
                  : 0;
                
                return {
                  currentPrice: altCurrentPrice,
                  openPrice: altOpenPrice,
                  preClosePrice: altPreClosePrice,
                  changePercent: altChangePercent,
                  source: 'sina',
                  timestamp: Date.now(),
                };
              }
            }
          }
        }
      } catch (altError) {
        console.error(`[Sina API] ${stockCode} - Alternative prefix failed:`, altError);
      }
      
      return {};
    }

    // 计算涨跌幅
    const changePercent = preClosePrice > 0
      ? ((currentPrice - preClosePrice) / preClosePrice) * 100
      : 0;

    return {
      currentPrice,
      openPrice,
      preClosePrice,
      changePercent,
      source: 'sina',
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`[Sina API] Error fetching ${stockCode}:`, error);
    return {};
  }
}

/**
 * 从东方财富获取股价
 * API格式：http://push2.eastmoney.com/api/qt/stock/get?secid=1.600000
 * 市场代码：0=深市，1=沪市
 *
 * 返回数据字段（需要除以100）：
 * f43: 现价
 * f46: 开盘价
 * f60: 昨收价
 * f170: 涨跌幅
 * f47: 成交量
 * f48: 成交额
 */
async function getPriceFromEastmoney(stockCode: string): Promise<Partial<StockPriceData>> {
  try {
    // 市场代码：沪市=1，深市=0
    const marketId = stockCode.startsWith('6') ? '1' : '0';
    const url = `http://push2.eastmoney.com/api/qt/stock/get?secid=${marketId}.${stockCode}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5秒超时
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !data.data.f43) {
      console.warn(`[Eastmoney API] Invalid data for ${stockCode}`);
      return {};
    }

    const currentPrice = data.data.f43 / 100;
    const openPrice = data.data.f46 / 100;
    const preClosePrice = data.data.f60 / 100;
    const changePercent = data.data.f170;

    // 验证价格是否有效
    if (isNaN(currentPrice) || currentPrice <= 0) {
      return {};
    }

    return {
      currentPrice,
      openPrice,
      preClosePrice,
      changePercent,
      source: 'eastmoney',
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`[Eastmoney API] Error fetching ${stockCode}:`, error);
    return {};
  }
}

/**
 * 从Search API获取股价（降级方案）
 */
async function getPriceFromSearch(
  stockCode: string,
  stockName: string
): Promise<Partial<StockPriceData>> {
  try {
    const client = getSearchClient();

    // 构建查询关键词：优先使用新浪财经等权威网站
    const searchQuery = `${stockName} ${stockCode} 股票实时价格 site:finance.sina.com.cn OR site:quote.eastmoney.com`;

    console.log(`[getPriceFromSearch] Fetching price for ${stockCode} (${stockName})...`);

    const response = await client.webSearch(searchQuery, 3, false);

    // 检查响应
    if (!response.web_items || response.web_items.length === 0) {
      console.warn(`[getPriceFromSearch] No search results for ${stockCode}`);
      return {};
    }

    // 提取价格
    const price = extractPriceFromSearch(response.web_items);
    if (price !== null) {
      console.log(`[getPriceFromSearch] Successfully fetched price for ${stockCode}: ${price}`);
      return {
        currentPrice: price,
        source: 'search',
        timestamp: Date.now(),
      };
    }

    console.warn(`[getPriceFromSearch] Cannot extract price from search results for ${stockCode}`);
    return {};
  } catch (error) {
    // 处理 APIError 异常
    if (error instanceof APIError) {
      console.error(`[getPriceFromSearch] API error for ${stockCode}:`, error.message);

      // 处理限流错误
      if (error.statusCode === 429) {
        setRateLimited(Date.now() + 60 * 1000); // 设置1分钟限流
      }

      return {};
    }

    // 其他未知错误
    console.error(`[getPriceFromSearch] Unexpected error for ${stockCode}:`, error);
    return {};
  }
}

/**
 * 从搜索结果中提取股价
 */
function extractPriceFromSearch(webItems: any[]): number | null {
  if (!webItems || webItems.length === 0) return null;

  // 合并所有片段
  const allText = webItems
    .map((item: any) => item.snippet || "")
    .join(" ");

  // 先尝试提取明确标记为"当前价"、"最新价"、"现价"的价格
  const currentPricePatterns = [
    /(?:当前价|最新价|现价|最新)[：:]\s*(\d{1,5}[.,]\d{2})/,
    /(?:当前价|最新价|现价)\s*(\d{1,5}[.,]\d{2})/,
  ];

  for (const pattern of currentPricePatterns) {
    const match = allText.match(pattern);
    if (match) {
      const price = parseFloat(match[1].replace(",", "."));
      if (price > 0.01 && price < 9999.99) {
        console.log(`[extractPriceFromSearch] Found explicitly marked current price: ${price}`);
        return price;
      }
    }
  }

  // 如果没有找到明确标记的价格，提取所有价格
  const pricePattern = /(\d{1,5}[.,]\d{2})/g;
  const matches = allText.match(pricePattern);

  if (!matches || matches.length === 0) return null;

  // 转换并过滤价格
  const prices = matches
    .map((match) => parseFloat(match.replace(",", ".")))
    .filter((price) => price > 0.01 && price < 9999.99);

  if (prices.length === 0) return null;

  // 统计每个价格出现的次数，选择出现次数最多的（很可能是当前价）
  const priceCounts = new Map<number, number>();
  prices.forEach(price => {
    priceCounts.set(price, (priceCounts.get(price) || 0) + 1);
  });

  // 找出出现次数最多的价格
  let maxCount = 0;
  let mostFrequentPrice = prices[0];
  priceCounts.forEach((count, price) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentPrice = price;
    }
  });

  console.log(`[extractPriceFromSearch] Extracted ${prices.length} prices, most frequent: ${mostFrequentPrice} (count: ${maxCount})`);
  return mostFrequentPrice;
}

/**
 * 从搜索结果中提取 PE（市盈率）
 */
function extractPERatioFromSearch(webItems: any[]): number | null {
  if (!webItems || webItems.length === 0) return null;

  // 合并所有片段
  const allText = webItems
    .map((item: any) => item.snippet || "")
    .join(" ");

  // 查找 PE 比率格式：PE: xxx 或 市盈率: xxx 或 动态市盈率: xxx
  const pePatterns = [
    /(?:PE|pe|市盈率|动态市盈率)\s*[:：]\s*(\d+\.?\d*)/,
    /市盈率\s*(\d+\.?\d*)/,
    /PE\s*(\d+\.?\d*)/,
  ];

  for (const pattern of pePatterns) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      const pe = parseFloat(match[1]);
      if (!isNaN(pe) && pe > 0 && pe < 1000) { // PE 通常在 0-1000 之间
        console.log(`[extractPERatio] Found PE: ${pe}`);
        return pe;
      }
    }
  }

  return null;
}

/**
 * 从搜索 API 获取 PE 比率
 */
async function getPERatioFromSearch(stockCode: string, stockName: string): Promise<number | null> {
  try {
    const client = getSearchClient();
    const query = `${stockName} ${stockCode} 市盈率 PE 动态市盈率 实时`;
    
    const response = await client.webSearch(query, 3, true);
    
    if (response.web_items && response.web_items.length > 0) {
      return extractPERatioFromSearch(response.web_items);
    }
    
    return null;
  } catch (error) {
    console.error(`[getPERatioFromSearch] Failed for ${stockCode}:`, error);
    return null;
  }
}

/**
 * 补充 PE 数据（如果为空）
 */
async function supplementPERatio(
  stockCode: string,
  stockName: string,
  peRatio?: number
): Promise<number | undefined> {
  // 如果已经有 PE 数据，直接返回
  if (peRatio !== undefined && peRatio > 0) {
    return peRatio;
  }

  // 否则尝试从搜索 API 获取
  console.log(`[supplementPERatio] Trying to get PE from search for ${stockCode}...`);
  const peFromSearch = await getPERatioFromSearch(stockCode, stockName);
  return peFromSearch !== null ? peFromSearch : undefined;
}

/**
 * 验证价格是否合理
 */
function validatePrice(
  price: number,
  costPrice: number,
  allowLargeChange: boolean = false
): boolean {
  // 1. 价格必须大于0
  if (price <= 0) return false;

  // 2. 价格合理性检测（基于A股实际情况）
  // A股股价范围通常在 0.01元 到 1000元 之间
  // 超过这个范围的数据可能是错误的
  if (price < 0.01 || price > 1000) {
    console.warn(`[validatePrice] Price out of reasonable range: ${price}`);
    return false;
  }

  // 3. 不限制相对于成本价的涨幅
  // 成本价是用户的持仓成本，可能持有多天、多月、多年
  // 长期持有翻几倍是完全正常的，所以不应该限制涨幅
  // 只做基本的合理性验证即可

  return true;
}

/**
 * 获取股票价格（混合查询策略）
 *
 * 优先级：
 * 1. 缓存（未过期）
 * 2. 新浪财经API
 * 3. 东方财富API
 * 4. Search API
 * 5. 缓存（即使过期）
 * 6. 成本价
 *
 * @param stockCode 股票代码
 * @param stockName 股票名称
 * @param costPrice 成本价
 * @param simulate 是否使用演示模式
 * @returns 股价数据
 */
export async function getStockPriceEnhanced(
  stockCode: string,
  stockName: string,
  costPrice: number,
  simulate: boolean = false
): Promise<StockPriceData> {
  // 1. 演示模式
  if (simulate) {
    const simulatedPrice = Number(costPrice) * (1 + (Math.random() - 0.3) * 0.2);
    const roundedPrice = Math.round(simulatedPrice * 100) / 100;
    setCachedPrice(stockCode, roundedPrice);
    return {
      currentPrice: roundedPrice,
      source: 'simulate',
      timestamp: Date.now(),
    };
  }

  // 2. 检查限流状态
  if (checkRateLimited()) {
    const resetSeconds = getRateLimitResetSeconds();
    const cached = getCachedPrice(stockCode);

    if (cached !== null) {
      console.log(`[getStockPriceEnhanced] Rate limited, using cached price for ${stockCode}`);
      return {
        currentPrice: cached,
        source: 'cached',
        timestamp: Date.now(),
      };
    }

    return {
      currentPrice: costPrice,
      source: 'error',
      timestamp: Date.now(),
      error: `API限流中，预计${resetSeconds}秒后恢复`,
    };
  }

  // 3. 检查缓存
  // 非交易时间缓存时间为24小时，交易时间为30秒
  // 所以不需要特殊的交易时间判断，直接使用缓存即可
  const cached = getCachedPrice(stockCode);
  const ttl = getCacheTTL();

  if (cached !== null) {
    console.log(`[getStockPriceEnhanced] Cache hit for ${stockCode}, TTL: ${ttl / 1000}s`);
    return {
      currentPrice: cached,
      source: 'cached',
      timestamp: Date.now(),
    };
  }

  // 4. 优先使用 Akshare（新增）
  console.log(`[getStockPriceEnhanced] Trying Akshare API for ${stockCode}...`);
  const aksharePrice = await getStockPriceFromAkshare(stockCode, stockName);
  if (aksharePrice && validatePrice(aksharePrice.currentPrice, costPrice)) {
    setCachedPrice(stockCode, aksharePrice.currentPrice);
    console.log(`[getStockPriceEnhanced] Akshare API success for ${stockCode}: ${aksharePrice.currentPrice}`);
    const peRatio = await supplementPERatio(stockCode, stockName, aksharePrice.peRatio);
    return {
      currentPrice: aksharePrice.currentPrice,
      openPrice: aksharePrice.openPrice,
      preClosePrice: aksharePrice.preClosePrice,
      changePercent: aksharePrice.changePercent,
      peRatio,
      source: 'akshare',
      timestamp: Date.now(),
    };
  } else {
    console.log(`[getStockPriceEnhanced] Akshare API failed for ${stockCode}`);
  }
  let sinaPrice = await getPriceFromSina(stockCode);
  if (sinaPrice.currentPrice && validatePrice(sinaPrice.currentPrice, costPrice)) {
    setCachedPrice(stockCode, sinaPrice.currentPrice);
    console.log(`[getStockPriceEnhanced] Sina API success for ${stockCode}: ${sinaPrice.currentPrice}`);
    const peRatio = await supplementPERatio(stockCode, stockName, sinaPrice.peRatio);
    return {
      ...sinaPrice,
      peRatio,
      source: 'sina',
    } as StockPriceData;
  }

  // 5. 尝试东方财富API
  console.log(`[getStockPriceEnhanced] Trying Eastmoney API for ${stockCode}...`);
  let eastmoneyPrice = await getPriceFromEastmoney(stockCode);
  if (eastmoneyPrice.currentPrice && validatePrice(eastmoneyPrice.currentPrice, costPrice)) {
    setCachedPrice(stockCode, eastmoneyPrice.currentPrice);
    console.log(`[getStockPriceEnhanced] Eastmoney API success for ${stockCode}: ${eastmoneyPrice.currentPrice}`);
    const peRatio = await supplementPERatio(stockCode, stockName, eastmoneyPrice.peRatio);
    return {
      ...eastmoneyPrice,
      peRatio,
      source: 'eastmoney',
    } as StockPriceData;
  }

  // 6. 降级到Search API
  console.log(`[getStockPriceEnhanced] Falling back to Search API for ${stockCode}...`);
  let searchPrice = await getPriceFromSearch(stockCode, stockName);
  if (searchPrice.currentPrice && validatePrice(searchPrice.currentPrice, costPrice)) {
    setCachedPrice(stockCode, searchPrice.currentPrice);
    console.log(`[getStockPriceEnhanced] Search API success for ${stockCode}: ${searchPrice.currentPrice}`);
    const peRatio = await supplementPERatio(stockCode, stockName, searchPrice.peRatio);
    return {
      ...searchPrice,
      peRatio,
      source: 'search',
    } as StockPriceData;
  }

  // 7. 使用过期的缓存
  if (cached !== null) {
    console.warn(`[getStockPriceEnhanced] Using expired cache for ${stockCode}: ${cached}`);
    return {
      currentPrice: cached,
      source: 'cached',
      timestamp: Date.now(),
    };
  }

  // 8. 所有数据源都失败，返回 0 并标记为错误
  console.error(`[getStockPriceEnhanced] All data sources failed for ${stockCode}`);
  return {
    currentPrice: 0,
    source: 'error',
    timestamp: Date.now(),
    error: '所有数据源均获取失败',
  };
}

/**
 * 批量获取股价（并发查询）
 *
 * @param holdings 持仓列表
 * @param simulate 是否使用演示模式
 * @returns 股价数据Map
 */
export async function getStockPricesBatch(
  holdings: Array<{
    stockCode: string;
    stockName: string;
    costPrice: number;
  }>,
  simulate: boolean = false
): Promise<Map<string, StockPriceData>> {
  // 1. 演示模式
  if (simulate) {
    const results = new Map<string, StockPriceData>();
    for (const holding of holdings) {
      const simulatedPrice = Number(holding.costPrice) * (1 + (Math.random() - 0.3) * 0.2);
      results.set(holding.stockCode, {
        currentPrice: Math.round(simulatedPrice * 100) / 100,
        source: 'simulate',
        timestamp: Date.now(),
      });
    }
    return results;
  }

  // 2. 优先使用 Akshare 批量查询
  console.log(`[getStockPricesBatch] Trying Akshare batch API for ${holdings.length} stocks...`);
  const akshareResults = await getBatchPricesFromAkshare(
    holdings.map(h => h.stockCode)
  );

  if (akshareResults.size > 0) {
    const results = new Map<string, StockPriceData>();

    for (const holding of holdings) {
      const akshareData = akshareResults.get(holding.stockCode);
      if (akshareData && validatePrice(akshareData.currentPrice, holding.costPrice)) {
        setCachedPrice(holding.stockCode, akshareData.currentPrice);
        results.set(holding.stockCode, {
          currentPrice: akshareData.currentPrice,
          openPrice: akshareData.openPrice,
          preClosePrice: akshareData.preClosePrice,
          changePercent: akshareData.changePercent,
          source: 'akshare',
          timestamp: Date.now(),
        });
      } else {
        // Akshare 失败，降级到其他方案
        console.log(`[getStockPricesBatch] Akshare failed for ${holding.stockCode}, trying fallback...`);
        const fallbackResult = await getStockPriceEnhanced(
          holding.stockCode,
          holding.stockName,
          holding.costPrice,
          false
        );
        results.set(holding.stockCode, fallbackResult);
      }
    }

    console.log(`[getStockPricesBatch] Successfully fetched ${results.size}/${holdings.length} stocks via Akshare`);
    return results;
  }

  // 3. Akshare 失败，降级到逐个查询
  console.log(`[getStockPricesBatch] Akshare batch failed, falling back to individual queries...`);
  const results = new Map<string, StockPriceData>();

  const promises = holdings.map(async (holding) => {
    const result = await getStockPriceEnhanced(
      holding.stockCode,
      holding.stockName,
      holding.costPrice,
      false
    );
    return { stockCode: holding.stockCode, data: result };
  });

  const settledResults = await Promise.allSettled(promises);

  settledResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { stockCode, data } = result.value;
      results.set(stockCode, data);
    }
  });

  return results;
}

// 导出缓存相关的函数（用于外部访问）
export { getCachedPrice, setCachedPrice, getCacheTTL, getCacheTTLDesc, getPriceFromSearch };

// 全局价格缓存（用于访问缓存统计）
const priceCache = new Map<string, { price: number; timestamp: number; source: string }>();
