"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PieChart } from "lucide-react";

interface Holding {
  id: string;
  stockName: string;
  stockCode: string;
  quantity: number;
  costPrice: number;
  currentPrice?: number;
}

interface HoldingDistributionProps {
  holdings: Holding[];
}

export function HoldingDistribution({ holdings }: HoldingDistributionProps) {
  // 计算总市值
  const totalMarketValue = holdings.reduce((sum, h) => {
    const price = h.currentPrice || h.costPrice;
    return sum + h.quantity * price;
  }, 0);

  // 计算重仓股票（按持仓市值排序的前3名）
  const topHoldings = holdings
    .map(h => {
      const currentPrice = h.currentPrice || h.costPrice;
      return {
        ...h,
        marketValue: h.quantity * currentPrice,
        percentage: totalMarketValue > 0 ? (h.quantity * currentPrice / totalMarketValue * 100) : 0
      };
    })
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 3);

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            持仓分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>暂无持仓数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              持仓分布
            </CardTitle>
            <CardDescription>
              重仓前3名（按持仓市值排序）
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            共 {holdings.length} 只股票
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topHoldings.map((holding, index) => (
            <div key={holding.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{holding.stockName}</div>
                    <div className="text-sm text-muted-foreground">{holding.stockCode}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">¥{holding.marketValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-sm text-muted-foreground">
                    {holding.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <Progress value={holding.percentage} className="h-2" />
            </div>
          ))}
          <div className="pt-2 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">总市值：</span>
              <span className="font-semibold">
                ¥{totalMarketValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">重仓占比：</span>
              <span className="font-semibold">
                {topHoldings.reduce((sum, h) => sum + h.percentage, 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
