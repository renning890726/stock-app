import { getDb } from "coze-coding-dev-sdk";
import { stockHighPrices } from "./shared/schema";
import { eq, and, gte } from "drizzle-orm";
import * as schema from "./shared/schema";

/**
 * 股票历史最高价管理器
 */
export const stockHighPriceManager = {
  /**
   * 清空所有历史最高价记录（用于解决部署时的唯一约束冲突）
   * 注意：这会删除所有历史数据
   */
  async clearAllStockHighPrices() {
    const db = await getDb(schema);
    await db.delete(stockHighPrices);
    console.log("已清空所有股票历史最高价记录");
  },

  async getStockHighPrice(stockCode: string) {
    const db = await getDb(schema);
    const records = await db
      .select()
      .from(stockHighPrices)
      .where(eq(stockHighPrices.stockCode, stockCode))
      .limit(1);

    return records[0] || null;
  },

  async upsertStockHighPrice(data: {
    stockCode: string;
    stockName: string;
    highPrice: number;
    highDate: Date;
  }) {
    const db = await getDb(schema);

    // 使用 ON CONFLICT DO UPDATE 语法，原子性地处理插入或更新
    // 避免并发插入导致的唯一约束冲突
    const result = await db
      .insert(stockHighPrices)
      .values({
        stockCode: data.stockCode,
        stockName: data.stockName,
        highPrice: String(data.highPrice),
        highDate: data.highDate,
      })
      .onConflictDoUpdate({
        target: stockHighPrices.stockCode,
        set: {
          stockName: data.stockName,
          highPrice: String(data.highPrice),
          highDate: data.highDate,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  },

  async updateLastAlertDate(stockCode: string) {
    const db = await getDb(schema);
    await db
      .update(stockHighPrices)
      .set({
        lastAlertDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stockHighPrices.stockCode, stockCode));
  },

  async hasAlertedToday(stockCode: string): Promise<boolean> {
    const record = await this.getStockHighPrice(stockCode);
    if (!record || !record.lastAlertDate) {
      return false;
    }

    const today = new Date();
    const lastAlertDate = new Date(record.lastAlertDate);

    // 检查是否是同一天
    return (
      today.getFullYear() === lastAlertDate.getFullYear() &&
      today.getMonth() === lastAlertDate.getMonth() &&
      today.getDate() === lastAlertDate.getDate()
    );
  },

  async isThreeMonthHigh(stockCode: string, currentPrice: number): Promise<boolean> {
    const record = await this.getStockHighPrice(stockCode);

    if (!record) {
      // 如果没有历史记录，认为是新高
      return true;
    }

    // 检查当前价格是否超过历史最高价
    return currentPrice > Number(record.highPrice);
  },

  async getAllStockHighPrices() {
    const db = await getDb(schema);
    return await db.select().from(stockHighPrices);
  },

  async deleteStockHighPrice(stockCode: string) {
    const db = await getDb(schema);
    await db
      .delete(stockHighPrices)
      .where(eq(stockHighPrices.stockCode, stockCode));
  },
};
