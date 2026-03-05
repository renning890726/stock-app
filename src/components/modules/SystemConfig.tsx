import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Settings, Bell, Database } from 'lucide-react';

export const SystemConfig = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" /> 飞书 Webhook 配置
          </CardTitle>
          <CardDescription>配置飞书机器人以接收实时推送通知</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input id="webhook-url" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secret">签名密钥 (Secret)</Label>
            <Input id="secret" type="password" placeholder="可选安全配置" />
          </div>
          <Button variant="secondary">测试连接</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" /> 数据管理
          </CardTitle>
          <CardDescription>导入/导出系统配置和持仓数据</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline">导出数据 (JSON)</Button>
          <Button variant="outline">导入数据</Button>
          <Button variant="destructive">重置系统</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" /> 系统状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">数据库连接</span>
              <span className="text-green-600 font-medium">正常 (PostgreSQL)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Redis 缓存</span>
              <span className="text-green-600 font-medium">已连接</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">定时任务守护</span>
              <span className="text-green-600 font-medium">运行中 (PID: 1234)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};