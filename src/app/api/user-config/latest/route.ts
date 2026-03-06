import { NextRequest, NextResponse } from "next/server";
import { userConfigManager } from "@/storage/database";
import { HeaderUtils } from "coze-coding-dev-sdk";

export async function GET(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = await userConfigManager.getLatestUserConfig();
    
    return NextResponse.json(config);
  } catch (error: any) {
    console.error("获取最新配置失败:", error);
    return NextResponse.json(
      { message: error.message || "获取最新配置失败" },
      { status: 500 }
    );
  }
}
