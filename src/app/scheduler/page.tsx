'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SchedulerStatus {
  running: boolean;
  pid: number | null;
  tasks: {
    name: string;
    schedule: string;
    nextRun?: string;
  }[];
}

export default function SchedulerPage() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // 每5秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/scheduler/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('获取状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPush = async () => {
    try {
      const response = await fetch('/api/scheduler/test-push');
      if (response.ok) {
        alert('✅ 推送测试成功！请检查飞书是否收到消息');
      } else {
        const data = await response.json();
        alert(`❌ 推送测试失败: ${data.message}`);
      }
    } catch (error: any) {
      alert(`❌ 推送测试失败: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">⏰ 定时任务管理</h1>
        <p className="text-muted-foreground">
          管理和监控定时推送任务
        </p>
      </div>

      {/* 状态卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>守护进程状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={status?.running ? "default" : "destructive"}>
              {status?.running ? "✅ 运行中" : "❌ 已停止"}
            </Badge>
            {status?.pid && (
              <span className="text-sm text-muted-foreground">
                PID: {status.pid}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 定时任务列表 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>已注册的任务</CardTitle>
          <CardDescription>
            以下任务将自动执行（工作日）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div>
                <div className="font-semibold">⏱️ 持仓实时监控</div>
                <div className="text-sm text-muted-foreground mt-1">
                  每分钟监控持仓异动（交易时间 9:30-15:00）
                </div>
              </div>
              <Badge variant="outline">每分钟</Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div>
                <div className="font-semibold">🔥 盘前热点推送</div>
                <div className="text-sm text-muted-foreground mt-1">
                  每天上午 09:30 自动推送市场热点分析
                </div>
              </div>
              <Badge variant="outline">09:30</Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div>
                <div className="font-semibold">📊 盘后持仓分析</div>
                <div className="text-sm text-muted-foreground mt-1">
                  每天晚上 21:30 自动生成持仓分析报告
                </div>
              </div>
              <Badge variant="outline">21:30</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 测试按钮 */}
      <Card>
        <CardHeader>
          <CardTitle>测试推送</CardTitle>
          <CardDescription>
            手动触发一次推送，验证配置是否正常
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestPush} size="lg" className="w-full">
            🧪 立即测试推送
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            点击后将立即向飞书发送一条测试消息
          </p>
        </CardContent>
      </Card>

      {/* 说明 */}
      <Card className="mt-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle className="text-sm">💡 注意事项</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-1">
            <li>• 定时任务仅在**工作日**（周一至周五）执行</li>
            <li>• 时间基于**北京时间**（Asia/Shanghai）</li>
            <li>• 确保飞书 Webhook 配置正确</li>
            <li>• 如果推送失败，请检查应用日志</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
