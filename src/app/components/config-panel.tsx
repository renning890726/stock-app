"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Bot, Webhook } from "lucide-react";
import { SchedulerInfo } from "@/components/scheduler-info";

export function Config() {
  const [isLoading, setIsLoading] = useState(false);
  const [llmModel, setLlmModel] = useState<string>("doubao-seed-1-8-251228");
  const [feishuWebhookUrl, setFeishuWebhookUrl] = useState<string>("");

  // 加载现有配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch("/api/user-config/latest");
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setLlmModel(data.llmModel || "doubao-seed-1-8-251228");
          setFeishuWebhookUrl(data.feishuWebhookUrl || "");
        }
      }
    } catch (error) {
      console.error("加载配置失败:", error);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      // 先获取现有配置
      const latestResponse = await fetch("/api/user-config/latest");
      if (!latestResponse.ok) {
        throw new Error("请先在目标设置页面配置投资目标");
      }

      const latestData = await latestResponse.json();
      if (!latestData || !latestData.id) {
        throw new Error("请先在目标设置页面配置投资目标");
      }

      // 更新配置
      const response = await fetch("/api/user-config/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          llmModel,
          feishuWebhookUrl: feishuWebhookUrl || null,
        }),
      });

      if (response.ok) {
        toast.success("系统配置已更新");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "保存失败");
      }
    } catch (error: any) {
      console.error("保存配置失败:", error);
      toast.error(error.message || "保存失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const testWebhook = async () => {
    if (!feishuWebhookUrl) {
      toast.error("请先输入 Webhook URL");
      return;
    }

    try {
      const response = await fetch("/api/test-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ webhookUrl: feishuWebhookUrl }),
      });

      if (response.ok) {
        toast.success("飞书 Webhook 连接正常！请检查飞书群消息");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "测试失败");
      }
    } catch (error: any) {
      console.error("测试 Webhook 失败:", error);
      toast.error(error.message || "请检查 Webhook URL 是否正确");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>系统配置</CardTitle>
        <CardDescription>
          配置 AI 模型和消息推送设置
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* LLM 模型选择 */}
        <div className="space-y-2">
          <Label htmlFor="llm-model">
            <Bot className="inline h-4 w-4 mr-1" />
            AI 模型选择
          </Label>
          <Select value={llmModel} onValueChange={setLlmModel}>
            <SelectTrigger id="llm-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="doubao-seed-1-8-251228">豆包 Seed 1.8 (推荐)</SelectItem>
              <SelectItem value="doubao-seed-1-6-flash-250615">豆包 Flash (快速)</SelectItem>
              <SelectItem value="deepseek-v3-2-251201">DeepSeek V3.2</SelectItem>
              <SelectItem value="deepseek-r1-250528">DeepSeek R1 (推理)</SelectItem>
              <SelectItem value="kimi-k2-250905">Kimi K2</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            选择用于生成投资建议的 AI 模型
          </p>
        </div>

        {/* 飞书 Webhook 配置 */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url">
            <Webhook className="inline h-4 w-4 mr-1" />
            飞书群 Webhook URL
          </Label>
          <Input
            id="webhook-url"
            type="url"
            value={feishuWebhookUrl}
            onChange={(e) => setFeishuWebhookUrl(e.target.value)}
            placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
          />
          <p className="text-sm text-muted-foreground">
            配置后，投资建议将自动推送到飞书群
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={testWebhook}
              disabled={!feishuWebhookUrl}
            >
              测试连接
            </Button>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="pt-4">
          <Button onClick={saveConfig} disabled={isLoading} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "保存中..." : "保存配置"}
          </Button>
        </div>

        {/* 使用说明 */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">飞书群机器人配置说明</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>在飞书群设置中添加自定义机器人</li>
            <li>获取机器人的 Webhook URL</li>
            <li>将 URL 填入上方输入框并测试</li>
            <li>保存配置后，建议将自动推送到飞书群</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
