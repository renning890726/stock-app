import { NextRequest, NextResponse } from "next/server";
import { holdingManager } from "@/storage/database";
import { setCachedPrice } from "@/lib/price-cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { currentPrice } = body;

    if (currentPrice === undefined || currentPrice === null) {
      return NextResponse.json(
        { message: "请提供 currentPrice 参数" },
        { status: 400 }
      );
    }

    const price = Number(currentPrice);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { message: "价格必须是大于0的数字" },
        { status: 400 }
      );
    }

    // 更新数据库中的价格
    const holding = await holdingManager.getHoldingById(id);
    if (!holding) {
      return NextResponse.json(
        { message: "持仓不存在" },
        { status: 404 }
      );
    }

    // 更新缓存（设置为manual来源）
    setCachedPrice(holding.stockCode, price, 'manual');
    
    // 清除 Python Akshare 服务的缓存
    try {
      await fetch(`${process.env.AKSHARE_API_URL || 'http://localhost:9001'}/api/stock/clear-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock_code: holding.stockCode }),
      });
    } catch (error) {
      console.warn('清除 Python 服务缓存失败:', error);
      // 不阻塞主流程
    }
    
    // 注意：这里我们只更新缓存，不修改数据库中的成本价
    // 实际显示时，系统会优先使用缓存中的价格

    return NextResponse.json({
      success: true,
      message: "股价已更新",
      stockCode: holding.stockCode,
      stockName: holding.stockName,
      currentPrice: price,
    });
  } catch (error: any) {
    console.error("更新股价失败:", error);
    return NextResponse.json(
      { message: error.message || "更新股价失败" },
      { status: 500 }
    );
  }
}
