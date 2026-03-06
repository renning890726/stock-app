import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, ExternalLink, CheckCircle2 } from "lucide-react";

export function SchedulerInfo() {
  const runDailyReport = async () => {
    try {
      toast.loading("正在生成每日报告...", { id: "daily-report" });

      const response = await fetch("/api/scheduler/run-daily-report");

      if (response.ok) {
        toast.success("每日报告已生成并推送到飞书群", { id: "daily-report" });
      } else {
        const error = await response.json();
        toast.error(error.message || "报告生成失败", { id: "daily-report" });
      }
    } catch (error) {
      toast.error("请求失败，请稍后重试", { id: "daily-report" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          定时推送设置
        </CardTitle>
        <CardDescription>
          配置每日报告的自动推送
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 当前配置 */}
        <div className="space-y-2">
          <h4 className="font-medium">当前推送时间</h4>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>每天 21:30（晚上9点半）</span>
          </div>
          <p className="text-xs text-muted-foreground">
            推送内容：每日持仓分析报告
          </p>
        </div>

        {/* 手动触发 */}
        <div className="space-y-2">
          <h4 className="font-medium">手动触发</h4>
          <Button
            onClick={runDailyReport}
            variant="outline"
            className="w-full"
          >
            立即生成并发送每日报告
          </Button>
          <p className="text-xs text-muted-foreground">
            点击按钮可立即生成报告并推送到飞书群
          </p>
        </div>

        {/* 外部cron服务 */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="font-medium">自动推送配置</h4>
          <p className="text-sm text-muted-foreground">
            为了在每天21:30自动推送报告，您可以使用外部cron服务定时调用以下接口：
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between bg-muted p-3 rounded-md">
              <code className="text-sm flex-1 overflow-hidden text-ellipsis">
                GET /api/scheduler/run-daily-report
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = `${window.location.origin}/api/scheduler/run-daily-report`;
                  navigator.clipboard.writeText(url);
                  toast.success("接口地址已复制");
                }}
              >
                复制
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="text-sm font-medium">推荐的cron服务</h5>
            <div className="space-y-2 text-sm">
              <a
                href="https://cron-job.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                cron-job.org (免费)
              </a>
              <a
                href="https://cronitor.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Cronitor (付费)
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="text-sm font-medium">cron表达式</h5>
            <div className="flex items-center justify-between bg-muted p-3 rounded-md">
              <code className="text-sm">
                30 21 * * *
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText("30 21 * * *");
                  toast.success("cron表达式已复制");
                }}
              >
                复制
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              表示每天21:30执行（时间可能需要根据时区调整）
            </p>
          </div>
        </div>

        {/* 注意事项 */}
        <div className="space-y-2 border-t pt-4">
          <h4 className="font-medium">注意事项</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>确保飞书Webhook URL已配置</li>
            <li>cron服务需要能访问您的应用地址</li>
            <li>如果应用部署在本地，可以使用内网穿透工具（如ngrok）</li>
            <li>建议先测试手动触发功能是否正常</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
