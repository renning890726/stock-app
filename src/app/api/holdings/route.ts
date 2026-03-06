import { NextRequest, NextResponse } from "next/server";
import { holdingManager } from "@/storage/database";
import { getStockPricesBatch } from "@/lib/stock-price-enhanced";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const holding = await holdingManager.createHolding(body);

    return NextResponse.json(holding);
  } catch (error: any) {
    console.error("创建持仓失败:", error);
    return NextResponse.json(
      { message: error.message || "创建持仓失败" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const holdings = await holdingManager.getAllHoldings();

    // 使用增强的批量查询函数获取实时价格（并发查询）
    const priceResults = await getStockPricesBatch(
      holdings.map(h => ({
        stockCode: h.stockCode,
        stockName: h.stockName,
        costPrice: Number(h.costPrice),
      }))
    );

    // 合并结果
    const holdingsWithPrice: any[] = holdings.map(h => {
      const priceData = priceResults.get(h.stockCode) || {
        currentPrice: 0,
        source: 'error',
        timestamp: Date.now(),
      };

      return {
        ...h,
        currentPrice: priceData.currentPrice,
        priceSource: priceData.source,
        openPrice: priceData.openPrice,
        changePercent: priceData.changePercent,
        peRatio: priceData.peRatio,
        lastUpdateTime: priceData.timestamp,
      };
    });

    return NextResponse.json(holdingsWithPrice);
  } catch (error: any) {
    console.error("获取持仓列表失败:", error);
    return NextResponse.json(
      { message: error.message || "获取持仓列表失败" },
      { status: 500 }
    );
  }
}
