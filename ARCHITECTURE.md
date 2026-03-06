# 架构设计文档
## 勇闯大A - AI驱动智能投资建议系统

**版本**: v1.0  
**文档日期**: 2026年2月13日  
**架构师**: AI团队

---

## 一、系统概述

### 1.1 系统定位
"勇闯大A"是一个基于Next.js的全栈Web应用，集成AI大语言模型和实时股票数据，为A股个人投资者提供智能投资建议服务。

### 1.2 技术架构特点
- **前后端分离**: Next.js App Router + Server Actions
- **服务化架构**: 主服务 + Python数据服务
- **微服务设计**: 模块化、可扩展
- **实时性**: WebSocket支持（预留）
- **智能化**: 集成多个LLM模型

### 1.3 部署架构
- **开发环境**: 单机开发模式（localhost:5000）
- **生产环境**: 容器化部署（Coze平台）
- **数据库**: PostgreSQL云数据库
- **服务端口**: 
  - Next.js主服务: 5000
  - Python数据服务: 9001

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web浏览器   │  │  飞书客户端   │  │  移动端(预留) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       接入层                                  │
│  ┌──────────────────────────────────────────────────┐      │
│  │          Coze平台网关 / Nginx反向代理              │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       应用层                                  │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Next.js主服务 (端口5000)                 │      │
│  │  ┌──────────────┐  ┌──────────────┐               │      │
│  │  │  API Routes  │  │   Pages      │               │      │
│  │  └──────────────┘  └──────────────┘               │      │
│  └──────────────────────────────────────────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────┐      │
│  │      Python Akshare服务 (端口9001)                │      │
│  │  ┌──────────────┐  ┌──────────────┐               │      │
│  │  │  股票数据API  │  │  批量查询API  │               │      │
│  │  └──────────────┘  └──────────────┘               │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       业务层                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 持仓管理模块 │ │ 监控调度模块 │ │ 分析报告模块 │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 价格缓存模块 │ │ 消息推送模块 │ │ 用户配置模块 │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       数据层                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │ 价格内存缓存 │  │ 文件系统存储 │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       外部服务层                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 豆包/DeepSeek│ │  Search API  │ │ 飞书Webhook │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 新浪财经API │ │ 东方财富API │ │ 对象存储服务 │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈分层

#### 2.2.1 前端技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| **框架** | Next.js 16.1.1 | React全栈框架，App Router |
| **UI库** | shadcn/ui | 基于Radix UI的组件库 |
| **样式** | Tailwind CSS 4.1.18 | 原子化CSS框架 |
| **语言** | TypeScript 5.9.3 | 类型安全的JavaScript |
| **状态管理** | React Hooks | 内置状态管理 |
| **表单处理** | react-hook-form | 高性能表单库 |

#### 2.2.2 后端技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| **运行时** | Node.js 24 | JavaScript运行环境 |
| **API框架** | Next.js API Routes | 服务端API |
| **数据库** | PostgreSQL | 关系型数据库 |
| **ORM** | Drizzle ORM 0.45.1 | 类型安全的ORM |
| **Python服务** | FastAPI + Uvicorn | 股票数据服务 |
| **数据源** | AkShare | Python股票数据库 |

#### 2.2.3 AI服务栈
| 层级 | 技术 | 说明 |
|------|------|------|
| **SDK** | coze-coding-dev-sdk 0.7.15 | AI服务集成SDK |
| **LLM模型** | 豆包/DeepSeek/Kimi | 多模型支持 |
| **搜索服务** | Search API | 实时信息检索 |
| **向量存储** | 集成在SDK中 | 知识库支持 |

---

## 三、模块设计

### 3.1 目录结构

