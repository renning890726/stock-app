"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { AnnualTargetTracker } from "@/app/components/annual-target-tracker";

export function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [positionAmount, setPositionAmount] = useState<number>(0);
  const [profitTarget, setProfitTarget] = useState<number>(10);
  const [tradingStyle, setTradingStyle] = useState<"short_term" | "medium_long_term">("medium_long_term");
  const [loadError, setLoadError] = useState<string | null>(null);

  // 加载现有配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsInitialLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/user-config/latest");
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setPositionAmount(data.positionAmount || 0);
          setProfitTarget(data.profitTarget);
          setTradingStyle(data.tradingStyle);
        }
      } else {
        throw new Error("加载配置失败");
      }
    } catch (error) {
      console.error("加载配置失败:", error);
      setLoadError("加载配置失败，请刷新页面重试");
      toast.error("加载配置失败");
    } finally {
      setIsInitialLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const requestData = {
        positionAmount: positionAmount || 0,
        profitTarget: profitTarget || 10,
        tradingStyle: tradingStyle || "medium_long_term",
      };

      const response = await fetch("/api/user-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        toast.success("投资目标配置已保存");
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

  return (
    <div className="space-y-4">
      {/* 初始加载状态 */}
      {isInitialLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">正在加载配置...</p>
          </CardContent>
        </Card>
      )}

      {/* 加载错误状态 */}
      {!isInitialLoading && loadError && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-red-600 dark:text-red-400 mb-4 text-4xl">⚠️</div>
            <p className="text-red-600 dark:text-red-400 mb-4">{loadError}</p>
            <Button onClick={loadConfig} variant="outline">
              重新加载
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 正常显示 */}
      {!isInitialLoading && !loadError && (
        <>
          {/* 年度目标跟踪 */}
          <AnnualTargetTracker />

          {/* 投资目标设置 */}
          <Card>
            <CardHeader>
              <CardTitle>投资目标设置</CardTitle>
              <CardDescription>
                配置您的持仓总金额、盈利目标和操作风格，系统将结合市场行情提供实时分析建议
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 仓位设置 */}
          <div className="space-y-2">
            <Label htmlFor="position">持仓总金额 (元)</Label>
            <Input
              id="position"
              type="number"
              min="0"
              step="1000"
              value={positionAmount === 0 ? '' : positionAmount}
              onChange={(e) => setPositionAmount(e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="例如：50000"
            />
            <p className="text-sm text-muted-foreground">
              当前所有持仓股票的总成本金额
            </p>
          </div>

          {/* 盈利目标 */}
          <div className="space-y-2">
            <Label htmlFor="profit">盈利目标 (%)</Label>
            <Input
              id="profit"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={profitTarget}
              onChange={(e) => setProfitTarget(e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="10"
            />
            <p className="text-sm text-muted-foreground">
              达到此盈利目标时触发卖出建议
            </p>
          </div>

          {/* 操作风格 */}
          <div className="space-y-3">
            <Label>操作风格</Label>
            <RadioGroup
              value={tradingStyle}
              onValueChange={(value) => setTradingStyle(value as "short_term" | "medium_long_term")}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="short_term" id="short" />
                <Label htmlFor="short" className="font-normal cursor-pointer">
                  短期做T
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium_long_term" id="long" />
                <Label htmlFor="long" className="font-normal cursor-pointer">
                  中长期投资
                </Label>
              </div>
            </RadioGroup>
            <p className="text-sm text-muted-foreground">
              {tradingStyle === "short_term"
                ? "适合快速进出，关注短期波动和日内交易机会"
                : "适合稳健投资，关注基本面和长期价值"}
            </p>
          </div>

          {/* 保存按钮 */}
          <div className="pt-4">
            <Button onClick={saveConfig} disabled={isLoading} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "保存中..." : "保存配置"}
            </Button>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
