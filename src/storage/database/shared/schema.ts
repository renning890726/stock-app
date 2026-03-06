import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// 用户配置表
export const userConfigs = pgTable(
  "user_configs",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    positionAmount: numeric("position_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    profitTarget: numeric("profit_target", { precision: 5, scale: 2 }).notNull().default("10.00"),
    tradingStyle: varchar("trading_style", { length: 50 }).notNull().default("medium_long_term"),
    llmModel: varchar("llm_model", { length: 100 }).notNull().default("doubao-seed-1-8-251228"),
    feishuWebhookUrl: varchar("feishu_webhook_url", { length: 500 }),
    cash: numeric("cash", { precision: 12, scale: 2 }).notNull().default("0.00"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    tradingStyleIdx: index("user_configs_trading_style_idx").on(table.tradingStyle),
  })
);

// 持仓记录表
export const holdings = pgTable(
  "holdings",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    stockName: varchar("stock_name", { length: 100 }).notNull(),
    stockCode: varchar("stock_code", { length: 20 }).notNull(),
    quantity: integer("quantity").notNull().default(0),
    costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull().default("0.00"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    stockCodeIdx: index("holdings_stock_code_idx").on(table.stockCode),
  })
);

// 建议历史表
export const recommendations = pgTable(
  "recommendations",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: varchar("type", { length: 20 }).notNull().default("alert"), // alert（操作建议）或 report（分析报告）
    content: text("content").notNull(),
    explanation: text("explanation"),
    action: varchar("action", { length: 20 }), // buy, sell, hold（仅 alert 类型）
    relatedStock: varchar("related_stock", { length: 100 }),
    sources: text("sources"), // 信源信息
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    typeIdx: index("recommendations_type_idx").on(table.type),
    actionIdx: index("recommendations_action_idx").on(table.action),
    relatedStockIdx: index("recommendations_related_stock_idx").on(table.relatedStock),
  })
);

// 股票历史最高价表（用于判断3个月历史新高）
export const stockHighPrices = pgTable(
  "stock_high_prices",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    stockCode: varchar("stock_code", { length: 20 }).notNull().unique(),
    stockName: varchar("stock_name", { length: 100 }).notNull(),
    highPrice: numeric("high_price", { precision: 10, scale: 2 }).notNull(), // 3个月历史最高价
    highDate: timestamp("high_date", { withTimezone: true }).notNull(), // 达到最高价的日期
    lastAlertDate: timestamp("last_alert_date", { withTimezone: true }), // 上次推送历史新高的日期
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    stockCodeIdx: index("stock_high_prices_stock_code_idx").on(table.stockCode),
  })
);

// 使用 createSchemaFactory 配置 date coercion（处理前端 string → Date 转换）
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Zod schemas for validation - userConfigs
export const insertUserConfigSchema = createCoercedInsertSchema(userConfigs as any)
  .pick({
    positionAmount: true,
    profitTarget: true,
    tradingStyle: true,
    llmModel: true,
    feishuWebhookUrl: true,
    cash: true,
  })
  .extend({
    positionAmount: z.union([z.string(), z.number()]).transform(String),
    profitTarget: z.union([z.string(), z.number()]).transform(String),
    cash: z.union([z.string(), z.number()]).transform(String).optional(),
  }) as any;

export const updateUserConfigSchema = createCoercedInsertSchema(userConfigs as any)
  .pick({
    positionAmount: true,
    profitTarget: true,
    tradingStyle: true,
    llmModel: true,
    feishuWebhookUrl: true,
    cash: true,
  })
  .partial()
  .extend({
    positionAmount: z.union([z.string(), z.number()]).transform(String).optional(),
    profitTarget: z.union([z.string(), z.number()]).transform(String).optional(),
    cash: z.union([z.string(), z.number()]).transform(String).optional(),
  }) as any;

// Zod schemas for validation - holdings
export const insertHoldingSchema = createCoercedInsertSchema(holdings as any)
  .pick({
    stockName: true,
    stockCode: true,
    quantity: true,
    costPrice: true,
  })
  .extend({
    costPrice: z.union([z.string(), z.number()]).transform(String),
  }) as any;

export const updateHoldingSchema = createCoercedInsertSchema(holdings as any)
  .pick({
    stockName: true,
    stockCode: true,
    quantity: true,
    costPrice: true,
  })
  .partial()
  .extend({
    costPrice: z.union([z.string(), z.number()]).transform(String).optional(),
  }) as any;