```
workspace/projects/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API路由
│   │   │   ├── holdings/             # 持仓管理API
│   │   │   ├── user-config/          # 用户配置API
│   │   │   ├── recommendations/       # 投资建议API
│   │   │   │   ├── alert/           # 操作建议
│   │   │   │   ├── report/          # 分析报告
│   │   │   │   ├── monitor/         # 实时监控
│   │   │   │   └── hot-topics/      # 热点推送
│   │   │   ├── scheduler/            # 调度任务API
│   │   │   ├── stock-analysis/       # 股票分析
│   │   │   ├── price-cache/          # 价格缓存
│   │   │   └── debug/                # 调试接口
│   │   ├── components/               # React组件
│   │   │   ├── settings-panel.tsx    # 目标设置面板
│   │   │   ├── holdings-panel.tsx    # 持仓管理面板
│   │   │   ├── recommendations-panel.tsx # 投资建议面板
│   │   │   └── config-panel.tsx      # 系统配置面板
│   │   ├── layout.tsx                # 根布局
│   │   ├── page.tsx                  # 首页
│   │   └── globals.css               # 全局样式
│   ├── components/ui/                # shadcn/ui组件
│   ├── lib/                          # 工具库
│   │   ├── scheduler.ts              # 任务调度器
│   │   ├── price-cache.ts            # 价格缓存管理
│   │   ├── stock-price-enhanced.ts   # 增强价格获取
│   │   ├── stock-price-akshare.ts    # Akshare集成
│   │   ├── multi-round-search.ts     # 多轮搜索
│   │   ├── feishu-notification.ts    # 飞书推送
│   │   └── utils.ts                  # 工具函数
│   ├── storage/database/             # 数据库层
│   │   ├── shared/
│   │   │   ├── schema.ts             # 数据库Schema
│   │   │   └── relations.ts          # 关系定义
│   │   ├── userConfigManager.ts      # 用户配置管理
│   │   ├── holdingManager.ts         # 持仓管理
│   │   ├── recommendationManager.ts  # 建议管理
│   │   ├── stockHighPriceManager.ts  # 历史最高价管理
│   │   ├── performanceManager.ts     # 性能记录管理
│   │   └── hotTopicsManager.ts       # 热点管理
│   └── hooks/                        # 自定义Hooks
├── stock-service/                    # Python股票数据服务
│   ├── main.py                       # FastAPI应用
│   ├── requirements.txt              # Python依赖
│   └── __pycache__/                  # Python缓存
├── scripts/                          # 脚本文件
│   ├── prepare.sh                    # 依赖安装
│   ├── dev.sh                        # 开发环境启动
│   ├── build.sh                      # 构建脚本
│   └── start.sh                      # 生产环境启动
├── public/                           # 静态资源
├── docs/                             # 文档
│   ├── PRD.md                        # 产品需求文档
│   ├── ARCHITECTURE.md               # 架构设计文档
│   └── DEPLOYMENT.md                 # 部署文档
├── .coze                             # Coze配置
├── next.config.ts                    # Next.js配置
├── package.json                      # 依赖配置
├── tsconfig.json                     # TypeScript配置
└── README.md                         # 项目说明
```

### 3.2 核心模块设计

#### 3.2.1 持仓管理模块 (HoldingManager)

**职责**:
- 持仓数据的CRUD操作
- 持仓盈亏计算
- 持仓统计信息

**核心方法**:
```typescript
class HoldingManager {
  createHolding(data): Promise<Holding>
  getHoldingById(id): Promise<Holding>
  getAllHoldings(): Promise<Holding[]>
  updateHolding(id, data): Promise<Holding>
  deleteHolding(id): Promise<void>
  getHoldingsByStockCode(code): Promise<Holding[]>
}
```

**数据流转**:
1. 用户在UI中添加持仓
2. 调用 `POST /api/holdings`
3. HoldingManager创建记录
4. 返回持仓信息
5. 系统自动获取实时价格
6. 计算盈亏并更新UI

#### 3.2.2 价格缓存模块 (PriceCache)

**职责**:
- 股票价格缓存管理
- 缓存有效期控制
- 缓存清理机制

**核心方法**:
```typescript
class PriceCache {
  getCachedPrice(code): number | null
  setCachedPrice(code, price, source): void
  isCacheExpired(code): boolean
  clearAllCache(): void
  getCacheTTL(): number  // 动态TTL
  isTradingTime(): boolean  // 交易时间判断
}
```

**缓存策略**:
```
┌─────────────────────────────────────┐
│          缓存策略                    │
├─────────────────────────────────────┤
│ 交易时间 (9:30-11:30, 13:00-15:00)  │
│   └─ TTL: 30秒                      │
│                                     │
│ 非交易时间                          │
│   └─ TTL: 24小时                    │
└─────────────────────────────────────┘
```

#### 3.2.3 监控调度模块 (Scheduler)

**职责**:
- 定时任务管理
- 异动检测
- 推送触发

