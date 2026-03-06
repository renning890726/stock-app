import { NextRequest, NextResponse } from "next/server";

/**
 * 手动触发每日报告生成和推送
 * 可通过外部cron服务定时调用此接口
 *
 * 推荐的cron表达式：
 * - 每天21:30执行: 30 21 * * *
 */
export async function GET(request: NextRequest) {
  try {
    console.log(`[${new Date().toISOString()}] 开始执行每日报告任务...`);

    // 调用报告生成接口
    const reportUrl = `${request.nextUrl.origin}/api/recommendations/report`;
    const response = await fetch(reportUrl, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("每日报告生成失败:", error);
      return NextResponse.json(
        {
          success: false,
          message: "报告生成失败",
          error: error,
        },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log(`[${new Date().toISOString()}] 每日报告生成成功`);

    return NextResponse.json({
      success: true,
      message: "每日报告已生成并推送到飞书",
      data: result,
    });
  } catch (error: any) {
    console.error("执行每日报告任务失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "执行失败",
      },
      { status: 500 }
    );
  }
}
