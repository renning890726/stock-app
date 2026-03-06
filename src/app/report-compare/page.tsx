'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface CompareResult {
  timestamp: string;
  holdingsCount: number;
  searchCompleted: boolean;
  models: {
    doubao?: {
      name: string;
      content?: string;
      duration?: number;
      charCount?: number;
      error?: string;
      success: boolean;
    };
    gemini?: {
      name: string;
      content?: string;
      duration?: number;
      charCount?: number;
      error?: string;
      success: boolean;
    };
    qwen?: {
      name: string;
      content?: string;
      duration?: number;
      charCount?: number;
      error?: string;
      success: boolean;
    };
  };
}

export default function ReportComparePage() {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [qwenApiKey, setQwenApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  const handleCompare = async () => {
    if (!geminiApiKey && !qwenApiKey) {
      alert('请至少输入 Gemini 或通义千问的 API Key');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/recommendations/report-compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          triggerType: 'manual',
          geminiApiKey: geminiApiKey || undefined,
          qwenApiKey: qwenApiKey || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      alert(`对比失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderReport = (model: any) => {
    if (!model) return <p>未生成</p>;

    if (!model.success) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
          <p className="text-red-600 dark:text-red-400">❌ {model.error}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Badge variant="outline">⏱️ {model.duration}ms</Badge>
          <Badge variant="outline">📝 {model.charCount}字符</Badge>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-[600px] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
            {model.content}
          </pre>
        </div>
      </div>
    );
  };

  const extractPriceRange = (content: string): { buy: string; sell: string }[] => {
    if (!content) return [];
    const lines = content.split('\n');
    const results: { buy: string; sell: string }[] = [];

    lines.forEach(line => {
      const buyMatch = line.match(/买入[：:]\s*([\d.]+)/);
      const sellMatch = line.match(/卖出[：:]\s*([\d.]+)/);
      if (buyMatch && sellMatch) {
        results.push({ buy: buyMatch[1], sell: sellMatch[1] });
      }
    });

    return results;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📊 持仓分析报告模型对比</h1>
        <p className="text-muted-foreground">
          对比豆包、Google Gemini、通义千问生成的持仓分析报告效果
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API Key 配置</CardTitle>
          <CardDescription>
            输入需要对比的模型 API Key（豆包使用系统配置，无需输入）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Google Gemini API Key
            </label>
            <Input
              type="password"
              placeholder="AIzaSy..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              获取地址: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              通义千问 API Key (阿里云 DashScope)
            </label>
            <Input
              type="password"
              placeholder="sk-..."
              value={qwenApiKey}
              onChange={(e) => setQwenApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              获取地址: <a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">阿里云 DashScope</a>
            </p>
          </div>
          <Button
            onClick={handleCompare}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? '🔄 生成对比中...' : '🚀 开始对比'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{result.holdingsCount}</div>
                <div className="text-sm text-muted-foreground">持仓数量</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {result.searchCompleted ? '✅ 已完成' : '❌ 失败'}
                </div>
                <div className="text-sm text-muted-foreground">多轮搜索状态</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {Object.values(result.models).filter((m: any) => m?.success).length}/3
                </div>
                <div className="text-sm text-muted-foreground">成功生成数量</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="side-by-side" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="side-by-side">并排对比</TabsTrigger>
              <TabsTrigger value="price-analysis">买卖价对比</TabsTrigger>
            </TabsList>

            <TabsContent value="side-by-side" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 豆包 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>🔥 豆包</span>
                      {result.models.doubao?.success && (
                        <Badge variant="default">当前方案</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>基于 coze-coding-dev-sdk</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderReport(result.models.doubao)}
                  </CardContent>
                </Card>

                {/* Gemini */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>🔵 Gemini</span>
                      {result.models.gemini?.success && (
                        <Badge variant="secondary">Google</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Google Gemini 1.5 Pro</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderReport(result.models.gemini)}
                  </CardContent>
                </Card>

                {/* 通义千问 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>🟢 通义千问</span>
                      {result.models.qwen?.success && (
                        <Badge variant="secondary">阿里云</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>通义千问 Plus</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderReport(result.models.qwen)}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="price-analysis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>💰 买卖价格区间对比</CardTitle>
                  <CardDescription>
                    对比三个模型为每只股票生成的买入价和卖出价区间
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">模型</th>
                          <th className="text-left py-2 px-4">买卖价区间</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b bg-blue-50 dark:bg-blue-950/20">
                          <td className="py-2 px-4 font-medium">🔥 豆包</td>
                          <td className="py-2 px-4">
                            <div className="space-y-1">
                              {extractPriceRange(result.models.doubao?.content || '').map((range, idx) => (
                                <div key={idx} className="text-xs">
                                  #{idx + 1}: 买入 {range.buy} / 卖出 {range.sell}
                                </div>
                              ))}
                              {extractPriceRange(result.models.doubao?.content || '').length === 0 && (
                                <span className="text-muted-foreground text-xs">未找到价格区间</span>
                              )}
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b bg-gray-50 dark:bg-gray-900/20">
                          <td className="py-2 px-4 font-medium">🔵 Gemini</td>
                          <td className="py-2 px-4">
                            <div className="space-y-1">
                              {extractPriceRange(result.models.gemini?.content || '').map((range, idx) => (
                                <div key={idx} className="text-xs">
                                  #{idx + 1}: 买入 {range.buy} / 卖出 {range.sell}
                                </div>
                              ))}
                              {extractPriceRange(result.models.gemini?.content || '').length === 0 && (
                                <span className="text-muted-foreground text-xs">未找到价格区间</span>
                              )}
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b bg-green-50 dark:bg-green-950/20">
                          <td className="py-2 px-4 font-medium">🟢 通义千问</td>
                          <td className="py-2 px-4">
                            <div className="space-y-1">
                              {extractPriceRange(result.models.qwen?.content || '').map((range, idx) => (
                                <div key={idx} className="text-xs">
                                  #{idx + 1}: 买入 {range.buy} / 卖出 {range.sell}
                                </div>
                              ))}
                              {extractPriceRange(result.models.qwen?.content || '').length === 0 && (
                                <span className="text-muted-foreground text-xs">未找到价格区间</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 统计信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(result.models).map(([key, model]: [string, any]) => (
                  <Card key={key}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{model.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">状态</span>
                        <span>{model.success ? '✅ 成功' : '❌ 失败'}</span>
                      </div>
                      {model.success && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">耗时</span>
                            <span>{model.duration}ms</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">字数</span>
                            <span>{model.charCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">价格区间数量</span>
                            <span>{extractPriceRange(model.content || '').length}</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