**核心方法**:
```typescript
class TaskScheduler {
  registerTask(task): string
  start(): void
  stop(): void
  toggleTask(id): boolean
  getTasks(): Task[]
}

// 注册的任务
1. 每日持仓分析报告 (21:30)
2. 持仓实时监控 (每分钟)
3. 盘前热点推送 (09:30)
```

**监控流程**:
```
┌─────────────┐
│  定时触发   │ (每分钟)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 检查交易时间 │
└──────┬──────┘
       │ 是
       ▼
┌─────────────┐
│ 获取实时价格 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 检测异动    │ (涨跌幅≥5%)
└──────┬──────┘
       │ 检测到
       ▼
┌─────────────┐
│ 生成操作建议 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 飞书推送     │
└─────────────┘
```

#### 3.2.4 分析报告模块 (RecommendationManager)

**职责**:
- AI分析报告生成
- 建议历史管理
- 多模型对比

**核心方法**:
```typescript
class RecommendationManager {
  createRecommendation(data): Promise<Recommendation>
  getRecommendationById(id): Promise<Recommendation>
  getRecommendationsByType(type): Promise<Recommendation[]>
  generatePortfolioReport(holdings): Promise<Report>
  generateStockAnalysis(stock): Promise<Analysis>
}
```

**多轮搜索架构**:
```
┌─────────────────────────────────────────┐
│         多轮搜索架构                      │
├─────────────────────────────────────────┤
│ 第一轮：市场概况                        │
│   - 整体走势、指数表现                 │
│   - 市场情绪、热点板块                 │
├─────────────────────────────────────────┤
│ 第二轮：个股详情                        │
│   - 最新消息、技术面分析               │
│   - 资金流向、机构观点                 │
├─────────────────────────────────────────┤
│ 第三轮：深度技术分析                    │
│   - 支撑位、阻力位                     │
│   - 技术指标（MACD/KDJ/RSI）           │
│   - K线形态、机构研报目标价            │
└─────────────────────────────────────────┘
```

#### 3.2.5 飞书推送模块 (FeishuNotification)

**职责**:
- 飞书消息推送
- 消息格式化
- 推送失败重试

**核心方法**:
```typescript
class FeishuNotification {
  sendCard(webhookUrl, card): Promise<void>
  sendText(webhookUrl, text): Promise<void>
  formatAlert(alert): Card
  formatReport(report): Card
  formatMonitor(monitor): Card
}
```

**消息卡片格式**:
```typescript
interface FeishuCard {
  header: {
    title: string;
    template: "blue" | "red" | "green";
  };
  elements: Array<{
    tag: "div" | "hr";
    text?: string;
  }>;
}
```

---

## 四、数据库设计

### 4.1 ER图

```
┌─────────────────┐
│  user_configs   │
├─────────────────┤
│ PK id           │
│    positionAmount│
│    profitTarget │
│    tradingStyle │
│    llmModel     │
│    feishuWebhook│
│    cash         │
│    createdAt    │
│    updatedAt    │
└────────┬────────┘
         │
         │
         ├────────────┐
         │            │
         ▼            ▼
┌─────────────────┐ ┌─────────────────┐
│    holdings     │ │ recommendations│
├─────────────────┤ ├─────────────────┤
│ PK id           │ │ PK id           │
│ FK userConfigId ││    type         │
│    stockName    ││    content      │
│    stockCode    ││    explanation  │
│    quantity     ││    action       │
│    costPrice    ││    relatedStock │
│    createdAt    ││    sources      │
│    updatedAt    ││    createdAt    │
└────────┬────────┘ └─────────────────┘
         │
         │
         ▼
┌─────────────────┐
│stock_high_prices│
├─────────────────┤
│ PK id           │
│ UNIQUE stockCode│
│    stockName    │
│    highPrice    │
│    highDate     │
│    lastAlertDate│
│    createdAt    │
│    updatedAt    │
└─────────────────┘
```

### 4.2 表结构详解

#### user_configs
```sql
CREATE TABLE user_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  position_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  profit_target NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  trading_style VARCHAR(50) NOT NULL DEFAULT 'medium_long_term',
  llm_model VARCHAR(100) NOT NULL DEFAULT 'doubao-seed-1-8-251228',
  feishu_webhook_url VARCHAR(500),
  cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
```

