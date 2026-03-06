'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestHotTopicsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const testPush = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/recommendations/hot-topics/push', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '推送失败');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🧪 热点推送测试</h1>
        <p className="text-muted-foreground">
          手动触发热点分析推送，测试飞书配置是否正常
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>触发推送</CardTitle>
          <CardDescription>
            点击下方按钮手动触发热点分析推送
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={testPush}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? '🔄 推送中...' : '📤 触发热点推送'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">❌ 错误</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-600">✅ 推送成功</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>消息:</strong> {result.message}</p>
              <p><strong>热点数量:</strong> {result.topicCount}</p>
              <p><strong>推送时间:</strong> {new Date(result.pushedAt).toLocaleString('zh-CN')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>📋 当前定时任务配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>每日持仓分析报告:</strong> 21:30</p>
            <p><strong>持仓实时监控:</strong> 每分钟</p>
            <p><strong>盘前热点推送:</strong> 09:30</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
