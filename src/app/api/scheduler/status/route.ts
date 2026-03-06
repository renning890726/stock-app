import { NextRequest, NextResponse } from "next/server";

/**
 * 获取定时任务守护进程状态
 */
export async function GET(request: NextRequest) {
  try {
    // 检查 PID 文件是否存在
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    let pid = null;
    let running = false;

    try {
      const { stdout } = await execPromise('cat /tmp/scheduler-daemon.pid 2>/dev/null');
      pid = parseInt(stdout.trim());

      // 检查进程是否还在运行
      try {
        await execPromise(`ps -p ${pid} > /dev/null 2>&1`);
        running = true;
      } catch {
        // 进程不存在
        running = false;
        pid = null;
      }
    } catch {
      // PID 文件不存在
      running = false;
    }

    return NextResponse.json({
      running,
      pid,
      tasks: [
        {
          name: '持仓实时监控',
          schedule: '每分钟（9:30-15:00）',
          description: '每分钟监控持仓异动，检测涨跌超5%的股票',
        },
        {
          name: '盘前热点推送',
          schedule: '09:30',
          description: '每天上午 09:30 推送市场热点分析',
        },
        {
          name: '盘后持仓分析',
          schedule: '21:30',
          description: '每天晚上 21:30 生成持仓分析报告',
        },
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