#### holdings
```sql
CREATE TABLE holdings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_name VARCHAR(100) NOT NULL,
  stock_code VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  INDEX idx_stock_code (stock_code)
);
```

#### recommendations
```sql
CREATE TABLE recommendations (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'alert',
  content TEXT NOT NULL,
  explanation TEXT,
  action VARCHAR(20),
  related_stock VARCHAR(100),
  sources TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  INDEX idx_type (type),
  INDEX idx_action (action),
  INDEX idx_related_stock (related_stock)
);
```

#### stock_high_prices
```sql
CREATE TABLE stock_high_prices (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) UNIQUE NOT NULL,
  stock_name VARCHAR(100) NOT NULL,
  high_price NUMERIC(10,2) NOT NULL,
  high_date TIMESTAMPTZ NOT NULL,
  last_alert_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  INDEX idx_stock_code (stock_code)
);
```

### 4.3 索引设计

| 表名 | 索引名 | 字段 | 类型 | 说明 |
|------|--------|------|------|------|
| holdings | idx_stock_code | stock_code | B-Tree | 加速股票代码查询 |
| recommendations | idx_type | type | B-Tree | 加速类型筛选 |
| recommendations | idx_action | action | B-Tree | 加速操作类型筛选 |
| recommendations | idx_related_stock | related_stock | B-Tree | 加速关联股票查询 |
| stock_high_prices | idx_stock_code | stock_code | UNIQUE | 唯一约束，加速查询 |

---

## 五、API设计

### 5.1 API路由规范

```
/api/{resource}/{id}/{action}
```

**示例**:
- `/api/holdings` - 获取所有持仓
- `/api/holdings/{id}` - 获取/更新/删除指定持仓
- `/api/holdings/{id}/update-price` - 更新指定持仓价格

### 5.2 API列表

#### 持仓管理API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/holdings` | 获取所有持仓 | 无 |
| POST | `/api/holdings` | 创建持仓 | 无 |
| GET | `/api/holdings/{id}` | 获取指定持仓 | 无 |
| PUT | `/api/holdings/{id}` | 更新持仓 | 无 |
| DELETE | `/api/holdings/{id}` | 删除持仓 | 无 |
| POST | `/api/holdings/{id}/update-price` | 手动更新价格 | 无 |

**请求示例** (POST /api/holdings):
```json
{
  "stockName": "贵州茅台",
  "stockCode": "600519",
  "quantity": 100,
  "costPrice": 1800.00
}
```

**响应示例**:
```json
{
  "id": "uuid",
  "stockName": "贵州茅台",
  "stockCode": "600519",
  "quantity": 100,
  "costPrice": 1800.00,
  "currentPrice": 1850.00,
  "priceSource": "akshare",
  "changePercent": 2.78,
  "createdAt": "2026-02-13T10:00:00Z",
  "updatedAt": "2026-02-13T10:00:00Z"
}
```

#### 用户配置API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/user-config` | 获取所有配置 | 无 |
| POST | `/api/user-config` | 创建配置 | 无 |
| GET | `/api/user-config/latest` | 获取最新配置 | 无 |
| PUT | `/api/user-config/update` | 更新配置 | 无 |

#### 投资建议API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/recommendations` | 获取所有建议 | 无 |
| POST | `/api/recommendations/generate` | 生成操作建议 | 无 |
| POST | `/api/recommendations/report` | 生成分析报告 | 无 |
| POST | `/api/recommendations/monitor` | 触发监控检查 | 无 |
| POST | `/api/recommendations/alert` | 创建操作建议 | 无 |
| POST | `/api/recommendations/hot-topics/push` | 推送热点分析 | 无 |

**监控触发响应示例**:
```json
{
  "triggered": true,
  "stockCode": "600519",
  "stockName": "贵州茅台",
  "action": "hold",
  "reason": "检测到异动：贵州茅台上涨5.2%，创3个月历史新高",
  "content": "600519 贵州茅台 - 持有 - 涨幅5.2%，历史新高，建议继续持有观察",
  "sources": [
    "新浪财经: http://...",
    "东方财富: http://..."
  ]
}
```

#### 调度任务API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/scheduler/status` | 获取调度状态 | 无 |
| POST | `/api/scheduler/run-daily-report` | 运行日报任务 | 无 |
| POST | `/api/scheduler/run-hot-topics` | 运行热点推送任务 | 无 |
| POST | `/api/scheduler/test-push` | 测试推送 | 无 |

