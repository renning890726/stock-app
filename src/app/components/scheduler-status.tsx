"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Calendar } from "lucide-react";

interface MonitorStatus {
  isMonitoring: boolean;
  tradingTime: boolean;
  lastCheck: string | null;
  triggeredCount: number;
}

export function SchedulerStatus() {
  const [status, setStatus] = useState<MonitorStatus>({
    isMonitoring: true,
    tradingTime: false,
    lastCheck: null,
    triggeredCount: 0,
  });

  useEffect(() => {
    // 模拟获取监控状态
    const updateStatus = () => {
      // 使用中国时区（UTC+8）进行判断
      const chinaTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
      const hours = chinaTime.getHours();
      const minutes = chinaTime.getMinutes();

      // 判断是否在交易时间内（9:30-11:30 或 13:00-15:00）
      const isTradingTime =
        (hours === 9 && minutes >= 30) ||
        (hours === 10) ||
        (hours === 11 && minutes <= 30) ||
        (hours === 13) ||
        (hours === 14) ||
        (hours === 15 && minutes === 0);

      setStatus((prev) => ({
        ...prev,
        isMonitoring: true, // 监控器总是运行的
        tradingTime: isTradingTime,
        lastCheck: chinaTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      }));
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // 每分钟更新一次

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 dark:border-blue-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                实时监控状态
              </CardTitle>
              <CardDescription className="text-xs">
                交易时间内实时监控持仓，触发买/卖点时即时推送
              </CardDescription>
            </div>
            <Badge variant={status.tradingTime ? "default" : "secondary"}>
              {status.tradingTime ? "交易中" : "非交易时间"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm">实时监控已启用</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">上次检查</p>
              <p className="font-medium">{status.lastCheck || "等待中..."}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">检查频率</p>
              <p className="font-medium">{status.tradingTime ? "每分钟（交易时间）" : "已暂停（非交易时间）"}</p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs mb-2">监控内容</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <Activity className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">股价监控</span>
                  <span className="text-muted-foreground ml-1">：获取每只股票的实时价格（当前价和开盘价）</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <Clock className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">交易时间判断</span>
                  <span className="text-muted-foreground ml-1">：判断当前是否在 A 股交易时间内（9:30-11:30、13:00-15:00）</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <TrendingUp className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">涨跌幅计算</span>
                  <span className="text-muted-foreground ml-1">：计算当日涨跌幅（主要）和成本涨跌幅（次要）</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs mb-2">触发条件</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <TrendingUp className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span>整体盈利目标</span>
                  <span className="text-muted-foreground ml-1">：达到目标收益率（如20%）时提醒</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <TrendingDown className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span>风险控制</span>
                  <span className="text-muted-foreground ml-1">：整体亏损超过10%时提醒止损</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span>个股异动</span>
                  <span className="text-muted-foreground ml-1">：单日涨跌超过5%时触发提醒</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <Calendar className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span>定期复盘</span>
                  <span className="text-muted-foreground ml-1">：每周五14:30自动复盘推送</span>
                </div>
              </div>
            </div>
          </div>

          {status.tradingTime && (
            <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-900 dark:text-blue-100">
                当前为交易时间，系统每分钟检查持仓价格，达到条件时将立即推送提醒
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 报告推送逻辑说明 */}
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          报告推送逻辑
        </CardTitle>
        <CardDescription className="text-xs">
          系统支持三种类型的报告，分别通过手动触发和定时推送两种方式获取
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 市场热点报告 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
            <h4 className="text-sm font-semibold">市场热点报告</h4>
          </div>
          <div className="pl-4 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">手动触发：</span>
              <span>点击"发现热点"按钮</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">定时推送：</span>
              <span>每天 9:30 盘前自动推送</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">推送内容：</span>
              <span>今日市场热点板块分析</span>
            </div>
          </div>
        </div>

        {/* 持仓分析报告 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <h4 className="text-sm font-semibold">持仓分析报告</h4>
          </div>
          <div className="pl-4 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">手动触发：</span>
              <span>点击"生成持仓分析报告"按钮</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">定时推送：</span>
              <span>每天 21:30 盘后自动推送</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">推送内容：</span>
              <span>当日持仓状况分析</span>
            </div>
          </div>
        </div>

        {/* 持仓监控 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-orange-500"></div>
            <h4 className="text-sm font-semibold">持仓监控</h4>
          </div>
          <div className="pl-4 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">推送方式：</span>
              <span>自动监控并触发到飞书</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">触发条件：</span>
              <span>达到盈利目标 / 亏损超过10% / 个股异动 / 周五复盘</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">推送内容：</span>
              <span>简短有力的个股操作建议</span>
            </div>
          </div>
        </div>

        {/* 实际更新和推送记录 */}
        <div className="pt-2 border-t">
          <h4 className="text-sm font-semibold mb-2">实际更新和推送记录</h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-md">
              <div className="flex items-center justify-between">
                <span className="font-medium">最新报告更新：</span>
                <span className="text-muted-foreground">查看"投资建议"标签页</span>
              </div>
              <p className="text-muted-foreground mt-1">所有报告的记录和推送历史都保存在"投资建议"页面中，包括市场热点、持仓分析、持仓监控等。</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
