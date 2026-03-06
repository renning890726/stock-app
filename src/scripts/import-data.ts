/**
 * 导入数据库数据脚本
 * 用于部署后恢复持仓和用户配置数据
 */

import { userConfigManager, holdingManager } from '@/storage/database';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface ExportedData {
  version: string;
  exportTime: string;
  userConfigs: Array<{
    positionAmount: string;
    profitTarget: string;
    tradingStyle: string;
    llmModel: string;
    feishuWebhookUrl: string | null;
    cash: string;
    createdAt: string;
    updatedAt: string | null;
  }>;
  holdings: Array<{
    stockName: string;
    stockCode: string;
    quantity: number;
    costPrice: number;
    createdAt: string;
    updatedAt: string | null;
  }>;
}

async function importData() {
  console.log('📥 开始导入数据...');

  try {
    // 1. 读取导出文件
    const filePath = join(process.cwd(), 'data-export.json');
    const fileContent = await readFile(filePath, 'utf-8');
    const data: ExportedData = JSON.parse(fileContent);

    console.log(`✅ 数据版本: ${data.version}`);
    console.log(`✅ 导出时间: ${data.exportTime}`);

    // 2. 导入用户配置（导入最新的一条）
    if (data.userConfigs.length > 0) {
      const latestConfig = data.userConfigs[0]; // 已按创建时间排序
      console.log(`📝 导入用户配置: 持仓金额 ¥${latestConfig.positionAmount}, 盈利目标 ${latestConfig.profitTarget}%`);

      try {
        await userConfigManager.createUserConfig({
          positionAmount: latestConfig.positionAmount,
          profitTarget: latestConfig.profitTarget,
          tradingStyle: latestConfig.tradingStyle,
          llmModel: latestConfig.llmModel,
          feishuWebhookUrl: latestConfig.feishuWebhookUrl || undefined,
          cash: latestConfig.cash,
        });
        console.log('✅ 用户配置导入成功');
      } catch (error) {
        console.log('⚠️ 用户配置已存在，跳过导入');
      }
    }

    // 3. 导入持仓数据
    console.log(`📝 导入持仓数据: ${data.holdings.length} 条`);
    let importedCount = 0;
    let skippedCount = 0;

    for (const holding of data.holdings) {
      try {
        await holdingManager.createHolding({
          stockName: holding.stockName,
          stockCode: holding.stockCode,
          quantity: holding.quantity,
          costPrice: holding.costPrice,
        });
        importedCount++;
      } catch (error) {
        // 可能是重复数据，跳过
        skippedCount++;
      }
    }

    console.log(`✅ 持仓数据导入完成: ${importedCount} 条新增, ${skippedCount} 条跳过`);
    console.log('✅ 数据导入完成');
  } catch (error) {
    console.error('❌ 导入失败:', error);
    throw error;
  }
}

// 执行导入
importData()
  .then(() => {
    console.log('✅ 数据导入成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  });
