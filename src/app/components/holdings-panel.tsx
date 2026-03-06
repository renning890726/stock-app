"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, AlertCircle, Clock, LineChart, Newspaper } from "lucide-react";

interface Holding {
  id: string;
  stockName: string;
  stockCode: string;
  quantity: number;
  costPrice: number;
  currentPrice?: number;
  priceSource?: 'real' | 'cached' | 'cost' | 'simulate' | 'error' | 'akshare' | 'sina' | 'eastmoney' | 'search';
  createdAt: string | Date;
}

export function Holdings() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  // 内联编辑状态
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'quantity' } | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  // 手动编辑价格状态
  const [isPriceEditDialogOpen, setIsPriceEditDialogOpen] = useState(false);
  const [editingPriceHolding, setEditingPriceHolding] = useState<Holding | null>(null);
  const [manualPrice, setManualPrice] = useState<number>(0);

  // 股票分析状态
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [analyzingHolding, setAnalyzingHolding] = useState<Holding | null>(null);
  const [stockAnalysis, setStockAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 表单状态
  const [stockName, setStockName] = useState("");
  const [stockCode, setStockCode] = useState("");
  const [quantity, setQuantity] = useState<number>(0);

  // 加载持仓列表
  const loadHoldings = async () => {
    setIsInitialLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/holdings");
      if (response.ok) {
        const data = await response.json();
        setHoldings(data);
      } else {
        throw new Error("加载持仓失败");
      }
    } catch (error) {
      console.error("加载持仓失败:", error);
      setLoadError("加载持仓失败，请刷新页面重试");
      toast.error("加载持仓失败");
    } finally {
      setIsInitialLoading(false);
    }
  };

  // 刷新实时股价
  const refreshPrices = async () => {
    setRefreshingPrices(true);
    try {
      const response = await fetch("/api/holdings");
      if (response.ok) {
        const data = await response.json();
        setHoldings(data);
        toast.success("股价已更新");
      }
    } catch (error) {
      toast.error("更新股价失败");
    } finally {
      setRefreshingPrices(false);
    }
  };

  // 打开手动编辑价格对话框
  const openPriceEditDialog = (holding: Holding) => {
    setEditingPriceHolding(holding);
    setManualPrice(holding.currentPrice || holding.costPrice);
    setIsPriceEditDialogOpen(true);
  };

  // 保存手动输入的价格
  const saveManualPrice = async () => {
    if (!editingPriceHolding || manualPrice <= 0) {
      toast.error("请输入有效的价格");
      return;
    }

    try {
      const response = await fetch(`/api/holdings/${editingPriceHolding.id}/update-price`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPrice: manualPrice }),
      });

      if (response.ok) {
        toast.success("股价已更新");
        setIsPriceEditDialogOpen(false);
        setEditingPriceHolding(null);
        setManualPrice(0);
        // 清除缓存并重新加载
        await fetch("/api/price-cache/clear", { method: "POST" });
        loadHoldings();
      } else {
        throw new Error("更新失败");
      }
    } catch (error) {
      toast.error("更新失败，请稍后重试");
    }
  };

  // 打开股票分析对话框
  const openAnalysisDialog = async (holding: Holding) => {
    setAnalyzingHolding(holding);
    setIsAnalysisDialogOpen(true);
    setStockAnalysis(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch(`/api/stock-analysis?stockCode=${holding.stockCode}&stockName=${holding.stockName}`);
      if (response.ok) {
        const data = await response.json();
        setStockAnalysis(data);
      } else {
        toast.error("获取分析数据失败");
      }
    } catch (error) {
      toast.error("获取分析数据失败");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    loadHoldings();
  }, []);

  // 打开编辑对话框
  const openEditDialog = (holding: Holding) => {
    setEditingHolding(holding);
    setStockName(holding.stockName);
    setStockCode(holding.stockCode);
    setQuantity(holding.quantity);
    setIsDialogOpen(true);
  };

  // 关闭对话框并重置表单
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingHolding(null);
    setStockName("");
    setStockCode("");
    setQuantity(0);
  };

  // 开始内联编辑
  const startInlineEdit = (holding: Holding, field: 'quantity') => {
    setEditingCell({ id: holding.id, field });
    setEditValue(holding.quantity);
  };

  // 保存内联编辑
  const saveInlineEdit = async () => {
    if (!editingCell) return;

    const holding = holdings.find(h => h.id === editingCell.id);
    if (!holding) return;

    if (editValue <= 0) {
      toast.error("值必须大于0");
      setEditingCell(null);
      return;
    }

    try {
      const updateData = editingCell.field === 'quantity'
        ? { quantity: editValue }
        : { costPrice: editValue };

      const response = await fetch(`/api/holdings/${holding.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success("更新成功");
        loadHoldings();
      } else {
        throw new Error("更新失败");
      }
    } catch (error) {
      toast.error("更新失败，请稍后重试");
    } finally {
      setEditingCell(null);
    }
  };

  // 取消内联编辑
  const cancelInlineEdit = () => {
    setEditingCell(null);
    setEditValue(0);
  };

  // 添加或更新持仓
  const saveHolding = async () => {
    if (!stockName || !stockCode || quantity <= 0) {
      toast.error("请填写完整的持仓信息");
      return;
    }

    setIsLoading(true);
    try {
      const url = editingHolding
        ? `/api/holdings/${editingHolding.id}`
        : "/api/holdings";

      const method = editingHolding ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockName,
          stockCode,
          quantity,
        }),
      });

      if (response.ok) {
        const action = editingHolding ? "更新" : "添加";
        toast.success(`${action}成功 ${stockName} (${stockCode})`);
        closeDialog();
        // 重新加载列表
        loadHoldings();
      } else {
        throw new Error(`${editingHolding ? "更新" : "添加"}失败`);
      }
    } catch (error) {
      toast.error("操作失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 删除持仓
  const deleteHolding = async (id: string) => {
    if (!confirm("确定要删除这个持仓吗？")) return;

    try {
      const response = await fetch(`/api/holdings/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("持仓已删除");
        loadHoldings();
      } else {
        throw new Error("删除失败");
      }
    } catch (error) {
      toast.error("删除失败，请稍后重试");
    }
  };

  return (
    <div className="space-y-4">
      {/* 初始加载状态 */}
      {isInitialLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">正在加载持仓数据...</p>
          </CardContent>
        </Card>
      )}

      {/* 加载错误状态 */}
      {!isInitialLoading && loadError && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-red-600 dark:text-red-400 mb-4 text-4xl">⚠️</div>
            <p className="text-red-600 dark:text-red-400 mb-4">{loadError}</p>
            <Button onClick={loadHoldings} variant="outline">
              重新加载
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 正常显示 */}
      {!isInitialLoading && !loadError && (
        <>
      {/* 持仓列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>当前持仓</CardTitle>
            <CardDescription>
              管理您的股票持仓，系统将根据持仓情况生成投资建议
              {holdings.length > 0 && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  （共 {holdings.length} 只）
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={refreshPrices}
              disabled={refreshingPrices}
              title="刷新实时股价"
            >
              <RefreshCw className={`h-4 w-4 ${refreshingPrices ? "animate-spin" : ""}`} />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) closeDialog();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  添加持仓
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingHolding ? "编辑持仓" : "添加新持仓"}</DialogTitle>
                <DialogDescription>
                  {editingHolding ? "修改持仓信息" : "输入股票信息添加到您的持仓列表"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="stock-name">股票名称</Label>
                  <Input
                    id="stock-name"
                    value={stockName}
                    onChange={(e) => setStockName(e.target.value)}
                    placeholder="例如：贵州茅台"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-code">股票代码</Label>
                  <Input
                    id="stock-code"
                    value={stockCode}
                    onChange={(e) => setStockCode(e.target.value)}
                    placeholder="例如：600519"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">持有数量（股）</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity === 0 ? '' : quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="100"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={saveHolding}
                  disabled={isLoading}
                >
                  {isLoading ? (editingHolding ? "更新中..." : "添加中...") : (editingHolding ? "更新" : "添加")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 手动编辑价格对话框 */}
          <Dialog open={isPriceEditDialogOpen} onOpenChange={(open) => {
            setIsPriceEditDialogOpen(open);
            if (!open) {
              setEditingPriceHolding(null);
              setManualPrice(0);
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>手动编辑股价</DialogTitle>
                <DialogDescription>
                  为 {editingPriceHolding?.stockName} ({editingPriceHolding?.stockCode}) 输入正确的实时股价
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-price">当前股价（元）</Label>
                  <Input
                    id="manual-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualPrice === 0 ? '' : manualPrice}
                    onChange={(e) => setManualPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="52.37"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={saveManualPrice}
                >
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">暂无持仓记录</h3>
              <p className="text-muted-foreground mb-6">
                添加您的第一只股票，开始智能投资之旅
              </p>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) closeDialog();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    添加第一只股票
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加新持仓</DialogTitle>
                <DialogDescription>
                  输入股票信息添加到您的持仓列表
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="stock-name">股票名称</Label>
                  <Input
                    id="stock-name"
                    value={stockName}
                    onChange={(e) => setStockName(e.target.value)}
                    placeholder="例如：贵州茅台"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock-code">股票代码</Label>
                  <Input
                    id="stock-code"
                    value={stockCode}
                    onChange={(e) => setStockCode(e.target.value)}
                    placeholder="例如：600519"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">持有数量（股）</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity === 0 ? '' : quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="100"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={saveHolding}
                  disabled={isLoading}
                >
                  {isLoading ? "添加中..." : "添加"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        ) : (
          <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>股票名称</TableHead>
                    <TableHead>代码</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">实时股价</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((holding) => (
                    <TableRow key={holding.id}>
                      <TableCell className="font-medium">{holding.stockName}</TableCell>
                      <TableCell>{holding.stockCode}</TableCell>
                      <TableCell className="text-right">
                        {editingCell?.id === holding.id && editingCell.field === 'quantity' ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              min="1"
                              value={editValue === 0 ? '' : editValue}
                              onChange={(e) => setEditValue(e.target.value === '' ? 0 : Number(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveInlineEdit();
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  cancelInlineEdit();
                                }
                              }}
                              onBlur={saveInlineEdit}
                              className="w-24 h-8 text-right"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                            onClick={() => startInlineEdit(holding, 'quantity')}
                          >
                            {holding.quantity.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {holding.currentPrice ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center justify-end gap-1">
                              <span>¥{holding.currentPrice.toFixed(2)}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-muted/50"
                                onClick={() => openPriceEditDialog(holding)}
                                title="手动编辑股价"
                              >
                                <AlertCircle className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </div>
                            {holding.priceSource === 'cost' && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <AlertCircle className="h-2.5 w-2.5" />
                                <span>获取失败</span>
                              </div>
                            )}
                            {holding.priceSource === 'cached' && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                <span>已缓存</span>
                              </div>
                            )}
                            {holding.priceSource === 'search' && (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertCircle className="h-2.5 w-2.5" />
                                <span>搜索数据</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-muted-foreground">--</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-muted/50"
                              onClick={() => openPriceEditDialog(holding)}
                              title="手动输入股价"
                            >
                              <AlertCircle className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAnalysisDialog(holding)}
                            title="股票分析"
                          >
                            <LineChart className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteHolding(holding.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* 股票分析对话框 */}
      <Dialog open={isAnalysisDialogOpen} onOpenChange={(open) => {
        setIsAnalysisDialogOpen(open);
        if (!open) {
          setAnalyzingHolding(null);
          setStockAnalysis(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              {analyzingHolding?.stockName} ({analyzingHolding?.stockCode}) 深度分析
            </DialogTitle>
            <DialogDescription>
              包含新闻研报、实时数据、走势分析和后市展望
            </DialogDescription>
          </DialogHeader>

          {isAnalyzing ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">正在分析中，请稍候...</p>
              </div>
            </div>
          ) : stockAnalysis ? (
            <div className="space-y-6">
              {/* 基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">基本信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">股票名称</p>
                      <p className="font-semibold">{analyzingHolding?.stockName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">股票代码</p>
                      <p className="font-semibold">{analyzingHolding?.stockCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">当前价格</p>
                      <p className="font-semibold">
                        ¥{stockAnalysis.currentPrice?.toFixed(2) || '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">涨跌幅</p>
                      <p className={`font-semibold ${stockAnalysis.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stockAnalysis.changePercent !== undefined ? `${stockAnalysis.changePercent >= 0 ? '+' : ''}${stockAnalysis.changePercent.toFixed(2)}%` : '--'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 新闻研报 */}
              {stockAnalysis.news && stockAnalysis.news.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Newspaper className="h-5 w-5" />
                      新闻研报
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stockAnalysis.news.map((news: any, index: number) => (
                        <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                          <div className="flex items-start justify-between gap-2">
                            <a
                              href={news.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary flex-1 line-clamp-2"
                            >
                              {news.title}
                            </a>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {news.date}
                            </span>
                          </div>
                          {news.summary && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {news.summary}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 走势分析 */}
              {stockAnalysis.analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LineChart className="h-5 w-5" />
                      走势分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                      {stockAnalysis.analysis}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 后市展望 */}
              {stockAnalysis.outlook && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">后市展望</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                      {stockAnalysis.outlook}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 数据来源说明 */}
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                <p><strong>数据来源说明：</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>新闻研报：仅显示7天内的最新新闻，来源于实时网络搜索，仅供参考</li>
                  <li>走势分析：基于近3个月股价数据的技术面分析</li>
                  <li>分析展望：由AI基于公开数据生成，不构成投资建议</li>
                  <li>更新时间：{stockAnalysis.timestamp || new Date().toLocaleString('zh-CN')}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无分析数据</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
