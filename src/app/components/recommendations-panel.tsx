"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus, FileText, Target, Activity, BarChart3, CheckCircle2, AlertCircle, Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";

interface Recommendation {
  id: string;
  type: string;
  content: string;
  explanation: string;
  action: string | null;
  relatedStock: string | null;
  sources: string | null;
  createdAt: string | Date;
}

export function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "hot" | "report" | "alert">("all");

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // 折叠状态
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 实时监控状态
  const [monitorStatus, setMonitorStatus] = useState({
    isMonitoring: true,
    tradingTime: false,
    lastCheck: null as string | null,
  });

  // 加载历史建议
  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/recommendations");
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error("加载建议失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  // 更新实时监控状态
  useEffect(() => {
    const updateMonitorStatus = () => {
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

      setMonitorStatus({
        isMonitoring: true,
        tradingTime: isTradingTime,
        lastCheck: chinaTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      });
    };

    updateMonitorStatus();
    const interval = setInterval(updateMonitorStatus, 60000); // 每分钟更新一次

    return () => clearInterval(interval);
  }, []);

  // 发现市场热点
  const discoverHotTopics = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/hot-topics/discover", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("市场热点已发现");
        loadRecommendations();
      } else {
        const error = await response.json();
        throw new Error(error.message || "发现失败");
      }
    } catch (error: any) {
      toast.error(error.message || "发现失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // 生成持仓分析报告
  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/recommendations/report", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("持仓分析报告已生成");
        loadRecommendations();
      } else {
        const error = await response.json();
        throw new Error(error.message || "生成失败");
      }
    } catch (error: any) {
      toast.error(error.message || "生成失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // 手动触发持仓监控
  const triggerMonitor = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/recommendations/monitor", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.triggered) {
          toast.success("实时监控已触发，建议已生成");
        } else if (data.skipped) {
          toast.info("检测到相似推送，已跳过重复内容");
        } else {
          toast.info(data.reason || "当前未达到触发条件");
        }
        loadRecommendations();
      } else {
        const error = await response.json();
        throw new Error(error.message || "触发失败");
      }
    } catch (error: any) {
      toast.error(error.message || "触发失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const getActionIcon = (action: string | null) => {
    switch (action) {
      case "buy":
        return <TrendingUp className="h-4 w-4" />;
      case "sell":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getActionBadge = (action: string | null) => {
    switch (action) {
      case "buy":
        return <Badge className="bg-green-500 hover:bg-green-600">买入</Badge>;
      case "sell":
        return <Badge className="bg-red-500 hover:bg-red-600">卖出</Badge>;
      case "hold":
        return <Badge variant="secondary">持有</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === "hot") {
      return <Badge className="bg-purple-500 hover:bg-purple-600 text-xs">市场热点</Badge>;
    }
    if (type === "alert") {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">实时监控</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600 text-xs">持仓分析</Badge>;
  };

  const getSourceFromExplanation = (explanation: string | null) => {
    if (!explanation) return null;

    if (explanation.includes('【发现热点】')) {
      return <Badge className="bg-purple-500 hover:bg-purple-600 text-xs">发现热点</Badge>;
    } else if (explanation.includes('【持仓优化】') || explanation.includes('【持仓分析】')) {
      return <Badge className="bg-green-500 hover:bg-green-600 text-xs">持仓分析</Badge>;
    } else if (explanation.includes('【定时报告】')) {
      return <Badge className="bg-cyan-500 hover:bg-cyan-600 text-xs">定时报告</Badge>;
    } else if (explanation.includes('【手动报告】')) {
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">手动报告</Badge>;
    }
    return null;
  };

  const getReportTitle = (rec: Recommendation) => {
    const source = getSourceFromExplanation(rec.explanation);
    if (source) {
      return (
        <div className="flex items-center gap-2">
          {source}
          <span>报告内容</span>
        </div>
      );
    }
    return "报告内容";
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (activeTab === "all") return true;
    return rec.type === activeTab;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredRecommendations.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecommendations = filteredRecommendations.slice(startIndex, endIndex);

  // 切换展开/折叠
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 获取摘要内容（前100个字符）
  const getSummary = (content: string) => {
    if (content.length <= 100) return content;
    return content.substring(0, 100) + "...";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI 投资建议
          </CardTitle>
          <CardDescription>
            三类智能报告：市场热点、持仓分析、实时监控
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 生成按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={discoverHotTopics}
              disabled={isGenerating}
              variant="outline"
              className="border-purple-200 dark:border-purple-900 hover:bg-purple-50 dark:hover:bg-purple-950"
            >
              <Target className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
              发现热点
            </Button>
            <Button
              onClick={generateReport}
              disabled={isGenerating}
              variant="outline"
              className="border-green-200 dark:border-green-900 hover:bg-green-50 dark:hover:bg-green-950"
            >
              <FileText className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
              生成持仓分析
            </Button>
            <Button
              onClick={triggerMonitor}
              disabled={isGenerating}
              variant="outline"
              className="border-orange-200 dark:border-orange-900 hover:bg-orange-50 dark:hover:bg-orange-950"
            >
              <Activity className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
              触发实时监控
            </Button>
          </div>

          {/* 类型筛选 */}
          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v as any);
            setCurrentPage(1); // 切换Tab时重置页码
          }}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                <Sparkles className="mr-2 h-4 w-4" />
                全部
              </TabsTrigger>
              <TabsTrigger value="hot">
                <Target className="mr-2 h-4 w-4" />
                市场热点
              </TabsTrigger>
              <TabsTrigger value="report">
                <FileText className="mr-2 h-4 w-4" />
                持仓分析
              </TabsTrigger>
              <TabsTrigger value="alert">
                <Activity className="mr-2 h-4 w-4" />
                实时监控
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  <p>加载中...</p>
                </div>
              ) : filteredRecommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无投资建议，点击上方按钮生成</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 报告列表 - 固定高度可滚动 */}
                  <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
                    {paginatedRecommendations.map((rec) => (
                      <Collapsible
                        key={rec.id}
                        open={expandedItems.has(rec.id)}
                        onOpenChange={() => toggleExpand(rec.id)}
                      >
                        <div className="border rounded-lg p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getTypeBadge(rec.type)}
                              {rec.type === "alert" && getActionIcon(rec.action)}
                              {rec.type === "alert" && getActionBadge(rec.action)}
                              {rec.relatedStock && (
                                <Badge variant="outline">{rec.relatedStock}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatDate(rec.createdAt)}
                              </span>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  {expandedItems.has(rec.id) ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-1">
                              {rec.type === "alert" ? "监控内容" : getReportTitle(rec)}
                            </h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {expandedItems.has(rec.id) ? rec.content : getSummary(rec.content)}
                            </p>
                          </div>

                          <CollapsibleContent className="space-y-3">
                            {rec.sources && (
                              <div>
                                <h4 className="font-medium mb-1">信源</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {rec.sources}
                                </p>
                              </div>
                            )}

                            {rec.explanation && (
                              <div>
                                <h4 className="font-medium mb-1">
                                  {rec.type === "alert" ? "触发原因" : "说明"}
                                </h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {rec.explanation}
                                </p>
                              </div>
                            )}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>

                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className="flex justify-center pt-4 border-t">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}

                  {/* 显示统计信息 */}
                  <div className="text-sm text-muted-foreground text-center">
                    共 {filteredRecommendations.length} 条记录，第 {currentPage} / {totalPages} 页
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 实时监控状态和报告推送逻辑 - 使用手风琴布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 实时监控状态 */}
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
              <Badge variant={monitorStatus.tradingTime ? "default" : "secondary"}>
                {monitorStatus.tradingTime ? "交易中" : "非交易时间"}
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
                <p className="font-medium">{monitorStatus.lastCheck || "等待中..."}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">检查频率</p>
                <p className="font-medium">{monitorStatus.tradingTime ? "每分钟（交易时间）" : "已暂停（非交易时间）"}</p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-2">监控内容</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <Activity className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">股价监控</span>
                    <span className="text-muted-foreground ml-1">：获取实时价格（当前价和开盘价）</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <Clock className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">交易时间判断</span>
                    <span className="text-muted-foreground ml-1">：判断是否在交易时间内（9:30-11:30、13:00-15:00）</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <TrendingUp className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">涨跌幅计算</span>
                    <span className="text-muted-foreground ml-1">：计算当日涨跌幅和成本涨跌幅</span>
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
                    <span className="text-muted-foreground ml-1">：达到目标收益率时提醒</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <TrendingDown className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span>风险控制</span>
                    <span className="text-muted-foreground ml-1">：亏损超过10%时提醒止损</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span>个股异动</span>
                    <span className="text-muted-foreground ml-1">：单日涨跌超过5%时触发</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <Calendar className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span>定期复盘</span>
                    <span className="text-muted-foreground ml-1">：每周五14:30自动复盘</span>
                  </div>
                </div>
              </div>
            </div>

            {monitorStatus.tradingTime && (
              <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  当前为交易时间，系统每分钟检查持仓价格，达到条件时将立即推送提醒
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 报告推送逻辑 */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              报告推送逻辑
            </CardTitle>
            <CardDescription className="text-xs">
              三类报告的触发方式和推送内容
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
                  <span className="text-muted-foreground">触发：</span>
                  <span>手动 / 每天9:30定时</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">内容：</span>
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
                  <span className="text-muted-foreground">触发：</span>
                  <span>手动 / 每天21:30定时</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">内容：</span>
                  <span>当日持仓状况分析</span>
                </div>
              </div>
            </div>

            {/* 实时监控 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                <h4 className="text-sm font-semibold">实时监控</h4>
              </div>
              <div className="pl-4 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">触发：</span>
                  <span>交易时间内每分钟监控</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">条件：</span>
                  <span>盈亏目标/异动/复盘</span>
                </div>
              </div>
            </div>

            {/* 提示 */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                💡 所有报告记录保存在上方列表中，点击卡片可查看详情
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
