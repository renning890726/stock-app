/**
 * AkShare 股票数据服务调用模块
 * 用于与 Python FastAPI 服务通信
 */

/**
 * AkShare 股价数据接口
 */
export interface AkshareStockPrice {
  code: string;
  name: string;
  currentPrice: number;
  openPrice: number;
  preClosePrice: number;
  changePercent: number;
  changeAmount: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  amount: number;
  turnoverRate: number;
  peRatio: number;
  pbRatio: number;
  source: string;
  timestamp: string;
}

/**
 * 市场指数接口
 */
export interface MarketIndex {
  "指数代码": string;
  "指数名称": string;
  "最新点位": number;
  "涨跌幅": number;
  "涨跌额": number;
  "成交量": number;
  "成交额": number;
}

/**
 * 市场概要接口
 */
export interface MarketSummary {
  totalStocks: number;
  upCount: number;
  downCount: number;
  flatCount: number;
  totalAmount: number;
  marketSentiment: "bullish" | "bearish" | "neutral";
  timestamp: string;
}

// AkShare API 地址
const AKSHARE_API_URL = process.env.AKSHARE_API_URL || 'http://localhost:9001';

/**
 * 获取股票实时价格
 *
 * @param stockCode 股票代码
 * @param stockName 股票名称（可选）
 * @returns 股价数据或 null
 */
export async function getStockPriceFromAkshare(
  stockCode: string,
  stockName?: string
): Promise<AkshareStockPrice | null> {
  try {
    const params = new URLSearchParams({
      stock_code: stockCode,
      ...(stockName && { stock_name: stockName }),
    });

    const response = await fetch(
      `${AKSHARE_API_URL}/api/stock/realtime?${params.toString()}`,
      {
        signal: AbortSignal.timeout(5000), // 5秒超时
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Akshare API] Stock not found: ${stockCode}`);
        return null;
      }
      console.error(`[Akshare API] Error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Akshare API] Timeout for ${stockCode}`);
    } else {
      console.error(`[Akshare API] Exception for ${stockCode}:`, error);
    }
    return null;
  }
}

/**
 * 批量获取股票价格
 *
 * @param stockCodes 股票代码数组
 * @returns 股价数据 Map
 */
export async function getBatchPricesFromAkshare(
  stockCodes: string[]
): Promise<Map<string, AkshareStockPrice>> {
  try {
    if (stockCodes.length === 0) {
      return new Map();
    }

    const codesParam = stockCodes.join(',');
    const response = await fetch(
      `${AKSHARE_API_URL}/api/stock/batch?stock_codes=${encodeURIComponent(codesParam)}`,
      {
        signal: AbortSignal.timeout(10000), // 10秒超时
      }
    );

    if (!response.ok) {
      console.error(`[Akshare API] Batch error: ${response.status}`);
      return new Map();
    }

    const data = await response.json();

    if (!data.results) {
      console.warn('[Akshare API] No results in batch response');
      return new Map();
    }

    const results = new Map<string, AkshareStockPrice>();
    for (const [code, price] of Object.entries(data.results)) {
      results.set(code, price as AkshareStockPrice);
    }

    console.log(`[Akshare API] Batch fetched ${results.size}/${stockCodes.length} stocks`);
    return results;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Akshare API] Batch timeout');
    } else {
      console.error('[Akshare API] Batch exception:', error);
    }
    return new Map();
  }
}

/**
 * 获取市场指数
 *
 * @returns 市场指数数据
 */
export async function getMarketIndexFromAkshare(): Promise<{
  indices: MarketIndex[];
  count: number;
  timestamp: string;
} | null> {
  try {
    const response = await fetch(
      `${AKSHARE_API_URL}/api/market/index`,
      {
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.error(`[Akshare API] Market index error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Akshare API] Market index exception:', error);
    return null;
  }
}

/**
 * 获取市场概要
 *
 * @returns 市场概要数据
 */
export async function getMarketSummaryFromAkshare(): Promise<MarketSummary | null> {
  try {
    const response = await fetch(
      `${AKSHARE_API_URL}/api/market/summary`,
      {
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.error(`[Akshare API] Market summary error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Akshare API] Market summary exception:', error);
    return null;
  }
}

/**
 * 检查 AkShare 服务是否可用
 *
 * @returns 服务是否可用
 */
export async function checkAkshareService(): Promise<boolean> {
  try {
    const response = await fetch(
      `${AKSHARE_API_URL}/health`,
      {
        signal: AbortSignal.timeout(3000),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('[Akshare API] Health check failed:', error);
    return false;
  }
}

/**
 * 获取股票历史数据
 *
 * @param symbol 股票代码
 * @param period 周期（daily/weekly/monthly）
 * @param startDate 开始日期（格式：20250101）
 * @param endDate 结束日期（格式：20260101）
 * @param adjust 复权方式（""/qfq/hfq）
 * @returns 历史数据
 */
export async function getStockHistoryFromAkshare(
  symbol: string,
  period: string = 'daily',
  startDate: string,
  endDate: string,
  adjust: string = ''
): Promise<{
  data: any[];
  count: number;
} | null> {
  try {
    const params = new URLSearchParams({
      symbol,
      period,
      start_date: startDate,
      end_date: endDate,
      adjust,
    });

    const response = await fetch(
      `${AKSHARE_API_URL}/api/stock/history?${params.toString()}`,
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.error(`[Akshare API] History error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Akshare API] History exception:', error);
    return null;
  }
}

/**
 * 获取 K 线数据（用于技术分析）
 * 获取最近 N 天的 K 线数据
 *
 * @param stockCode 股票代码
 * @param days 天数（默认 30 天）
 * @returns K 线数据
 */
export async function getKLineDataFromAkshare(
  stockCode: string,
  days: number = 30
): Promise<{
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    amount: number;
  }>;
  count: number;
} | null> {
  try {
    // 计算结束日期（今天）
    const endDate = new Date();
    const endDateStr = endDate.getFullYear().toString() +
                       (endDate.getMonth() + 1).toString().padStart(2, '0') +
                       endDate.getDate().toString().padStart(2, '0');

    // 计算开始日期（N 天前）
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.getFullYear().toString() +
                         (startDate.getMonth() + 1).toString().padStart(2, '0') +
                         startDate.getDate().toString().padStart(2, '0');

    // 转换股票代码格式（添加交易所前缀）
    const symbol = stockCode.startsWith('6') ? `sh${stockCode}` : `sz${stockCode}`;

    const response = await fetch(
      `${AKSHARE_API_URL}/api/stock/kline?symbol=${symbol}&start_date=${startDateStr}&end_date=${endDateStr}`,
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.error(`[Akshare API] K-line error for ${stockCode}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data || !data.data || data.data.length === 0) {
      console.warn(`[Akshare API] No K-line data for ${stockCode}`);
      return null;
    }

    // 格式化数据
    const klineData = data.data.slice(-days).map((item: any) => ({
      date: item.日期 || item.date,
      open: item.开盘 || item.open,
      high: item.最高 || item.high,
      low: item.最低 || item.low,
      close: item.收盘 || item.close,
      volume: item.成交量 || item.volume,
      amount: item.成交额 || item.amount,
    }));

    return {
      data: klineData,
      count: klineData.length,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Akshare API] K-line timeout for ${stockCode}`);
    } else {
      console.error(`[Akshare API] K-line exception for ${stockCode}:`, error);
    }
    return null;
  }
}
