/**
 * 股票价格缓存模块
 * 解决 Search API 限流问题
 */

export interface CachedPrice {
  price: number;
  timestamp: number;
  source: 'real' | 'simulate' | 'manual';
}

// 全局价格缓存（5分钟有效期）
const priceCache = new Map<string, CachedPrice>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

// 是否处于限流状态
let isRateLimited = false;
let rateLimitResetTime = 0;

/**
 * 判断当前是否为交易日（排除周末）
 * 使用中国时区（UTC+8）进行判断
 * 
 * @returns {boolean} true表示是交易日
 */
export function isTradingDay(): boolean {
  // 获取中国时区的当前时间
  const chinaTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const day = chinaTime.getDay();
  return day !== 0 && day !== 6; // 排除周日和周六
}

/**
 * 判断当前是否为A股交易时间
 * 使用中国时区（UTC+8）进行判断，确保在不同服务器时区下都能正确判断
 * 
 * A股交易时间（中国时区）：
 * - 周一至周五
 * - 上午：9:30-11:30
 * - 下午：13:00-15:00
 * 
 * @returns {boolean} true表示在交易时间内
 */
export function isTradingTime(): boolean {
  if (!isTradingDay()) {
    return false;
  }

  // 获取中国时区的当前时间
  const chinaTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const hours = chinaTime.getHours();
  const minutes = chinaTime.getMinutes();
  const timeMinutes = hours * 60 + minutes;

  // 交易时间段（以分钟计算）
  const morningStart = 9 * 60 + 30;  // 9:30
  const morningEnd = 11 * 60 + 30;    // 11:30
  const afternoonStart = 13 * 60;     // 13:00
  const afternoonEnd = 15 * 60;       // 15:00

  // 判断是否在交易时间内
  return (timeMinutes >= morningStart && timeMinutes < morningEnd) ||
         (timeMinutes >= afternoonStart && timeMinutes < afternoonEnd);
}

/**
 * 获取缓存有效期（根据交易时间动态调整）
 * - 交易时间内（9:30-11:30, 13:00-15:00）：30秒，实时性要求高
 * - 非交易时间：24小时，收盘价稳定，可以长期缓存
 */
export function getCacheTTL(): number {
  return isTradingTime() ? 30 * 1000 : 24 * 60 * 60 * 1000;
}

/**
 * 获取缓存有效期描述（用于调试）
 */
export function getCacheTTLDesc(): string {
  return isTradingTime() ? "30秒（交易时间）" : "24小时（非交易时间）";
}

/**
 * 从缓存获取价格
 */
export function getCachedPrice(stockCode: string): number | null {
  const cached = priceCache.get(stockCode);
  if (!cached) return null;

  const ttl = getCacheTTL();
  const isExpired = Date.now() - cached.timestamp > ttl;
  if (isExpired) {
    priceCache.delete(stockCode);
    return null;
  }

  return cached.price;
}

/**
 * 设置缓存价格
 */
export function setCachedPrice(
  stockCode: string,
  price: number,
  source: 'real' | 'simulate' | 'manual' = 'real'
): void {
  priceCache.set(stockCode, {
    price,
    timestamp: Date.now(),
    source,
  });
}

/**
 * 获取价格来源信息
 */
export function getPriceSource(stockCode: string): 'real' | 'simulate' | 'manual' | null {
  const cached = priceCache.get(stockCode);
  return cached?.source || null;
}

/**
 * 检查缓存是否过期
 */
export function isCacheExpired(stockCode: string): boolean {
  const cached = priceCache.get(stockCode);
  if (!cached) return true;

  return Date.now() - cached.timestamp > CACHE_TTL;
}

/**
 * 设置限流状态
 */
export function setRateLimited(resetTime?: number): void {
  isRateLimited = true;
  rateLimitResetTime = resetTime || Date.now() + 60 * 1000; // 默认1分钟后恢复
}

/**
 * 检查是否限流
 */
export function checkRateLimited(): boolean {
  if (!isRateLimited) return false;

  // 如果限流时间已过，重置状态
  if (Date.now() > rateLimitResetTime) {
    isRateLimited = false;
    return false;
  }

  return true;
}

/**
 * 获取限流恢复时间（秒）
 */
export function getRateLimitResetSeconds(): number {
  if (!isRateLimited) return 0;
  return Math.max(0, Math.ceil((rateLimitResetTime - Date.now()) / 1000));
}

/**
 * 清空所有缓存
 */
export function clearAllCache(): void {
  priceCache.clear();
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ code: string; price: number; age: number; source: string }>;
} {
  const entries = Array.from(priceCache.entries()).map(([code, data]) => ({
    code,
    price: data.price,
    age: Math.floor((Date.now() - data.timestamp) / 1000),
    source: data.source,
  }));

  return {
    size: priceCache.size,
    entries,
  };
}
