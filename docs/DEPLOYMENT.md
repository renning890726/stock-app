# 部署指南

本文档详细介绍如何将"勇闯大A"A股智能投资助手部署到不同的环境中。

---

## 📋 目录

1. [系统要求](#系统要求)
2. [部署方式](#部署方式)
3. [环境配置](#环境配置)
4. [数据库配置](#数据库配置)
5. [启动服务](#启动服务)
6. [生产环境优化](#生产环境优化)
7. [常见问题](#常见问题)
8. [监控与维护](#监控与维护)

---

## 🔧 系统要求

### 最低配置

- **操作系统**: Linux (Ubuntu 20.04+, CentOS 7+, Debian 10+)
- **CPU**: 2核
- **内存**: 4GB
- **磁盘**: 20GB SSD
- **网络**: 公网IP（用于访问外部API）

### 推荐配置

- **操作系统**: Linux (Ubuntu 22.04 LTS)
- **CPU**: 4核+
- **内存**: 8GB+
- **磁盘**: 50GB SSD
- **网络**: 公网IP，带宽 10Mbps+

### 软件依赖

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| Node.js | 24.x | 运行 Next.js 应用 |
| pnpm | 9.0.0+ | 包管理器 |
| Python | 3.8+ | 运行 Akshare 服务 |
| PostgreSQL | 14+ | 数据库 |
| Git | 任意 | 版本控制 |

---

## 📦 部署方式

### 方式一：Docker 部署（推荐）

适用于生产环境，易于管理和迁移。

#### 1. 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

#### 2. 创建 Dockerfile

在项目根目录创建 `Dockerfile`:

```dockerfile
# ========== Next.js 应用镜像 ==========
FROM node:24-slim AS app-builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# ========== 生产镜像 ==========
FROM node:24-slim AS app-production

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9

# 复制构建产物
COPY --from=app-builder /app/.next ./.next
COPY --from=app-builder /app/package.json ./
COPY --from=app-builder /app/pnpm-lock.yaml ./
COPY --from=app-builder /app/next.config.ts ./
COPY --from=app-builder /app/public ./public
COPY --from=app-builder /app/tsconfig.json ./
COPY --from=app-builder /app/src ./src

# 安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 暴露端口
EXPOSE 5000

# 启动应用
CMD ["npx", "next", "start", "--port", "5000"]
```

#### 3. 创建 Python 服务 Dockerfile

在 `stock-service/` 目录创建 `Dockerfile`:

```dockerfile
# ========== Python Akshare 服务 ==========
FROM python:3.10-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 9001

# 启动服务
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9001"]
```

#### 4. 创建 requirements.txt

在 `stock-service/` 目录创建 `requirements.txt`:

```txt
fastapi==0.115.6
uvicorn==0.32.1
akshare==1.14.98
pandas==2.2.3
requests==2.32.3
```

#### 5. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL 数据库
  postgres:
    image: postgres:14-alpine
    container_name: stock-assistant-db
    environment:
      POSTGRES_USER: stockuser
      POSTGRES_PASSWORD: stockpass123
      POSTGRES_DB: stock_assistant
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - stock-network
    restart: unless-stopped

  # Python Akshare 服务
  stock-service:
    build:
      context: ./stock-service
      dockerfile: Dockerfile
    container_name: stock-assistant-python
    ports:
      - "9001:9001"
    environment:
      - PYTHONUNBUFFERED=1
    networks:
      - stock-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Next.js 应用
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: stock-assistant-app
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://stockuser:stockpass123@postgres:5432/stock_assistant
      - STOCK_SERVICE_URL=http://stock-service:9001
      - TZ=Asia/Shanghai
    depends_on:
      - postgres
      - stock-service
    networks:
      - stock-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres-data:
    driver: local

networks:
  stock-network:
    driver: bridge
```

#### 6. 创建数据库初始化脚本

创建 `init-db.sql`:

```sql
-- 创建数据库扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建表结构（会由 Drizzle 自动创建，这里只是占位）
-- 实际的表结构由应用在首次启动时自动创建
```

#### 7. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v
```

---

### 方式二：传统部署（手动）

适用于需要精细控制或云服务器环境。

#### 1. 安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 pnpm
npm install -g pnpm@9

# 安装 Python 3.10
sudo apt install -y python3 python3-pip python3-venv

# 安装 PostgreSQL 14
sudo apt install -y postgresql postgresql-contrib

# 安装其他工具
sudo apt install -y git curl nginx
```

#### 2. 配置 PostgreSQL

```bash
# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql <<EOF
CREATE USER stockuser WITH PASSWORD 'stockpass123';
CREATE DATABASE stock_assistant OWNER stockuser;
GRANT ALL PRIVILEGES ON DATABASE stock_assistant TO stockuser;
\q
EOF
```

#### 3. 克隆项目

```bash
# 克隆代码
git clone <your-repo-url> /opt/stock-assistant
cd /opt/stock-assistant

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置文件
```

#### 4. 安装依赖

```bash
# 安装 Node.js 依赖
pnpm install --frozen-lockfile

# 安装 Python 依赖
cd stock-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

#### 5. 构建应用

```bash
# 构建 Next.js 应用
pnpm run build
```

#### 6. 配置 Systemd 服务

**创建 Next.js 应用服务**:

```bash
sudo nano /etc/systemd/system/stock-assistant-app.service
```

内容:

```ini
[Unit]
Description=Stock Assistant Next.js App
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/stock-assistant
Environment="NODE_ENV=production"
Environment="PORT=5000"
EnvironmentFile=/opt/stock-assistant/.env
ExecStart=/usr/bin/npx next start --port 5000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**创建 Python 服务**:

```bash
sudo nano /etc/systemd/system/stock-assistant-python.service
```

内容:

```ini
[Unit]
Description=Stock Assistant Python Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/stock-assistant/stock-service
Environment="PYTHONUNBUFFERED=1"
ExecStart=/opt/stock-assistant/stock-service/venv/bin/uvicorn main:app --host 0.0.0.0 --port 9001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 7. 启动服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start stock-assistant-python
sudo systemctl start stock-assistant-app

# 设置开机自启
sudo systemctl enable stock-assistant-python
sudo systemctl enable stock-assistant-app

# 查看状态
sudo systemctl status stock-assistant-python
sudo systemctl status stock-assistant-app

# 查看日志
sudo journalctl -u stock-assistant-app -f
```

---

## ⚙️ 环境配置

### 必需环境变量

在 `.env` 文件中配置以下变量：

```bash
# 数据库连接
DATABASE_URL="postgresql://stockuser:stockpass123@localhost:5432/stock_assistant"

# 应用配置
NODE_ENV="production"
PORT="5000"

# Python 服务
STOCK_SERVICE_URL="http://localhost:9001"

# 时区
TZ="Asia/Shanghai"
```

### 可选环境变量

```bash
# LLM 配置
LLM_MODEL="doubao-seed-1-8-251228"

# 飞书 Webhook
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"

# 缓存配置
CACHE_TTL_TRADING="30"
CACHE_TTL_NON_TRADING="86400"

# 日志配置
LOG_LEVEL="info"
LOG_DIR="/var/log/stock-assistant"
```

---

## 🗄️ 数据库配置

### 初始化数据库

数据库表结构会在应用首次启动时由 Drizzle ORM 自动创建。

### 备份数据库

```bash
# 备份
pg_dump -U stockuser -d stock_assistant > backup_$(date +%Y%m%d).sql

# 恢复
psql -U stockuser -d stock_assistant < backup_20240210.sql
```

### 自动备份

创建备份脚本 `/opt/scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U stockuser -d stock_assistant | gzip > $BACKUP_DIR/stock_assistant_$DATE.sql.gz

# 保留最近7天的备份
find $BACKUP_DIR -name "stock_assistant_*.sql.gz" -mtime +7 -delete
```

添加到 crontab:

```bash
crontab -e

# 每天凌晨2点备份
0 2 * * * /opt/scripts/backup-db.sh
```

---

## 🚀 启动服务

### Docker 部署

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 重启服务
docker-compose restart app

# 更新代码后重新部署
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### 传统部署

```bash
# 重启服务
sudo systemctl restart stock-assistant-app
sudo systemctl restart stock-assistant-python

# 查看日志
sudo journalctl -u stock-assistant-app -f

# 更新代码
cd /opt/stock-assistant
git pull
pnpm install
pnpm run build
sudo systemctl restart stock-assistant-app
```

---

## 🎯 生产环境优化

### 1. 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    # Next.js 应用
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location /_next/static {
        proxy_pass http://localhost:5000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # 日志
    access_log /var/log/nginx/stock-assistant-access.log;
    error_log /var/log/nginx/stock-assistant-error.log;
}
```

### 2. 配置 HTTPS（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 3. 性能优化

```bash
# 增加文件描述符限制
sudo nano /etc/security/limits.conf

# 添加以下内容
* soft nofile 65536
* hard nofile 65536
```

### 4. 监控配置

安装监控工具：

```bash
# 安装 Prometheus + Grafana
# ... (省略详细配置)

# 简单的健康检查
curl http://localhost:5000/health
```

---

## ❓ 常见问题

### 1. 端口被占用

```bash
# 检查端口占用
sudo ss -tuln | grep 5000

# 杀死进程
sudo kill -9 <PID>

# 或修改 .env 中的 PORT
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 测试连接
psql -U stockuser -d stock_assistant -h localhost

# 检查防火墙
sudo ufw allow 5432
```

### 3. Python 服务无法启动

```bash
# 检查 Python 依赖
cd stock-service
source venv/bin/activate
pip install -r requirements.txt

# 查看详细日志
sudo journalctl -u stock-assistant-python -n 50
```

### 4. 内存不足

```bash
# 增加交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久启用
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 📊 监控与维护

### 日志查看

```bash
# 应用日志
sudo journalctl -u stock-assistant-app -f

# Python 服务日志
sudo journalctl -u stock-assistant-python -f

# Nginx 日志
sudo tail -f /var/log/nginx/stock-assistant-error.log

# Docker 日志
docker-compose logs -f app
```

### 健康检查

```bash
# 应用健康检查
curl http://localhost:5000/health

# Python 服务健康检查
curl http://localhost:9001/health
```

### 数据库维护

```bash
# 数据库大小检查
psql -U stockuser -d stock_assistant -c "SELECT pg_size_pretty(pg_database_size('stock_assistant'));"

# 表大小检查
psql -U stockuser -d stock_assistant -c "SELECT relname AS table_name, pg_size_pretty(pg_total_relation_size(relid)) AS size FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"

# 清理旧数据
psql -U stockuser -d stock_assistant -c "DELETE FROM recommendations WHERE created_at < NOW() - INTERVAL '90 days';"
```

### 定期维护任务

```bash
# 添加到 crontab
crontab -e

# 每周日凌晨3点清理旧日志
0 3 * * 0 find /var/log/stock-assistant -name "*.log" -mtime +30 -delete

# 每月1号清理旧建议
0 0 1 * * psql -U stockuser -d stock_assistant -c "DELETE FROM recommendations WHERE created_at < NOW() - INTERVAL '90 days';"

# 每小时检查服务状态
0 * * * * /usr/local/bin/check-services.sh
```

---

## 🔒 安全建议

1. **修改默认密码**: 修改数据库密码和配置文件中的敏感信息
2. **启用防火墙**: 只开放必要的端口（80, 443, 22）
3. **定期更新**: 定期更新系统和依赖包
4. **备份策略**: 定期备份数据库和配置文件
5. **监控告警**: 配置服务监控和异常告警
6. **SSL/TLS**: 始终使用 HTTPS
7. **访问控制**: 限制数据库访问IP

---

## 📞 获取帮助

如遇到问题，请：
1. 查看日志文件
2. 检查服务状态
3. 参考本文档的常见问题部分
4. 提交 Issue 到项目仓库

---

*本文档最后更新: 2026-02-10*
