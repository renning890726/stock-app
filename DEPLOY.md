# 快速部署指南

## 1. 解压文件

```bash
tar -xzf stock-assistant_v*.tar.gz
cd stock-assistant
```

## 2. 安装依赖

### Node.js 依赖

```bash
# 安装 pnpm（如果未安装）
npm install -g pnpm@9

# 安装项目依赖
pnpm install --frozen-lockfile
```

### Python 依赖

```bash
cd stock-service

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

cd ..
```

## 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
nano .env
```

必须配置以下变量：
- `DATABASE_URL`: PostgreSQL 数据库连接地址
- `PORT`: 应用端口（默认 5000）
- `STOCK_SERVICE_URL`: Python 服务地址（默认 http://localhost:9001）

## 4. 配置数据库

创建 PostgreSQL 数据库：

```sql
CREATE USER stockuser WITH PASSWORD 'stockpass123';
CREATE DATABASE stock_assistant OWNER stockuser;
GRANT ALL PRIVILEGES ON DATABASE stock_assistant TO stockuser;
```

## 5. 构建应用

```bash
pnpm run build
```

## 6. 启动服务

### 方式一：手动启动

```bash
# 启动 Python 服务（终端1）
cd stock-service
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 9001

# 启动 Next.js 应用（终端2）
cd ..
npx next start --port 5000
```

### 方式二：使用 Systemd（推荐）

参考 `docs/DEPLOYMENT.md` 中的详细说明。

### 方式三：使用 Docker（最简单）

```bash
# 安装 Docker 和 Docker Compose
# 然后执行：
docker-compose up -d
```

## 7. 访问应用

打开浏览器访问: http://localhost:5000

## 更多信息

详细的部署文档请查看 `docs/DEPLOYMENT.md`

## 常见问题

### 端口被占用
```bash
# 修改 .env 中的 PORT
PORT=5001
```

### 数据库连接失败
```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 测试连接
psql -U stockuser -d stock_assistant -h localhost
```

### Python 服务无法启动
```bash
# 检查 Python 版本（需要 3.8+）
python3 --version

# 重新安装依赖
cd stock-service
source venv/bin/activate
pip install --upgrade -r requirements.txt
```
