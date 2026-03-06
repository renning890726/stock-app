// @ts-nocheck
import { userConfigManager } from "../storage/database";
import { isTradingTime } from './price-cache';

interface ScheduledTask {
  id: string;
  name: string;
  cronExpression: string;
  lastRun: Date | null;
  nextRun: Date | null;
  isActive: boolean;
  handler: () => Promise<void>;
}

class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  /**
   * 注册定时任务
   */
  registerTask(task: Omit<ScheduledTask, "id">): string {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const scheduledTask: ScheduledTask = {
      ...task,
      id,
    };
    
    this.tasks.set(id, scheduledTask);
    
    if (this.isRunning && task.isActive) {
      this.startTask(id);
    }
    
    return id;
  }

  /**
   * 启动任务调度器
   */
  start() {
    if (this.isRunning) {
      console.log("任务调度器已在运行");
      return;
    }

    this.isRunning = true;
    console.log("任务调度器已启动");

    // 启动所有活跃任务
    this.tasks.forEach((task, id) => {
      if (task.isActive) {
        this.startTask(id);
      }
    });
  }

  /**
   * 停止任务调度器
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log("任务调度器已停止");

    // 停止所有任务
    this.intervalIds.forEach((intervalId, id) => {
      clearInterval(intervalId);
    });
    this.intervalIds.clear();
  }

  /**
   * 启动单个任务
   */
  private startTask(id: string) {
    const task = this.tasks.get(id);
    if (!task) {
      return;
    }

    // 清除已有的定时器
    const existingInterval = this.intervalIds.get(id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // 立即执行一次（检查是否到时间）
    this.checkAndRunTask(task);

    // 设置定时检查（每分钟检查一次）
    const intervalId = setInterval(() => {
      this.checkAndRunTask(task);
    }, 60 * 1000); // 每分钟检查一次

    this.intervalIds.set(id, intervalId);
    console.log(`任务 "${task.name}" 已启动`);
  }

  /**
   * 检查并运行任务
   */
  private async checkAndRunTask(task: ScheduledTask) {
    try {
      const now = new Date();
      
      // 计算下次运行时间
      if (!task.nextRun || now >= task.nextRun) {
        // 执行任务
        console.log(`执行任务: ${task.name} - ${now.toISOString()}`);
        
        try {
          await task.handler();
          task.lastRun = now;
          console.log(`任务 "${task.name}" 执行成功`);
        } catch (error) {
          console.error(`任务 "${task.name}" 执行失败:`, error);
        }

        // 计算下次运行时间
        task.nextRun = this.calculateNextRun(task.cronExpression);
      }
    } catch (error) {
      console.error(`检查任务失败:`, error);
    }
  }

  /**
   * 计算下次运行时间
   * 简化版 cron 解析，支持格式:
   * - "HH:mm" (每天固定时间，如 "20:00")
   * - "*:*" (每分钟)
   */
  private calculateNextRun(cronExpression: string): Date {
    // 每分钟执行
    if (cronExpression === "*:*") {
      const nextRun = new Date();
      nextRun.setMinutes(nextRun.getMinutes() + 1);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);
      return nextRun;
    }

    // 每天固定时间执行
    const now = new Date();
    const [hours, minutes] = cronExpression.split(':').map(Number);

    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    // 如果今天的时间已过，设置为明天
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }

  /**
   * 获取所有任务状态
   */
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).map(task => ({
      ...task,
      lastRun: task.lastRun,
      nextRun: task.nextRun,
    }));
  }

  /**
   * 切换任务状态
   */
  toggleTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) {
      return false;
    }

    task.isActive = !task.isActive;

    if (task.isActive) {
      this.startTask(id);
    } else {
      const intervalId = this.intervalIds.get(id);
      if (intervalId) {
        clearInterval(intervalId);
        this.intervalIds.delete(id);
      }
      console.log(`任务 "${task.name}" 已停止`);
    }

    return task.isActive;
  }
}

// 创建全局调度器实例
const scheduler = new TaskScheduler();

/**
 * 初始化所有定时任务
 */
function initializeScheduledTasks() {
  // 每天晚上9点半生成持仓分析报告
  scheduler.registerTask({
    name: "每日持仓分析报告",
    cronExpression: "21:30", // 每天晚上9点半
    isActive: true,
    lastRun: null,
    nextRun: null,
    handler: async () => {
      try {
        const port = process.env.PORT || 5000;
        const baseUrl = `http://localhost:${port}`;
        const response = await fetch(`${baseUrl}/api/recommendations/report`, {
          method: 'POST',
        });

        if (response.ok) {
          console.log("每日持仓分析报告生成成功");
        } else {
          console.error("每日持仓分析报告生成失败");
        }
      } catch (error) {
        console.error("执行每日报告任务失败:", error);
      }
    },
  });

  // 实时监控持仓个股（每分钟检查一次）
  scheduler.registerTask({
    name: "持仓实时监控",
    cronExpression: "*:*", // 每分钟
    isActive: true,
    lastRun: null,
    nextRun: null,
    handler: async () => {
      await monitorHoldings();
    },
  });

  // 每天早上9点半推送热点分析
  scheduler.registerTask({
    name: "盘前热点推送",
    cronExpression: "09:30", // 每天早上9点半
    isActive: true,
    lastRun: null,
    nextRun: null,
    handler: async () => {
      await pushHotTopics();
    },
  });

  console.log("定时任务已初始化");
}

/**
 * 监控持仓个股，判断是否达到买/卖点
 * 仅在交易时间内执行监控，非交易时间跳过
 */
async function monitorHoldings() {
  // 检查是否在交易时间内
  if (!isTradingTime()) {
    console.log("非交易时间，跳过持仓监控");
    return;
  }

  try {
    const port = process.env.PORT || 5000;
    const baseUrl = `http://localhost:${port}`;
    const response = await fetch(`${baseUrl}/api/recommendations/monitor`, {
      method: 'POST',
    });

    if (response.ok) {
      const result = await response.json();
      if (result.triggered) {
        console.log(`触发推送: ${result.action} ${result.stockName} (${result.stockCode})`);
      }
    }
  } catch (error) {
    console.error("监控持仓失败:", error);
  }
}

/**
 * 推送热点分析
 */
async function pushHotTopics() {
  try {
    const port = process.env.PORT || 5000;
    const baseUrl = `http://localhost:${port}`;
    const response = await fetch(`${baseUrl}/api/recommendations/hot-topics/push`, {
      method: 'POST',
    });

    if (response.ok) {
      console.log("热点分析推送成功");
    } else {
      console.error("热点分析推送失败");
    }
  } catch (error) {
    console.error("执行热点推送任务失败:", error);
  }
}

// 启动调度器
scheduler.start();
initializeScheduledTasks();

export { scheduler, TaskScheduler };
