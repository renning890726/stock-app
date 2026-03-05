import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

export const GoalSetting = () => {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>年度投资目标</CardTitle>
          <CardDescription>设定您的年度投资计划和风险偏好</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total-assets">持仓总金额 (元)</Label>
              <Input id="total-assets" placeholder="例如：100000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-profit">盈利目标 (%)</Label>
              <Input id="target-profit" placeholder="例如：20" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>操作风格</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="选择您的操作风格" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">短期做 T (高频)</SelectItem>
                <SelectItem value="medium">中长期投资 (稳健)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button className="w-full">保存配置</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>目标跟踪</CardTitle>
          <CardDescription>实时监控目标达成进度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center border rounded-md bg-muted/20">
            图表区域：年度目标跟踪可视化 (ECharts/Recharts)
          </div>
        </CardContent>
      </Card>
    </div>
  );
};