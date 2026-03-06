import { NextRequest, NextResponse } from "next/server";
import { getPriceFromSearch } from "@/lib/stock-price-enhanced";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockCode = searchParams.get("code");
    const stockName = searchParams.get("name");

    if (!stockCode || !stockName) {
      return NextResponse.json(
        { error: "请提供 stockCode 和 stockName 参数" },
        { status: 400 }
      );
    }

    // 调用搜索API并返回原始结果
    const result = await getPriceFromSearch(stockCode, stockName);

    return NextResponse.json({
      stockCode,
      stockName,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("搜索股票价格失败:", error);
    return NextResponse.json(
      { error: error.message || "搜索股票价格失败" },
      { status: 500 }
    );
  }
}