#### 价格缓存API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/price-cache/clear` | 清空缓存 | 无 |
| POST | `/api/price-cache/update` | 更新缓存 | 无 |

---

## 六、数据流设计

### 6.1 持仓添加流程

```
用户操作
  │
  ▼
┌─────────────┐
│ UI表单提交  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ API路由     │ POST /api/holdings
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 数据验证     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 创建持仓记录 │ HoldingManager
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 获取实时价格 │ StockPriceEnhanced
└──────┬──────┘
       │
       ├─→ Python Akshare
       ├─→ 新浪财经API
       ├─→ 东方财富API
       └─→ Search API
       │
       ▼
┌─────────────┐
│ 更新缓存     │ PriceCache
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 返回结果     │
└──────┬──────┘
       │
       ▼
     UI更新
```

### 6.2 监控触发流程

```
定时器触发 (每分钟)
  │
  ▼
┌─────────────┐
│ 检查交易时间 │ isTradingTime()
└──────┬──────┘
       │ 是
       ▼
┌─────────────┐
│ 批量获取价格 │ getStockPricesBatch()
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 检测异动    │ (涨跌幅≥5%)
└──────┬──────┘
       │
       ├─→ 异动股票列表
       │
       ▼
┌─────────────┐
│ 检测历史新高 │ isThreeMonthHigh()
└──────┬──────┘
       │
       ├─→ 历史新高股票列表
       │
       ▼
┌─────────────┐
│ 生成操作建议 │ LLM + Search
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 飞书推送     │ FeishuNotification
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 记录建议历史 │ RecommendationManager
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 更新历史最高价│ StockHighPriceManager
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 记录推送时间 │ lastAlertDate
└─────────────┘
```

### 6.3 分析报告生成流程

```
用户点击生成报告
  │
  ▼
┌─────────────┐
│ API路由     │ POST /api/recommendations/report
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 获取持仓数据 │ HoldingManager
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 批量获取价格 │ getStockPricesBatch()
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 第一轮搜索   │ SearchClient (市场概况)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 第二轮搜索   │ SearchClient (个股详情)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 第三轮搜索   │ SearchClient (深度分析)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ LLM生成报告  │ LLMClient
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 记录建议历史 │ RecommendationManager
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 返回报告     │
└──────┬──────┘
       │
       ▼
     UI展示
```

---

## 七、部署架构

### 7.1 部署方案

#### 开发环境
```
本地开发机
├── Next.js开发服务器 (localhost:5000)
│   ├── 热更新支持
│   ├── Source Maps
│   └── 开发工具集成
└── Python Akshare服务 (localhost:9001)
    ├── FastAPI开发模式
    └── 调试日志
```

#### 生产环境
```
Coze容器平台
├── Next.js生产服务
│   ├── 端口: 5000
│   ├── SSL证书
│   └── 负载均衡
├── Python Akshare服务
│   ├── 端口: 9001
│   └── 健康检查
└── PostgreSQL数据库
    ├── 连接池
    └── SSL加密
```

### 7.2 环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL连接串 | `postgresql://...` |
| `AKSHARE_API_URL` | Python服务地址 | `http://localhost:9001` |
| `NEXT_PUBLIC_API_URL` | API基础URL | `http://localhost:5000` |
| `NODE_ENV` | 运行环境 | `development` / `production` |

### 7.3 启动脚本

#### 开发启动 (scripts/dev.sh)
```bash
#!/bin/bash
# 1. 安装依赖
pnpm install

# 2. 启动 Python Akshare服务
python3 -m uvicorn stock-service.main:app \
  --host 0.0.0.0 --port 9001 &

# 3. 等待 Python 服务启动
sleep 3

# 4. 启动 Next.js 开发服务器
npx next dev --webpack --port 5000
```

#### 生产启动 (scripts/start.sh)
```bash
#!/bin/bash
# 1. 安装依赖
pnpm install

# 2. 构建生产版本
npx next build

# 3. 启动 Python Akshare服务
python3 -m uvicorn stock-service.main:app \
  --host 0.0.0.0 --port 9001 &

# 4. 启动 Next.js 生产服务器
npx next start --port 5000
```

---

## 八、监控与运维

### 8.1 日志系统

**日志级别**:
- `ERROR`: 错误信息
- `WARN`: 警告信息
- `INFO`: 一般信息
- `DEBUG`: 调试信息

