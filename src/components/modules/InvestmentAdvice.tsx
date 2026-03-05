import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Bot, Search, RefreshCcw } from 'lucide-react';

export const InvestmentAdvice = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">AI 投资参谋</h2>
        <div className="space-x-2">
          <Button variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" /> 刷新市场
          </Button>
          <Button>
            <Bot className="mr-2 h-4 w-4" /> 生成日报
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="mr-2 h-5 w-5" /> 市场概况 (第一轮搜索)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">上证指数：3050.23 (+0.5%) | 成交额：9800亿</p>
              <p>热点板块：人工智能、半导体、新能源汽车</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bot className="mr-2 h-5 w-5" /> 智能操作建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between items-center p-2 bg-muted rounded-md">
                <span>AAPL (苹果)</span>
                <span className="text-green-600 font-bold">建议买入</span>
              </li>
              <li className="flex justify-between items-center p-2 bg-muted rounded-md">
                <span>TSLA (特斯拉)</span>
                <span className="text-yellow-600 font-bold">建议持有</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>深度分析报告</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] border rounded-md p-4 bg-muted/10 overflow-y-auto">
            <p className="text-sm leading-relaxed">
              [豆包 LLM 生成的分析内容占位符]
              <br/><br/>
              基于最新的技术面分析，AAPL 股价已突破 20 日均线，MACD 指标出现金叉信号。
              结合市场情绪分析，近期科技股板块资金流入明显...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};