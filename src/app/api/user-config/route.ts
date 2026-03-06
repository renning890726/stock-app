import { NextRequest, NextResponse } from "next/server";
import { userConfigManager } from "@/storage/database";
import { HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const body = await request.json();
    
    const config = await userConfigManager.createUserConfig(body);
    
    return NextResponse.json(config);
  } catch (error: any) {
    console.error("创建配置失败:", error);
    return NextResponse.json(
      { message: error.message || "创建配置失败" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const configs = await userConfigManager.getAllUserConfigs();
    
    return NextResponse.json(configs);
  } catch (error: any) {
    console.error("获取配置列表失败:", error);
    return NextResponse.json(
      { message: error.message || "获取配置列表失败" },
      { status: 500 }
    );
  }
}
