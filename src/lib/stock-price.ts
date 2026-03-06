/**
 * 统一的股票价格获取函数
 * 处理 Search API 限流和缓存
 */

import { SearchClient, APIError } from 'coze-coding-dev-sdk';
import {
  getCachedPrice,
  setCachedPrice,
  setRateLimited,
  checkRateLimited,
  getRateLimitResetSeconds,
  getPriceSource,
  isCacheExpired,
} from './price-cache';

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
 * 从搜索结果中提取股价
 */
function extractPriceFromSearch(snippets: string[]): number | null {
  if (!snippets || snippets.length === 0) return null;

  // 常见的股价格式：xxx.xx 或 xxx,xxx
  const pricePattern = /(\d{1,5}[.,]\d{2})/g;

  for (const snippet of snippets) {
    const matches = snippet.match(pricePattern);
    if (matches && matches.length > 0) {
      // 转换小数点格式
      const price = parseFloat(matches[0].replace(',', '.'));
      // 过滤掉明显不是股价的数字（如 0.01、9999.99）
      if (price > 0.01 && price < 9999.99) {
        return price;
      }
    }
  }

  return null;
}

/**
 * 获取股票实时价格
 *
 * @param stockCode 股票代码
 * @param stockName 股票名称
 * @param simulate 是否使用演示模式
 * @returns 价格及来源信息
 */
export async function getStockPrice(
  stockCode: string,
  stockName: string = '',
  simulate: boolean = false
): Promise<{
  price: number;
  source: 'real' | 'cached' | 'simulate' | 'cost' | 'error';
  error?: string;
}> {
  // 1. 演示模式
  if (simulate) {
    const simulatedPrice = Math.random() * 10 + 1; // 1-11 之间的随机价格
    setCachedPrice(stockCode, simulatedPrice, 'simulate');
    return {
      price: simulatedPrice,
      source: 'simulate',
    };
  }

  // 2. 检查限流状态
  if (checkRateLimited()) {
    const resetSeconds = getRateLimitResetSeconds();
    const cached = getCachedPrice(stockCode);

    if (cached !== null) {
      // 有限流但有缓存，返回缓存
      return {
        price: cached,
        source: 'cached',
      };
    }

    // 有限流且无缓存，返回错误
    return {
      price: 0,
      source: 'error',
      error: `API限流中，预计${resetSeconds}秒后恢复`,
    };
  }

  // 3. 检查缓存
  const cachedPrice = getCachedPrice(stockCode);
  if (cachedPrice !== null) {
    return {
      price: cachedPrice,
      source: 'cached',
    };
  }

  // 4. 调用 Search API
  try {
    const client = getSearchClient();

    // 构建查询关键词：优先使用新浪财经等权威网站
    const searchQuery = `${stockName} ${stockCode} 股票实时价格 site:finance.sina.com.cn OR site:quote.eastmoney.com`;

    console.log(`[getStockPrice] Fetching price for ${stockCode} (${stockName})...`);

    const response = await client.webSearch(searchQuery, 3, false);

    // 5. 检查响应
    if (!response.web_items || response.web_items.length === 0) {
      console.warn(`[getStockPrice] No search results for ${stockCode}`);
      return {
        price: 0,
        source: 'error',
        error: '无搜索结果',
      };
    }

    // 6. 提取价格
    const snippets = response.web_items.map((item: any) => item.snippet).join(' ');
    const price = extractPriceFromSearch([snippets]);

    if (price !== null) {
      // 保存到缓存
      setCachedPrice(stockCode, price, 'real');
      console.log(`[getStockPrice] Successfully fetched price for ${stockCode}: ${price}`);
      return {
        price,
        source: 'real',
      };
    }

    // 无法提取价格
    console.warn(`[getStockPrice] Cannot extract price from search results for ${stockCode}`);
    return {
      price: 0,
      source: 'error',
      error: '无法解析股价数据',
    };
  } catch (error) {
    // 处理 APIError 异常
    if (error instanceof APIError) {
      console.error(`[getStockPrice] API error for ${stockCode}:`, error.message);

      // 处理限流错误
      if (error.statusCode === 429) {
        setRateLimited(Date.now() + 60 * 1000); // 设置1分钟限流
        return {
          price: 0,
          source: 'error',
          error: 'API限流，请稍后重试',
        };
      }

      // 其他 API 错误
      return {
        price: 0,
        source: 'error',
        error: `API错误: ${error.message}`,
      };
    }

    // 其他未知错误
    console.error(`[getStockPrice] Unexpected error for ${stockCode}:`, error);
    return {
      price: 0,
      source: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 批量获取股价（带延迟，避免并发限流）
 *
 * @param holdings 持仓列表
 * @param simulate 是否使用演示模式
 * @param delay 每次请求的延迟（毫秒）
 */
export async function getStockPricesBatch(
  holdings: Array<{ stockCode: string; stockName: string }>,
  simulate: boolean = false,
  delay: number = 500
): Promise<Map<string, { price: number; source: string }>> {
  const results = new Map<string, { price: number; source: string }>();

  for (const holding of holdings) {
    const result = await getStockPrice(holding.stockCode, holding.stockName, simulate);
    results.set(holding.stockCode, {
      price: result.price,
      source: result.source,
    });

    // 延迟，避免并发请求导致限流
    if (delay > 0 && !simulate) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}

/**
 * 清空所有价格缓存
 */
export function clearPriceCache(): void {
  const { clearAllCache } = require('./price-cache');
  clearAllCache();
}
