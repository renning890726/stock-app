# 项目打包与部署指南

本文档介绍如何将项目打包并部署到其他环境。

---

## 📦 快速开始

### 方式一：使用打包脚本（推荐）

#### 1. 打包项目

在项目根目录执行：

```bash
# 给脚本添加执行权限（首次运行）
chmod +x scripts/package.sh

# 执行打包
./scripts/package.sh
```

打包完成后，会在项目根目录生成压缩文件：
```
stock-assistant_v20260210_153000.tar.gz
```

#### 2. 上传到目标服务器

```bash
# 使用 scp 上传
scp stock-assistant_v*.tar.gz user@target-server:/opt/

# 或使用 rsync
rsync -avz stock-assistant_v*.tar.gz user@target-server:/opt/
```

#### 3. 在目标服务器部署

```bash
# SSH 登录到目标服务器
ssh user@target-server

# 解压文件
cd /opt
tar -xzf stock-assistant_v*.tar.gz
cd stock-assistant

# 阅读快速部署说明
cat DEPLOY.md
```

---

### 方式二：手动打包

如果不想使用脚本，可以手动打包：

```bash
# 1. 创建打包目录
mkdir -p /tmp/stock-assistant-package

# 2. 复制必要文件
cp -r src public stock-service /tmp/stock-assistant-package/
cp package.json pnpm-lock.yaml next.config.ts tsconfig.json .coze /tmp/stock-assistant-package/
cp -r docs /tmp/stock-assistant-package/
cp README.md /tmp/stock-assistant-package/

# 3. 压缩
cd /tmp
tar -czf stock-assistant-manual.tar.gz stock-assistant-package/

# 4. 清理
rm -rf stock-assistant-package
```

---

## 🚀 部署方式

### 方式一：Docker 部署（最简单）

#### 优势
- ✅ 环境隔离，避免依赖冲突
- ✅ 一键部署，快速启动
- ✅ 易于迁移和备份
- ✅ 适合生产环境

#### 步骤

```bash
# 1. 解压文件
tar -xzf stock-assistant_v*.tar.gz
cd stock-assistant

# 2. 配置环境变量
cp .env.example .env
nano .env

# 修改以下变量：
# DATABASE_URL="postgresql://stockuser:stockpass123@postgres:5432/stock_assistant"
# STOCK_SERVICE_URL="http://stock-service:9001"

# 3. 启动服务
docker-compose up -d

# 4. 查看状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f app

# 6. 访问应用
# 打开浏览器访问 http://your-server-ip:5000
```

#### 常用命令

```bash
# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker exec -it stock-assistant-app bash

# 更新代码
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

---

### 方式二：传统部署（手动）

#### 优势
- ✅ 精细控制每个组件
- ✅ 可以优化系统资源
- ✅ 适合有运维经验的环境

#### 步骤

##### 1. 系统要求

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs python3 python3-pip postgresql nginx git

# 安装 pnpm
npm install -g pnpm@9
```

##### 2. 配置数据库

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

##### 3. 部署 Python 服务

```bash
# 解压文件
tar -xzf stock-assistant_v*.tar.gz
cd stock-assistant/stock-service

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务（测试）
uvicorn main:app --host 0.0.0.0 --port 9001

# 在另一个终端测试
curl http://localhost:9001/health

# Ctrl+C 停止测试，配置 Systemd 服务
```

##### 4. 部署 Next.js 应用

```bash
cd ..

# 安装依赖
pnpm install --frozen-lockfile

# 配置环境变量
cp .env.example .env
nano .env

# 必须配置：
# DATABASE_URL="postgresql://stockuser:stockpass123@localhost:5432/stock_assistant"
# STOCK_SERVICE_URL="http://localhost:9001"

# 构建应用
pnpm run build

# 启动应用（测试）
npx next start --port 5000

# 在另一个终端测试
curl http://localhost:5000/health

# Ctrl+C 停止测试，配置 Systemd 服务
```

##### 5. 配置 Systemd 服务

创建 `/etc/systemd/system/stock-assistant-app.service`:

```ini
[Unit]
Description=Stock Assistant Next.js App
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/stock-assistant
Environment="NODE_ENV=production"
EnvironmentFile=/opt/stock-assistant/.env
ExecStart=/usr/bin/npx next start --port 5000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

创建 `/etc/systemd/system/stock-assistant-python.service`:

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

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl start stock-assistant-python
sudo systemctl start stock-assistant-app
sudo systemctl enable stock-assistant-python
sudo systemctl enable stock-assistant-app
```

---

### 方式三：云服务器部署

#### 阿里云/腾讯云/AWS

1. **购买云服务器**
   - 规格：2核4GB及以上
   - 系统：Ubuntu 22.04 LTS
   - 带宽：5Mbps及以上

2. **安全组配置**
   - 开放端口：80（HTTP）、443（HTTPS）、22（SSH）、5000（应用）、9001（Python服务）

