import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { GoalSetting } from './components/modules/GoalSetting';
import { HoldingsManagement } from './components/modules/HoldingsManagement';
import { InvestmentAdvice } from './components/modules/InvestmentAdvice';
import { SystemConfig } from './components/modules/SystemConfig';
import { LayoutDashboard, Wallet, BrainCircuit, Settings } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">智能股票交易系统</h1>
            <p className="text-muted-foreground mt-2">
              基于 AI 分析与多源数据的全栈交易助手
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">最后更新: {new Date().toLocaleTimeString()}</span>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-500/10 text-green-500 hover:bg-green-500/20">
              系统运行正常
            </span>
          </div>
        </header>

        <main>
          <Tabs defaultValue="holdings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="goals" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" /> 目标设置
              </TabsTrigger>
              <TabsTrigger value="holdings" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" /> 持仓管理
              </TabsTrigger>
              <TabsTrigger value="advice" className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" /> 投资建议
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> 系统配置
              </TabsTrigger>
            </TabsList>

            <TabsContent value="goals" className="space-y-4">
              <GoalSetting />
            </TabsContent>

            <TabsContent value="holdings" className="space-y-4">
              <HoldingsManagement />
            </TabsContent>

            <TabsContent value="advice" className="space-y-4">
              <InvestmentAdvice />
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <SystemConfig />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

export default App;