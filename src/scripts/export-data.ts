/**
 * 导出数据库数据脚本
 * 用于部署前导出持仓和用户配置数据
 */

import { userConfigManager, holdingManager } from '@/storage/database';
import { writeFile } from 'fs/promises';
import { join } from 'path';

async function exportData() {
  console.log('📦 开始导出数据...');

  try {
    // 1. 导出用户配置
    const userConfigs = await userConfigManager.getAllUserConfigs();
    console.log(`✅ 导出用户配置: ${userConfigs.length} 条`);

    // 2. 导出持仓数据
    const holdings = await holdingManager.getAllHoldings();
    console.log(`✅ 导出持仓数据: ${holdings.length} 条`);

    // 3. 创建导出对象
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      userConfigs: userConfigs.map(config => ({
        positionAmount: config.positionAmount,
        profitTarget: config.profitTarget,
        tradingStyle: config.tradingStyle,
        llmModel: config.llmModel,
        feishuWebhookUrl: config.feishuWebhookUrl,
        cash: config.cash,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      })),
      holdings: holdings.map(holding => ({
        stockName: holding.stockName,
        stockCode: holding.stockCode,
        quantity: holding.quantity,
        costPrice: holding.costPrice,
        createdAt: holding.createdAt,
        updatedAt: holding.updatedAt,
      })),
    };

    // 4. 写入文件
    const outputPath = join(process.cwd(), 'data-export.json');
    await writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
    console.log(`✅ 数据已导出到: ${outputPath}`);
    console.log(`📊 数据摘要:`);
    console.log(`   - 用户配置: ${exportData.userConfigs.length} 条`);
    console.log(`   - 持仓数据: ${exportData.holdings.length} 条`);
    console.log(`   - 导出时间: ${exportData.exportTime}`);

    return exportData;
  } catch (error) {
    console.error('❌ 导出失败:', error);
    throw error;
  }
}

// 执行导出
exportData()
  .then(() => {
    console.log('✅ 数据导出完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 导出失败:', error);
    process.exit(1);
  });
