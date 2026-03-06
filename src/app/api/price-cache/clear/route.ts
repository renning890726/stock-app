import { NextRequest, NextResponse } from "next/server";
import { clearAllCache, getCacheStats } from "@/lib/price-cache";

export async function POST(request: NextRequest) {
  try {
    // 获取清理前的缓存统计
    const beforeStats = getCacheStats();

    // 清空所有缓存
    clearAllCache();

    // 获取清理后的缓存统计
    const afterStats = getCacheStats();

    return NextResponse.json({
      success: true,
      message: "缓存已清空",
      before: beforeStats,
      after: afterStats,
    });
  } catch (error: any) {
    console.error("清理缓存失败:", error);
    return NextResponse.json(
      { message: error.message || "清理缓存失败" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = getCacheStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("获取缓存统计失败:", error);
    return NextResponse.json(
      { message: error.message || "获取缓存统计失败" },
      { status: 500 }
    );
  }
}
