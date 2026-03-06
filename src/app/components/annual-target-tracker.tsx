"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { HoldingDistribution } from "@/app/components/holding-distribution";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  FileText,
} from "lucide-react";

interface AnnualTargetData {
  overview: {
    annualTarget: number;
    currentReturn: number;
    targetProgress: number;
    initialCapital: number;
    currentTotalValue: number;
    totalProfit: number;
    maxDrawdown: number;
  };
  performance: {
    totalValue: number;
    totalCost: number;
    cash: number;
    profitRate: number;
    annualReturn: number;
  };
  holdings: {
    count: number;
    totalValue: number;
    stocks: any[];
  };
}

export function AnnualTargetTracker() {
  const [data, setData] = useState<AnnualTargetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [cash, setCash] = useState<number>(0);
  const [hotTopicReport, setHotTopicReport] = useState<string>("");
  const [portfolioReport, setPortfolioReport] = useState<string>("");

  const loadData = async () => {
    try {
      const response = await fetch("/api/annual-target");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("加载年度目标数据失败:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserConfig = async () => {
    try {
      const response = await fetch("/api/user-config/latest");
      if (response.ok) {
        const config = await response.json();
        if (config && config.cash !== undefined) {
          setCash(config.cash);
        }
      }
    } catch (error) {
      console.error("加载用户配置失败:", error);
    }
  };

  const saveCash = async (value: number) => {
    try {
      const response = await fetch("/api/user-config/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cash: value,
        }),
      });

      if (response.ok) {
        toast.success("现金金额已保存");
      } else {
        throw new Error("保存失败");
      }
    } catch (error) {
      toast.error("保存失败，请稍后重试");
    }
  };

  const handleCashChange = (value: number) => {
    setCash(value);
    saveCash(value);
  };

  useEffect(() => {
    loadData();
    loadUserConfig();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDiscoverHotTopics = async () => {
    setDiscovering(true);
    try {
      const response = await fetch("/api/hot-topics/discover", {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        toast.success(`成功发现 ${result.discoveredCount || result.topics?.length || 0} 个热点板块`);
        setHotTopicReport(result.report || "");
        // 刷新数据
        loadData();
      } else {
        throw new Error("发现热点失败");
      }
    } catch (error: any) {
      toast.error(error.message || "发现热点失败，请稍后重试");
    } finally {
      setDiscovering(false);
    }
  };

  const handleOptimizePortfolio = async () => {
    setOptimizing(true);
    try {
      const response = await fetch("/api/recommendations/report", {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        toast.success("持仓分析报告已生成并推送到飞书群");
        setPortfolioReport(result.content || "");
        // 刷新数据
        loadData();
      } else {
        throw new Error("生成持仓分析报告失败");
      }
    } catch (error: any) {
      toast.error(error.message || "生成持仓分析报告失败，请稍后重试");
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">暂无数据</div>
        </CardContent>
      </Card>
    );
  }

  const { overview, performance, holdings } = data;

  // 安全检查：确保数值存在
  const safeTotalValue = Number(performance.totalValue) || 0;
  const safeCash = Number(cash) || 0;
  const safeInitialCapital = Number(overview.initialCapital) || 0;
  const safeTotalCost = Number(performance.totalCost) || 0;

  // 计算总资产（持仓市值 + 现金）
  const totalAssets = safeTotalValue + safeCash;

  // 直接使用后端返回的收益率和利润（基于初始资金计算）
  const currentReturn = Number(overview.currentReturn) || 0;
  const totalProfit = Number(overview.totalProfit) || 0;

  const isPositiveReturn = currentReturn >= 0;
  const annualTarget = overview.annualTarget || 0;
  
  // 修复进度判断逻辑：
  // 1. 去掉不合理的月度平均分摊假设（投资收益不是均匀的）
  // 2. 改为更合理的判断：只要当前收益 >= 0，就认为进度正常
  //    或者设置一个更宽松的阈值（如年度目标的20%），避免过于严格
  const progressThreshold = annualTarget * 0.2; // 设置为年度目标的20%作为阈值
  const isOnTrack = annualTarget > 0 && (overview.currentReturn >= 0 || overview.targetProgress >= progressThreshold);

  return (
    <div className="space-y-4">
      {/* 总览卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                年度交易目标
              </CardTitle>
              <CardDescription>2026年度收益目标跟踪</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 目标进度 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">目标完成度</span>
              <Badge variant={isOnTrack ? "default" : "secondary"}>
                {isOnTrack ? "进度正常" : "进度滞后"}
              </Badge>
            </div>
            <Progress value={Math.min(overview.targetProgress || 0, 100)} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>目标: {(overview.annualTarget || 0)}%</span>
              <span>当前: {Number(overview.currentReturn).toFixed(2)}%</span>
              <span>进度: {(overview.targetProgress || 0).toFixed(1)}%</span>
            </div>
          </div>

          {/* 关键指标 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">当前收益</p>
              <p className={`text-2xl font-bold ${isPositiveReturn ? "text-green-600" : "text-red-600"}`}>
                {isPositiveReturn ? "+" : ""}{currentReturn.toFixed(2)}%
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {isPositiveReturn ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span>¥{Math.abs(totalProfit).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">持仓市值</p>
              <p className="text-2xl font-bold">
                ¥{safeTotalValue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                实时价格 × 持股数
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">总仓位</p>
              <p className="text-2xl font-bold">
                ¥{safeTotalCost.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                从投资目标设置中获取
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">持仓数量</p>
              <p className="text-2xl font-bold">
                {holdings.count || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                总计 ¥{(holdings.totalValue || 0).toLocaleString()}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">最大回撤</p>
              <p className="text-2xl font-bold">
                {(overview.maxDrawdown || 0).toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground">
                当前: {currentReturn.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* 资产配置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cash-input" className="text-sm font-medium">
                现金（元）
              </Label>
              <Input
                id="cash-input"
                type="number"
                min="0"
                step="1000"
                value={cash === 0 ? '' : cash}
                onChange={(e) => handleCashChange(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="输入现金金额"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                当前账户可用现金
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                总资产（元）
              </Label>
              <div className="h-10 px-3 flex items-center bg-muted rounded-md">
                <span className="text-2xl font-bold">
                  ¥{Number(totalAssets).toFixed(2).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                总市值 + 现金
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 持仓分布 */}
      <HoldingDistribution holdings={holdings.stocks} />

      {/* 快捷操作 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">发现热点</CardTitle>
            <CardDescription className="text-xs">
              发现并跟踪当前市场热点板块
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
              size="sm"
              onClick={handleDiscoverHotTopics}
              disabled={discovering}
            >
              <Target className="mr-2 h-4 w-4" />
              {discovering ? "发现中..." : "发现热点"}
            </Button>
            {hotTopicReport && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full" size="sm" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    查看热点报告
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>热点分析报告</DialogTitle>
                    <DialogDescription>
                      当前市场热点板块和趋势分析
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">{hotTopicReport}</pre>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">持仓分析报告</CardTitle>
            <CardDescription className="text-xs">
              基于现有仓位和当日市场情况，生成详细的持仓分析报告
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
              size="sm"
              onClick={handleOptimizePortfolio}
              disabled={optimizing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${optimizing ? "animate-spin" : ""}`} />
              {optimizing ? "生成中..." : "生成持仓分析报告"}
            </Button>
            {portfolioReport && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full" size="sm" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    查看调仓建议
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>调仓技术建议</DialogTitle>
                    <DialogDescription>
                      基于现有仓位和年度目标的技术分析
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm">{portfolioReport}</pre>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
