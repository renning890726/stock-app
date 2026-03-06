import { NextRequest, NextResponse } from "next/server";

/**
 * 测试推送功能
 */
export async function POST(request: NextRequest) {
  try {
    // 调用热点推送 API
    const pushUrl = new URL(
      "/api/recommendations/hot-topics/push",
      request.url
    );

    const response = await fetch(pushUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { message: errorData.message || '推送失败' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      message: '测试推送成功',
      ...data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || '测试推送失败' },
      { status: 500 }
    );
  }
}
