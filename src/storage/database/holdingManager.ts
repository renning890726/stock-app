import { eq, desc, like } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { holdings, insertHoldingSchema, updateHoldingSchema } from "./shared/schema";
import type { Holding, InsertHolding, UpdateHolding } from "./shared/schema";
import * as schema from "./shared/schema";

export class HoldingManager {
  async createHolding(data: InsertHolding): Promise<Holding> {
    const db = await getDb(schema);
    const validated = insertHoldingSchema.parse(data);
    const [holding] = await db.insert(holdings).values(validated as any).returning();
    return {
      id: holding.id,
      stockName: holding.stockName,
      stockCode: holding.stockCode,
      quantity: holding.quantity,
      costPrice: parseFloat(holding.costPrice as string),
      createdAt: holding.createdAt,
      updatedAt: holding.updatedAt,
    } as Holding;
  }

  async getAllHoldings(): Promise<Holding[]> {
    const db = await getDb(schema);
    const holdingsList = await db.query.holdings.findMany({
      orderBy: [desc(holdings.createdAt)],
    });
    return holdingsList.map(holding => ({
      ...holding,
      costPrice: parseFloat(holding.costPrice),
    }));
  }

  async getHoldingById(id: string): Promise<Holding | null> {
    const db = await getDb(schema);
    const holding = await db.query.holdings.findFirst({
      where: eq(holdings.id, id),
    });
    if (!holding) return null;
    return {
      ...holding,
      costPrice: parseFloat(holding.costPrice),
    };
  }

  async getHoldingByStockCode(stockCode: string): Promise<Holding | null> {
    const db = await getDb(schema);
    const holding = await db.query.holdings.findFirst({
      where: eq(holdings.stockCode, stockCode),
    });
    if (!holding) return null;
    return {
      ...holding,
      costPrice: parseFloat(holding.costPrice),
    };
  }

  async searchHoldings(keyword: string): Promise<Holding[]> {
    const db = await getDb(schema);
    const holdingsList = await db.query.holdings.findMany({
      where: like(holdings.stockName, `%${keyword}%`),
      orderBy: [desc(holdings.createdAt)],
    });
    return holdingsList.map(holding => ({
      ...holding,
      costPrice: parseFloat(holding.costPrice),
    }));
  }

  async updateHolding(id: string, data: UpdateHolding): Promise<Holding | null> {
    const db = await getDb(schema);
    const validated = updateHoldingSchema.parse(data);
    const [holding] = await db
      .update(holdings)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(holdings.id, id))
      .returning();
    if (!holding) return null;
    return {
      ...holding,
      costPrice: parseFloat(holding.costPrice),
    };
  }

  async deleteHolding(id: string): Promise<boolean> {
    const db = await getDb(schema);
    const result = await db.delete(holdings).where(eq(holdings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteAllHoldings(): Promise<number> {
    const db = await getDb(schema);
    const result = await db.delete(holdings);
    return result.rowCount ?? 0;
  }
}

export const holdingManager = new HoldingManager();
