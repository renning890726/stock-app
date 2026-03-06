import { NextRequest, NextResponse } from "next/server";

/**
 * 手动触发热点分析推送
 * 可通过外部cron服务定时调用此接口
 *
 * 推荐的cron表达式：
 * - 每天9:30执行: 30 9 * * *
 */
export async function GET(request: NextRequest) {
  try {
    console.log(`[${new Date().toISOString()}] 开始执行热点分析推送任务...`);

    // 调用热点推送接口
    const pushUrl = `${request.nextUrl.origin}/api/recommendations/hot-topics/push`;
    const response = await fetch(pushUrl, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("热点分析推送失败:", error);
      return NextResponse.json(
        {
          success: false,
          message: "热点分析推送失败",
          error: error,
        },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log(`[${new Date().toISOString()}] 热点分析推送成功`);

    return NextResponse.json({
      success: true,
      message: "热点分析已推送到飞书",
      data: result,
    });
  } catch (error: any) {
    console.error("执行热点分析推送任务失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "执行失败",
      },
      { status: 500 }
    );
  }
}
