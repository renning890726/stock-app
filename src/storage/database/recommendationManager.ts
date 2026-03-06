import { eq, desc, and } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { recommendations, insertRecommendationSchema } from "./shared/schema";
import type { Recommendation, InsertRecommendation } from "./shared/schema";
import * as schema from "./shared/schema";

export class RecommendationManager {
  async createRecommendation(data: InsertRecommendation): Promise<Recommendation> {
    const db = await getDb(schema);
    const validated = insertRecommendationSchema.parse(data);
    const [recommendation] = await db.insert(recommendations).values(validated).returning();
    return recommendation;
  }

  async getAllRecommendations(limit: number = 50): Promise<Recommendation[]> {
    const db = await getDb(schema);
    return db.query.recommendations.findMany({
      orderBy: [desc(recommendations.createdAt)],
      limit,
    });
  }

  async getRecommendationById(id: string): Promise<Recommendation | null> {
    const db = await getDb(schema);
    const recommendation = await db.query.recommendations.findFirst({
      where: eq(recommendations.id, id),
    });
    return recommendation || null;
  }

  async getRecommendationsByAction(action: string, limit: number = 20): Promise<Recommendation[]> {
    const db = await getDb(schema);
    return db.query.recommendations.findMany({
      where: eq(recommendations.action, action),
      orderBy: [desc(recommendations.createdAt)],
      limit,
    });
  }

  async getRecommendationsByStock(stockCode: string, limit: number = 20): Promise<Recommendation[]> {
    const db = await getDb(schema);
    return db.query.recommendations.findMany({
      where: eq(recommendations.relatedStock, stockCode),
      orderBy: [desc(recommendations.createdAt)],
      limit,
    });
  }

  async getRecentRecommendations(options: {
    type?: string;
    limit?: number;
  }): Promise<Recommendation[]> {
    const db = await getDb(schema);
    const whereClause = options.type ? eq(recommendations.type, options.type as any) : undefined;

    return db.query.recommendations.findMany({
      where: whereClause,
      orderBy: [desc(recommendations.createdAt)],
      limit: options.limit || 10,
    });
  }

  async deleteRecommendation(id: string): Promise<boolean> {
    const db = await getDb(schema);
    const result = await db.delete(recommendations).where(eq(recommendations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteRecommendationsBefore(date: Date): Promise<number> {
    const db = await getDb(schema);
    const result = await db.delete(recommendations).where(
      eq(recommendations.createdAt, date)
    );
    return result.rowCount ?? 0;
  }
}

export const recommendationManager = new RecommendationManager();
