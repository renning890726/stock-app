// 服务端组件，用于初始化任务调度器
import { stockHighPriceManager } from '@/storage/database';

// 在服务端组件中直接初始化
let schedulerInitialized = false;

async function initializeScheduler() {
  if (schedulerInitialized) {
    return;
  }

  try {
    // 尝试清理重复的历史最高价记录
    try {
      // 获取所有历史记录
      const allRecords = await stockHighPriceManager.getAllStockHighPrices();
      const stockCodeSet = new Set<string>();
      const duplicates: string[] = [];

      // 检查是否有重复的股票代码
      for (const record of allRecords) {
        if (stockCodeSet.has(record.stockCode)) {
          duplicates.push(record.stockCode);
        } else {
          stockCodeSet.add(record.stockCode);
        }
      }

      // 如果发现重复，清空所有记录
      if (duplicates.length > 0) {
        console.log(`发现 ${duplicates.length} 个重复的股票代码，清空所有历史最高价记录:`, duplicates);
        await stockHighPriceManager.clearAllStockHighPrices();
      }
    } catch (error) {
      console.error('检查历史最高价记录失败:', error);
      // 不阻塞后续初始化
    }

    // 动态导入调度器
    await import('@/lib/scheduler');
    console.log('任务调度器已初始化');
    schedulerInitialized = true;
  } catch (error) {
    console.error('初始化任务调度器失败:', error);
  }
}

// 组件本身不渲染任何内容
export async function TaskSchedulerInitializer() {
  // 在组件加载时初始化任务调度器
  await initializeScheduler();

  return null; // 这个组件不渲染任何内容
}
