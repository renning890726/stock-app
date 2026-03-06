# 勇闯大A - A股智能投资助手

基于 AI 的智能投资建议系统，提供持仓管理、实时监控、智能分析和飞书推送功能。

---

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 1. 解压文件
tar -xzf stock-assistant_v*.tar.gz
cd stock-assistant

# 2. 配置环境变量
cp .env.example .env
nano .env  # 修改数据库连接等配置

# 3. 启动服务
docker-compose up -d

# 4. 访问应用
# 打开浏览器访问 http://localhost:5000
```

### 手动部署

```bash
# 1. 解压文件
tar -xzf stock-assistant_v*.tar.gz
cd stock-assistant

# 2. 安装依赖
pnpm install --frozen-lockfile

# 3. 配置环境变量
cp .env.example .env
nano .env

# 4. 启动 Python 服务
cd stock-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 9001 &

# 5. 启动 Next.js 应用
cd ..
pnpm run build
npx next start --port 5000
```

---

## 📚 文档

- **快速部署**: 阅读 `DEPLOY.md`
- **完整文档**: 查看 `docs/` 目录
- **部署指南**: `docs/DEPLOYMENT.md`
- **打包说明**: `docs/PACKAGE_GUIDE.md`

---

## ✨ 核心功能

### 1. 目标设置
- 年度投资目标配置
- 操作风格选择（短期/中长期）
- LLM 模型选择
- 飞书 Webhook 配置

### 2. 持仓管理
- 持仓股票的增删改查
- 实时股价获取与展示
- 持仓盈亏计算
- 内联编辑持股数量
- 手动编辑股价
- 个股深度分析

### 3. 投资建议
- 多轮搜索（市场概况→个股详情→深度技术分析）
- AI 分析报告生成
- 操作建议（买入/卖出/持有）
- 报告历史记录
- 模型对比功能
- 市场热点发现

### 4. 实时监控
- 实时行情监控
- 异动检测（当日涨跌≥5%）
- 3个月历史新高检测
- 整体持仓盈亏监控
- 每日日报生成
- 飞书消息推送

### 5. 系统配置
- 用户配置管理
- 数据导入/导出
- 系统状态查看
- 定时任务管理

---

## 🔧 技术栈

### 前端
- **框架**: Next.js 16 (App Router)
- **UI**: React 19 + shadcn/ui + Tailwind CSS 4
- **状态管理**: React Hooks

### 后端
- **框架**: Next.js API Routes
- **数据库**: PostgreSQL + Drizzle ORM
- **缓存**: 内存缓存（动态有效期）

### AI 能力
- **LLM**: 豆包（通过 coze-coding-dev-sdk）
- **搜索**: 多轮搜索 API

### 数据源
- **行情数据**: Akshare + 新浪财经 + 东方财富
- **资讯**: Web Search（权威源过滤）
- **通知**: 飞书 Webhook

---

## 📦 系统要求

### 最低配置
- **操作系统**: Linux (Ubuntu 20.04+)
- **CPU**: 2核
- **内存**: 4GB
- **磁盘**: 20GB SSD

### 推荐配置
- **操作系统**: Linux (Ubuntu 22.04 LTS)
- **CPU**: 4核+
- **内存**: 8GB+
- **磁盘**: 50GB SSD

### 软件依赖
- Node.js 24.x
- pnpm 9.0.0+
- Python 3.8+
- PostgreSQL 14+

---

## 🔐 环境变量

### 必需配置

```bash
# 数据库连接
DATABASE_URL="postgresql://stockuser:password@localhost:5432/stock_assistant"

# 应用配置
NODE_ENV="production"
PORT="5000"

# Python 服务
STOCK_SERVICE_URL="http://localhost:9001"
```

### 可选配置

```bash
# LLM 模型
LLM_MODEL="doubao-seed-1-8-251228"

# 飞书通知
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"

# 时区
TZ="Asia/Shanghai"
```

---

## 📊 数据库结构

### 核心表

| 表名 | 说明 |
|------|------|
| `user_configs` | 用户配置 |
| `holdings` | 持仓记录 |
| `recommendations` | 建议历史 |
| `stock_high_prices` | 历史最高价 |

数据库表会在应用首次启动时自动创建。

---

## 🔍 接口文档

主要 API 接口：

### 持仓管理
- `GET/POST /api/holdings` - 持仓列表和创建
- `GET/PUT/DELETE /api/holdings/[id]` - 持仓详情
- `POST /api/holdings/[id]/update-price` - 更新价格

### 投资建议
- `POST /api/recommendations/generate` - 生成报告
- `POST /api/recommendations/monitor` - 实时监控
- `GET /api/recommendations` - 建议列表
- `POST /api/recommendations/alert` - 操作建议

### 系统配置
- `POST /api/user-config` - 创建配置
- `GET /api/user-config/latest` - 最新配置
- `POST /api/user-config/update` - 更新配置

详细接口文档请参考 `docs/ARCHITECTURE.md`。

---

## 🐛 常见问题

### 1. 端口被占用

```bash
# 查找占用进程
sudo lsof -i:5000

# 修改 .env 中的 PORT
PORT=5001
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 测试连接
psql -U stockuser -d stock_assistant -h localhost
```

### 3. Python 服务无法启动

```bash
# 检查 Python 版本
python3 --version

# 重新安装依赖
cd stock-service
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

更多问题请查看 `docs/DEPLOYMENT.md`。

---

## 📈 性能优化

### 缓存策略

- **交易时间内**: 30秒缓存
- **非交易时间**: 24小时缓存
- **动态调整**: 根据交易时间自动调整

### 数据源优先级

1. Akshare API（主要）
2. 新浪财经 API（备用）
3. 东方财富 API（降级）
4. 搜索提取（兜底）

---

## 🔒 安全建议

1. **修改默认密码**: 修改数据库密码和敏感配置
2. **启用防火墙**: 只开放必要的端口
3. **使用 HTTPS**: 配置 SSL/TLS 证书
4. **定期备份**: 定期备份数据库和配置
5. **监控日志**: 定期检查系统日志

---

## 📞 获取帮助

- 📚 **文档**: `docs/` 目录
- 🐛 **问题反馈**: 提交 Issue 到项目仓库
- 💬 **技术支持**: 联系技术团队

---

## 📝 更新日志

### v1.0.0 (2026-02-10)
- ✅ 完整的持仓管理功能
- ✅ AI 分析报告生成
- ✅ 实时监控和推送
- ✅ 飞书通知集成
- ✅ 多轮搜索策略
- ✅ 模型对比功能

---

## 📄 许可证

本项目仅供学习和研究使用，投资有风险，入市需谨慎。

---

**项目名称**: 勇闯大A  
**版本**: v1.0.0  
**打包日期**: 2026-02-10  
**维护者**: 技术团队