**日志位置**:
```
/app/work/logs/bypass/
├── app.log          # 主应用日志
├── dev.log          # 开发环境日志
├── console.log      # 控制台输出
└── stock-service.log # Python服务日志
```

### 8.2 健康检查

**Next.js服务**:
```bash
curl -I http://localhost:5000
```

**Python服务**:
```bash
curl -I http://localhost:9001/health
```

### 8.3 性能监控

**关键指标**:
- API响应时间
- 数据库查询时间
- 外部API调用成功率
- 缓存命中率

**监控工具**:
- 日志分析
- 系统资源监控
- 应用性能监控 (APM)

### 8.4 备份策略

**数据备份**:
- 用户配置: 每日备份
- 持仓数据: 每日备份
- 建议历史: 每周备份

**备份位置**:
- PostgreSQL自动备份
- 对象存储备份

---

## 九、安全设计

### 9.1 数据安全

**加密传输**:
- 所有API使用HTTPS
- PostgreSQL连接使用SSL

**数据脱敏**:
- 敏感信息不记录日志
- Webhook地址脱敏显示

### 9.2 接口安全

**访问控制**:
- API接口限流
- 请求大小限制
- 超时控制

**输入验证**:
- 参数类型检查
- 参数范围验证
- SQL注入防护（ORM）

### 9.3 服务安全

**错误处理**:
- 不暴露内部错误详情
- 统一错误响应格式
- 异常日志记录

**依赖安全**:
- 定期更新依赖
- 使用npm audit
- 使用pnpm overrides

---

## 十、扩展性设计

### 10.1 水平扩展

**无状态设计**:
- API服务无状态
- 支持多实例部署
- 负载均衡

**缓存策略**:
- 价格缓存独立
- 支持分布式缓存扩展

### 10.2 模块化扩展

**数据源扩展**:
```
PriceDataSource Interface
├── AkshareDataSource
├── SinaDataSource
├── EastmoneyDataSource
└── [CustomDataSource]
```

**LLM模型扩展**:
```
LLMProvider Interface
├── DoubaoProvider
├── DeepSeekProvider
├── KimiProvider
└── [CustomProvider]
```

### 10.3 功能扩展

**预留接口**:
- WebSocket实时推送
- 移动端API
- 第三方平台集成
- 插件系统

---

## 十一、技术债务与优化方向

### 11.1 当前技术债务

| 项目 | 优先级 | 说明 |
|------|--------|------|
| 单点故障 | 高 | Python服务无健康检查和自动重启 |
| 缓存一致性 | 中 | 内存缓存无持久化，重启丢失 |
| 错误处理 | 中 | 部分错误处理不够完善 |
| 测试覆盖 | 低 | 缺少自动化测试 |

### 11.2 优化方向

**短期优化**:
- 添加健康检查和自动重启
- 实现缓存持久化
- 完善错误处理和日志
- 添加单元测试

**中期优化**:
- 实现Redis分布式缓存
- 添加WebSocket实时推送
- 优化数据库查询性能
- 实现监控告警系统

**长期优化**:
- 微服务化改造
- 实现Kubernetes部署
- 添加机器学习模型
- 实现移动端应用

---

## 十二、附录

### 12.1 术语表

| 术语 | 说明 |
|------|------|
| App Router | Next.js的路由系统 |
| Drizzle ORM | TypeScript优先的ORM |
| AkShare | Python股票数据库 |
| LLM | 大语言模型 |
| Webhook | HTTP回调机制 |
| TTL | Time To Live，缓存有效期 |
| B-Tree索引 | 数据库索引类型 |

### 12.2 参考资料

| 文档 | 链接 |
|------|------|
| Next.js文档 | https://nextjs.org/docs |
| Drizzle ORM文档 | https://orm.drizzle.team |
| shadcn/ui文档 | https://ui.shadcn.com |
| AkShare文档 | https://akshare.akfamily.xyz |
| PostgreSQL文档 | https://www.postgresql.org/docs |

### 12.3 联系方式

**技术团队**: AI开发团队  
**维护周期**: 每月更新  
**版本管理**: Git + Git Flow

---

**文档维护**: 技术架构师  
**审核流程**: 技术负责人审核 → 发布  
**更新频率**: 季度或重大架构变更时更新
