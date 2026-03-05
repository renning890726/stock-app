import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Switch } from '../ui/switch';
import { Settings, Bell, Database, Bot } from 'lucide-react';

export const SystemConfig = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="mr-2 h-5 w-5" /> AI 模型配置
          </CardTitle>
          <CardDescription>选择用于生成分析报告和投资建议的 AI 模型</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>首选模型</Label>
              <Select defaultValue="doubao">
                <SelectTrigger>
                  <SelectValue placeholder="选择分析模型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doubao">豆包 (Doubao-seed-1-8-251228)</SelectItem>
                  <SelectItem value="gpt4">GPT-4 (OpenAI)</SelectItem>
                  <SelectItem value="claude">Claude 3.5 Sonnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key (可选)</Label>
              <Input id="api-key" type="password" placeholder="如果是自定义模型，请填入 Key" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="auto-analysis" />
            <Label htmlFor="auto-analysis">启用每日自动分析 (每日 18:00 生成)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" /> 飞书通知配置
          </CardTitle>
          <CardDescription>配置消息推送机器人</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input id="webhook-url" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secret">签名密钥 (Secret)</Label>
            <Input id="secret" type="password" placeholder="安全校验密钥" />
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center space-x-2">
              <Switch id="enable-push" defaultChecked />
              <Label htmlFor="enable-push">启用推送</Label>
            </div>
            <Button variant="secondary" size="sm">测试连接</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" /> 数据管理
          </CardTitle>
          <CardDescription>备份与恢复</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">导出配置</Button>
            <Button variant="outline" className="flex-1">导入配置</Button>
          </div>
          <Button variant="destructive" className="w-full">重置所有数据</Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" /> 系统状态概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-muted-foreground mb-1">数据库连接</span>
              <span className="text-green-600 font-bold flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                正常 (PostgreSQL)
              </span>
            </div>
            <div className="p-4 border rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-muted-foreground mb-1">行情数据源</span>
              <span className="text-green-600 font-bold flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                Akshare (API)
              </span>
            </div>
            <div className="p-4 border rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-muted-foreground mb-1">定时任务</span>
              <span className="text-green-600 font-bold flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                运行中 (3 个任务)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};