// Zod schemas for validation - recommendations
export const insertRecommendationSchema = createCoercedInsertSchema(recommendations as any)
  .pick({
    type: true,
    content: true,
    explanation: true,
    action: true,
    relatedStock: true,
    sources: true,
  }) as any;

// TypeScript types - 简化定义
export type UserConfig = {
  id: string;
  positionAmount: number;
  profitTarget: number;
  tradingStyle: string;
  llmModel: string;
  feishuWebhookUrl: string | null;
  cash: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export type InsertUserConfig = {
  positionAmount: number | string;
  profitTarget: number | string;
  tradingStyle: string;
  llmModel?: string;
  feishuWebhookUrl?: string;
  cash?: number | string;
};

export type UpdateUserConfig = Partial<InsertUserConfig>;

export type Holding = {
  id: string;
  stockName: string;
  stockCode: string;
  quantity: number;
  costPrice: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export type InsertHolding = {
  stockName: string;
  stockCode: string;
  quantity: number;
  costPrice: number | string;
};

export type UpdateHolding = Partial<InsertHolding>;

export type Recommendation = {
  id: string;
  type: string;
  content: string;
  explanation: string | null;
  action: string | null;
  relatedStock: string | null;
  sources: string | null;
  createdAt: Date;
};

export type InsertRecommendation = {
  type: string;
  content: string;
  explanation?: string;
  action?: string;
  relatedStock?: string;
  sources?: string;
};

// 热点追踪表
export const hotTopics = pgTable(
  "hot_topics",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    topicName: varchar("topic_name", { length: 100 }).notNull(), // 热点名称
    sector: varchar("sector", { length: 100 }), // 所属板块
    strength: numeric("strength", { precision: 5, scale: 2 }).notNull().default("0.00"), // 热点强度评分 0-100
    trend: varchar("trend", { length: 20 }), // 趋势：rising, stable, declining
    keywords: text("keywords"), // 相关关键词
    description: text("description"), // 热点描述
    relatedStocks: text("related_stocks"), // 相关股票（JSON数组）
    sources: text("sources"), // 信源
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .defaultNow()
      .notNull(),
    isActive: integer("is_active").notNull().default(1),
  },
  (table) => ({
    topicNameIdx: index("hot_topics_topic_name_idx").on(table.topicName),
    sectorIdx: index("hot_topics_sector_idx").on(table.sector),
    isActiveIdx: index("hot_topics_is_active_idx").on(table.isActive),
  })
);

// 账户绩效表
export const accountPerformance = pgTable(
  "account_performance",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    date: timestamp("date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    totalValue: numeric("total_value", { precision: 12, scale: 2 }).notNull(), // 总市值
    totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull(), // 总成本
    cash: numeric("cash", { precision: 12, scale: 2 }).notNull().default("0.00"), // 现金
    totalProfit: numeric("total_profit", { precision: 12, scale: 2 }), // 总盈亏
    profitRate: numeric("profit_rate", { precision: 5, scale: 2 }), // 盈利率
    annualReturn: numeric("annual_return", { precision: 5, scale: 2 }), // 年度收益率
    maxDrawdown: numeric("max_drawdown", { precision: 5, scale: 2 }), // 最大回撤
    note: text("note"), // 备注
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    dateIdx: index("account_performance_date_idx").on(table.date),
  })
);

// 风险事件表
export const riskEvents = pgTable(
  "risk_events",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventType: varchar("event_type", { length: 50 }).notNull(), // 事件类型：stop_loss, max_drawdown, sector_concentration, etc.
    severity: varchar("severity", { length: 20 }).notNull(), // 严重程度：low, medium, high, critical
    description: text("description").notNull(), // 事件描述
    relatedStock: varchar("related_stock", { length: 100 }), // 相关股票
    currentValue: numeric("current_value", { precision: 12, scale: 2 }), // 当前值
    threshold: numeric("threshold", { precision: 12, scale: 2 }), // 阈值
    actionTaken: text("action_taken"), // 采取的措施
    resolvedAt: timestamp("resolved_at", { withTimezone: true }), // 解决时间
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    eventTypeIdx: index("risk_events_event_type_idx").on(table.eventType),
    severityIdx: index("risk_events_severity_idx").on(table.severity),
    createdAtIdx: index("risk_events_created_at_idx").on(table.createdAt),
  })
);
