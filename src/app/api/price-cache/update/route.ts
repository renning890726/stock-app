import { NextRequest, NextResponse } from "next/server";
import { setCachedPrice } from "@/lib/price-cache";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stockCode, currentPrice } = body;

    if (!stockCode) {
      return NextResponse.json(
        { message: "请提供 stockCode 参数" },
        { status: 400 }
      );
    }

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

    // 更新缓存
    setCachedPrice(stockCode, price);
    
    return NextResponse.json({
      success: true,
      message: "股价已更新到缓存",
      stockCode,
      currentPrice: price,
    });
  } catch (error: any) {
    console.error("更新缓存价格失败:", error);
    return NextResponse.json(
      { message: error.message || "更新失败" },
      { status: 500 }
    );
  }
}
