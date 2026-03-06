import { NextRequest, NextResponse } from "next/server";
import { clearPriceCache } from "@/lib/stock-price";

export async function POST(request: NextRequest) {
  try {
    clearPriceCache();
    return NextResponse.json({ message: "价格缓存已清空" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "清空缓存失败" },
      { status: 500 }
    );
  }
}