3. **部署**
   ```bash
   # SSH 登录
   ssh root@your-server-ip

   # 安装 Docker
   curl -fsSL https://get.docker.com | sh
   systemctl start docker
   systemctl enable docker

   # 上传并解压打包文件
   tar -xzf stock-assistant_v*.tar.gz
   cd stock-assistant

   # 配置并启动
   docker-compose up -d
   ```

4. **配置域名（可选）**
   ```bash
   # 安装 Nginx
   apt install nginx certbot python3-certbot-nginx

   # 配置 Nginx 反向代理
   # ...（参考 docs/DEPLOYMENT.md）

   # 申请 SSL 证书
   certbot --nginx -d your-domain.com
   ```

---

## 🔧 环境变量配置

### 必需配置

```bash
# 数据库连接
DATABASE_URL="postgresql://stockuser:password@localhost:5432/stock_assistant"

# 应用配置
NODE_ENV="production"
PORT="5000"

# Python 服务
STOCK_SERVICE_URL="http://localhost:9001"  # 或 "http://stock-service:9001" (Docker)
```

### 可选配置

```bash
# LLM 模型
LLM_MODEL="doubao-seed-1-8-251228"

# 飞书通知
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"

# 时区
TZ="Asia/Shanghai"

# 缓存配置
CACHE_TTL_TRADING="30"
CACHE_TTL_NON_TRADING="86400"
```

---

## 📊 验证部署

### 1. 检查服务状态

```bash
# Docker 部署
docker-compose ps

# 传统部署
sudo systemctl status stock-assistant-app
sudo systemctl status stock-assistant-python
```

### 2. 测试服务

```bash
# Next.js 应用
curl http://localhost:5000

# Python 服务
curl http://localhost:9001/health

# 数据库连接
psql -U stockuser -d stock_assistant -c "SELECT version();"
```

### 3. 查看日志

```bash
# Docker 部署
docker-compose logs -f app
docker-compose logs -f stock-service

# 传统部署
sudo journalctl -u stock-assistant-app -f
sudo journalctl -u stock-assistant-python -f
```

---

## 🔒 安全配置

### 1. 防火墙配置

```bash
# UFW (Ubuntu)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# iptables (CentOS)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. 修改默认密码

```bash
# 修改数据库密码
sudo -u postgres psql
ALTER USER stockuser WITH PASSWORD 'your-strong-password';
\q

# 更新 .env 文件
DATABASE_URL="postgresql://stockuser:your-strong-password@localhost:5432/stock_assistant"
```

### 3. SSL/TLS 配置

```bash
# 使用 Let's Encrypt 免费证书
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 📈 性能优化

### 1. 增加交换空间

```bash
# 如果内存不足，添加 swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. 优化数据库

```sql
-- 连接数据库
psql -U stockuser -d stock_assistant

-- 创建索引（如果需要）
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_holdings_stock_code ON holdings(stock_code);

-- 清理旧数据
DELETE FROM recommendations WHERE created_at < NOW() - INTERVAL '90 days';
VACUUM ANALYZE;
```

### 3. 配置 Nginx 缓存

```nginx
# 在 Nginx 配置中添加
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=stock_cache:10m max_size=1g inactive=60m;

location /_next/static {
    proxy_cache stock_cache;
    proxy_pass http://localhost:5000;
    proxy_cache_valid 200 60m;
    add_header Cache-Control "public, immutable";
}
```

---

## 🐛 常见问题

### 1. 端口被占用

```bash
# 查找占用端口的进程
sudo lsof -i:5000

# 杀死进程
sudo kill -9 <PID>

# 或修改 .env 中的 PORT
PORT=5001
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
# 检查 Python 版本
python3 --version

# 重新安装依赖
cd stock-service
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

### 4. 内存不足

```bash
# 查看内存使用
free -h

# 增加交换空间（参考性能优化部分）
```

---

## 📝 维护建议

### 定期备份

```bash
# 数据库备份脚本
pg_dump -U stockuser -d stock_assistant | gzip > backup_$(date +%Y%m%d).sql.gz

# 添加到 crontab
0 2 * * * pg_dump -U stockuser -d stock_assistant | gzip > /opt/backups/stock_assistant_$(date +\%Y\%m\%d).sql.gz
```

### 监控服务

```bash
# 创建健康检查脚本
#!/bin/bash
# check-services.sh

if ! curl -f http://localhost:5000 > /dev/null 2>&1; then
    echo "Next.js service is down, restarting..."
    systemctl restart stock-assistant-app
fi

if ! curl -f http://localhost:9001/health > /dev/null 2>&1; then
    echo "Python service is down, restarting..."
    systemctl restart stock-assistant-python
fi
```

### 日志管理

```bash
# 配置日志轮转
sudo nano /etc/logrotate.d/stock-assistant

/var/log/stock-assistant/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

---

## 📞 获取帮助

- 📚 完整文档：`docs/DEPLOYMENT.md`
- 📋 快速说明：包内 `DEPLOY.md`
- 💻 GitHub Issues：提交问题到项目仓库

---

*文档最后更新: 2026-02-10*
