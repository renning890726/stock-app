import { NextRequest, NextResponse } from "next/server";
import { holdingManager } from "@/storage/database";
import { HeaderUtils } from "coze-coding-dev-sdk";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updatedHolding = await holdingManager.updateHolding(id, body);

    if (!updatedHolding) {
      return NextResponse.json(
        { message: "持仓不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedHolding);
  } catch (error: any) {
    console.error("更新持仓失败:", error);
    return NextResponse.json(
      { message: error.message || "更新持仓失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const success = await holdingManager.deleteHolding(id);

    if (!success) {
      return NextResponse.json(
        { message: "持仓不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "删除成功" });
  } catch (error: any) {
    console.error("删除持仓失败:", error);
    return NextResponse.json(
      { message: error.message || "删除持仓失败" },
      { status: 500 }
    );
  }
}
