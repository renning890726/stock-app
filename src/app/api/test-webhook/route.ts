import { NextRequest, NextResponse } from "next/server";
import { HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const { webhookUrl } = await request.json();
    
    if (!webhookUrl) {
      return NextResponse.json(
        { message: "请提供 webhook URL" },
        { status: 400 }
      );
    }
    
    // 发送测试消息
    const payload = {
      msg_type: "text",
      content: {
        text: "✅ 飞书 Webhook 连接测试成功！\n\n您的投资建议将自动推送到此群组。",
      },
    };
    
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`推送失败: ${error}`);
    }
    
    return NextResponse.json({ message: "连接成功" });
  } catch (error: any) {
    console.error("测试 webhook 失败:", error);
    return NextResponse.json(
      { message: error.message || "测试失败" },
      { status: 500 }
    );
  }
}
