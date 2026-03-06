import { getDb } from "coze-coding-dev-sdk";
import { hotTopics } from "./shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import * as schema from "./shared/schema";

export type HotTopic = typeof hotTopics.$inferSelect;
export type InsertHotTopic = typeof hotTopics.$inferInsert;

export class HotTopicsManager {
  /**
   * 创建新热点
   */
  async createHotTopic(data: InsertHotTopic): Promise<HotTopic> {
    const db = await getDb(schema);
    const [topic] = await db
      .insert(hotTopics)
      .values({
        ...data,
        discoveredAt: new Date(),
        lastUpdated: new Date(),
      })
      .returning();
    return topic;
  }

  /**
   * 获取所有活跃热点
   */
  async getActiveHotTopics(): Promise<HotTopic[]> {
    const db = await getDb(schema);
    return db
      .select()
      .from(hotTopics)
      .where(eq(hotTopics.isActive, 1))
      .orderBy(desc(hotTopics.strength));
  }

  /**
   * 按板块获取热点
   */
  async getHotTopicsBySector(sector: string): Promise<HotTopic[]> {
    const db = await getDb(schema);
    return db
      .select()
      .from(hotTopics)
      .where(and(eq(hotTopics.isActive, 1), eq(hotTopics.sector, sector)))
      .orderBy(desc(hotTopics.strength));
  }

  /**
   * 更新热点信息
   */
  async updateHotTopic(
    id: string,
    updates: Partial<InsertHotTopic>
  ): Promise<HotTopic | null> {
    const db = await getDb(schema);
    const [topic] = await db
      .update(hotTopics)
      .set({
        ...updates,
        lastUpdated: new Date(),
      })
      .where(eq(hotTopics.id, id))
      .returning();
    return topic || null;
  }

  /**
   * 停用热点
   */
  async deactivateHotTopic(id: string): Promise<boolean> {
    const db = await getDb(schema);
    await db
      .update(hotTopics)
      .set({ isActive: 0 })
      .where(eq(hotTopics.id, id));
    return true;
  }

  /**
   * 获取最近发现的热点（7天内）
   */
  async getRecentHotTopics(days: number = 7): Promise<HotTopic[]> {
    const db = await getDb(schema);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return db
      .select()
      .from(hotTopics)
      .where(and(eq(hotTopics.isActive, 1), gte(hotTopics.discoveredAt, cutoffDate)))
      .orderBy(desc(hotTopics.discoveredAt));
  }

  /**
   * 获取热点统计
   */
  async getHotTopicsStats() {
    const db = await getDb(schema);
    const all = await db.select().from(hotTopics);
    const active = all.filter(t => t.isActive);
    const rising = active.filter(t => t.trend === "rising");
    const stable = active.filter(t => t.trend === "stable");
    const declining = active.filter(t => t.trend === "declining");

    return {
      total: all.length,
      active: active.length,
      inactive: all.length - active.length,
      byTrend: {
        rising: rising.length,
        stable: stable.length,
        declining: declining.length,
      },
      avgStrength: active.length > 0
        ? active.reduce((sum, t) => sum + Number(t.strength), 0) / active.length
        : 0,
    };
  }
}

export const hotTopicsManager = new HotTopicsManager();
