// @ts-nocheck
import { eq, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { userConfigs, insertUserConfigSchema, updateUserConfigSchema } from "./shared/schema";
import type { UserConfig, InsertUserConfig, UpdateUserConfig } from "./shared/schema";
import * as schema from "./shared/schema";

export class UserConfigManager {
  async createUserConfig(data: InsertUserConfig): Promise<UserConfig> {
    const db = await getDb(schema);
    const validated = insertUserConfigSchema.parse(data);
    const [userConfig] = await db.insert(userConfigs).values(validated as any).returning();
    return {
      id: userConfig.id,
      positionAmount: parseFloat(userConfig.positionAmount as string),
      profitTarget: parseFloat(userConfig.profitTarget as string),
      tradingStyle: userConfig.tradingStyle,
      llmModel: userConfig.llmModel,
      feishuWebhookUrl: userConfig.feishuWebhookUrl,
      createdAt: userConfig.createdAt,
      updatedAt: userConfig.updatedAt,
    } as UserConfig;
  }

  async getLatestUserConfig(): Promise<UserConfig | null> {
    const db = await getDb(schema);
    const config = await db.query.userConfigs.findFirst({
      orderBy: [desc(userConfigs.createdAt)],
      limit: 1,
    });
    if (!config) return null;
    // @ts-ignore
    return config as any;
  }

  async getUserConfigById(id: string): Promise<UserConfig | null> {
    const db = await getDb(schema);
    const config = await db.query.userConfigs.findFirst({
      where: eq(userConfigs.id, id),
    });
    if (!config) return null;
    return config as any;
  }

  async updateUserConfig(id: string, data: UpdateUserConfig): Promise<UserConfig | null> {
    const db = await getDb(schema);
    const validated = updateUserConfigSchema.parse(data);
    const [config] = await db
      .update(userConfigs)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(userConfigs.id, id))
      .returning();
    if (!config) return null;
    return config as any;
  }

  async deleteUserConfig(id: string): Promise<boolean> {
    const db = await getDb(schema);
    const result = await db.delete(userConfigs).where(eq(userConfigs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllUserConfigs(): Promise<UserConfig[]> {
    const db = await getDb(schema);
    const configs = await db.query.userConfigs.findMany({
      orderBy: [desc(userConfigs.createdAt)],
    });
    return configs as any;
  }
}

export const userConfigManager = new UserConfigManager();
