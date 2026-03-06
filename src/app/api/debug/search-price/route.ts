import { NextRequest, NextResponse } from "next/server";
import { getPriceFromSearch } from "@/lib/stock-price-enhanced";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockCode = searchParams.get("code");
    const stockName = searchParams.get("name");

    if (!stockCode || !stockName) {
      return NextResponse.json(
        { error: "请提供 code 和 name 参数" },
        { status: 400 }
      );
    }

    // 直接调用搜索函数
    const result = await getPriceFromSearch(stockCode, stockName);

    return NextResponse.json({
      stockCode,
      stockName,
      currentPrice: result.currentPrice,
      source: result.source,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("调试搜索价格失败:", error);
    return NextResponse.json(
      { error: error.message || "调试失败" },
      { status: 500 }
    );
  }
}
