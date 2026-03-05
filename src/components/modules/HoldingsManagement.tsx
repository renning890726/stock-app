import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';

export const HoldingsManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">持仓概览</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> 添加持仓
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总资产</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥ 124,500.00</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日盈亏</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+¥ 2,350.00</div>
            <p className="text-xs text-muted-foreground">+1.2% today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">累计盈亏</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-¥ 1,200.00</div>
            <p className="text-xs text-muted-foreground">-0.5% all time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">持仓数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Active positions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>持仓列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-4">
            <div className="text-center text-muted-foreground">
              表格组件占位符 - 这里将显示详细的持仓列表
              (包含：代码、名称、现价、成本、持仓量、盈亏、操作)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};