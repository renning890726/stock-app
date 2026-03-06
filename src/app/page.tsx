"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Settings, TrendingUp, Lightbulb, Cog } from "lucide-react";
import { Settings as SettingsPanel } from "./components/settings-panel";
import { Holdings } from "./components/holdings-panel";
import { Recommendations } from "./components/recommendations-panel";
import { Config } from "./components/config-panel";

export default function Home() {
  const [activeTab, setActiveTab] = useState("settings");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8 relative">
        {/* 页面标题 */}
        <div className="mb-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              勇闯大A
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            AI 驱动的智能投资建议系统 · 持仓管理 · 实时监控 · 智能分析
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              实时行情
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              AI 分析
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              智能推送
            </span>
          </div>
        </div>

        {/* 主选项卡 */}
        <div className="max-w-7xl mx-auto">
          <Card className="border-2 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-slate-100 dark:bg-slate-800">
                <TabsTrigger 
                  value="settings"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">目标设置</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">设置年度目标</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="holdings"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">持仓管理</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">管理投资组合</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="recommendations"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">投资建议</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">智能分析报告</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="config"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-md"
                >
                  <Cog className="w-4 h-4 mr-2" />
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">系统配置</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">配置与API</span>
                  </div>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="settings" className="mt-0">
                  <SettingsPanel />
                </TabsContent>

                <TabsContent value="holdings" className="mt-0">
                  <Holdings />
                </TabsContent>

                <TabsContent value="recommendations" className="mt-0">
                  <Recommendations />
                </TabsContent>

                <TabsContent value="config" className="mt-0">
                  <Config />
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>

        {/* 底部信息 */}
        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-500">
          <p>基于 AI 的智能投资建议系统 · 数据仅供参考，投资需谨慎</p>
        </div>
      </div>
    </div>
  );
}
