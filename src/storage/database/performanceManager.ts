import { getDb } from "coze-coding-dev-sdk";
import { accountPerformance, riskEvents } from "./shared/schema";
import { eq, and, desc, lte, gte } from "drizzle-orm";
import { holdingManager } from "./holdingManager";
import * as schema from "./shared/schema";

export type AccountPerformance = typeof accountPerformance.$inferSelect;
export type InsertAccountPerformance = typeof accountPerformance.$inferInsert;
export type RiskEvent = typeof riskEvents.$inferSelect;
export type InsertRiskEvent = typeof riskEvents.$inferInsert;

export class PerformanceManager {
  /**
   * 创建账户绩效记录
   */
  async createPerformance(data: InsertAccountPerformance): Promise<AccountPerformance> {
    const db = await getDb(schema);
    const [performance] = await db
      .insert(accountPerformance)
      .values({
        ...data,
        date: new Date(),
      })
      .returning();
    return performance;
  }

  /**
   * 获取最新的账户绩效
   */
  async getLatestPerformance(): Promise<AccountPerformance | null> {
    const db = await getDb(schema);
    const [performance] = await db
      .select()
      .from(accountPerformance)
      .orderBy(desc(accountPerformance.date))
      .limit(1);
    return performance || null;
  }

  /**
   * 计算当前账户绩效（基于持仓和当前价格）
   */
  async calculateCurrentPerformance(): Promise<AccountPerformance> {
    const holdings = await holdingManager.getAllHoldings();
    const latestPerf = await this.getLatestPerformance();

    let totalValue = 0;
    let totalCost = 0;

    // 这里简化处理，实际需要获取当前价格
    // 暂时使用成本价作为当前价格
    for (const holding of holdings) {
      const cost = Number(holding.costPrice) * holding.quantity;
      totalValue += cost;
      totalCost += cost;
    }

    const totalProfit = totalValue - totalCost;
    const profitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    // 计算年度收益率（基于初始资金）
    // 这里暂时使用totalCost作为初始资金
    const annualReturn = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    // 计算最大回撤（需要历史数据，这里简化处理）
    const maxDrawdown = 0;

    return {
      id: "",
      date: new Date(),
      totalValue: totalValue.toString(),
      totalCost: totalCost.toString(),
      cash: "0",
      totalProfit: totalProfit.toString(),
      profitRate: profitRate.toString(),
      annualReturn: annualReturn.toString(),
      maxDrawdown: maxDrawdown.toString(),
      note: "",
      createdAt: new Date(),
    };
  }

  /**
   * 获取绩效历史
   */
  async getPerformanceHistory(days: number = 30): Promise<AccountPerformance[]> {
    const db = await getDb(schema);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return db
      .select()
      .from(accountPerformance)
      .where(gte(accountPerformance.date, cutoffDate))
      .orderBy(desc(accountPerformance.date));
  }
}

export class RiskEventManager {
  /**
   * 创建风险事件
   */
  async createRiskEvent(data: InsertRiskEvent): Promise<RiskEvent> {
    const db = await getDb(schema);
    const [event] = await db.insert(riskEvents).values({
      ...data,
      createdAt: new Date(),
    }).returning();
    return event;
  }

  /**
   * 获取活跃风险事件（未解决的）
   */
  async getActiveRiskEvents(): Promise<RiskEvent[]> {
    const db = await getDb(schema);
    return db
      .select()
      .from(riskEvents)
      .where(eq(riskEvents.resolvedAt, null as any))
      .orderBy(desc(riskEvents.createdAt));
  }

  /**
   * 解决风险事件
   */
  async resolveRiskEvent(id: string, actionTaken: string): Promise<boolean> {
    const db = await getDb(schema);
    await db
      .update(riskEvents)
      .set({
        resolvedAt: new Date(),
        actionTaken,
      })
      .where(eq(riskEvents.id, id));
    return true;
  }

  /**
   * 检查并创建止损事件
   */
  async checkStopLoss(
    stockCode: string,
    stockName: string,
    currentPrice: number,
    costPrice: number,
    stopLossThreshold: number
  ): Promise<RiskEvent | null> {
    const lossRate = ((costPrice - currentPrice) / costPrice) * 100;

    if (lossRate >= stopLossThreshold) {
      return this.createRiskEvent({
        eventType: "stop_loss",
        severity: lossRate >= stopLossThreshold * 1.5 ? "high" : "medium",
        description: `${stockName}(${stockCode}) 亏损达到 ${lossRate.toFixed(2)}%，超过止损阈值 ${stopLossThreshold}%`,
        relatedStock: stockCode,
        currentValue: currentPrice.toString(),
        threshold: (costPrice * (1 - stopLossThreshold / 100)).toString(),
      });
    }

    return null;
  }

  /**
   * 检查并创建最大回撤事件
   */
  async checkMaxDrawdown(
    currentValue: number,
    peakValue: number,
    maxDrawdownThreshold: number
  ): Promise<RiskEvent | null> {
    const drawdown = ((peakValue - currentValue) / peakValue) * 100;

    if (drawdown >= maxDrawdownThreshold) {
      return this.createRiskEvent({
        eventType: "max_drawdown",
        severity: drawdown >= maxDrawdownThreshold * 1.5 ? "critical" : "high",
        description: `账户回撤达到 ${drawdown.toFixed(2)}%，超过最大回撤阈值 ${maxDrawdownThreshold}%`,
        currentValue: currentValue.toString(),
        threshold: (peakValue * (1 - maxDrawdownThreshold / 100)).toString(),
      });
    }

    return null;
  }

  /**
   * 检查板块集中度风险
   */
  async checkSectorConcentration(
    sector: string,
    sectorValue: number,
    totalValue: number,
    concentrationThreshold: number
  ): Promise<RiskEvent | null> {
    const concentration = (sectorValue / totalValue) * 100;

    if (concentration >= concentrationThreshold) {
      return this.createRiskEvent({
        eventType: "sector_concentration",
        severity: concentration >= concentrationThreshold * 1.5 ? "high" : "medium",
        description: `${sector} 板块仓位占比 ${concentration.toFixed(2)}%，超过集中度阈值 ${concentrationThreshold}%`,
        currentValue: sectorValue.toString(),
        threshold: (totalValue * (concentrationThreshold / 100)).toString(),
      });
    }

    return null;
  }
}

export const performanceManager = new PerformanceManager();
export const riskEventManager = new RiskEventManager();
