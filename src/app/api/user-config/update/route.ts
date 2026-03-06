import { NextRequest, NextResponse } from "next/server";
import { userConfigManager } from "@/storage/database";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // 获取最新的配置
    const latestConfig = await userConfigManager.getLatestUserConfig();
    if (!latestConfig) {
      return NextResponse.json(
        { message: "请先创建配置" },
        { status: 400 }
      );
    }

    // 合并更新
    const updatedConfig = await userConfigManager.updateUserConfig(latestConfig.id, body);

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    console.error("更新配置失败:", error);
    return NextResponse.json(
      { message: error.message || "更新配置失败" },
      { status: 500 }
    );
  }
}
