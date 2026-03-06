FROM node:24-slim

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

# 暴露端口
EXPOSE 5000

# 启动应用
CMD ["npx", "next", "start", "--port", "5000"]
