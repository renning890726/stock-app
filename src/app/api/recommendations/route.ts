import { NextRequest, NextResponse } from "next/server";
import { recommendationManager } from "@/storage/database";
import { HeaderUtils } from "coze-coding-dev-sdk";

export async function GET(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    
    const recommendations = await recommendationManager.getAllRecommendations(limit);
    
    return NextResponse.json(recommendations);
  } catch (error: any) {
    console.error("获取建议列表失败:", error);
    return NextResponse.json(
      { message: error.message || "获取建议列表失败" },
      { status: 500 }
    );
  }
}
