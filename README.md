# 股票交易应用 (Stock Trading App)

这是一个基于 React + TypeScript + Vite 构建的现代化股票交易模拟应用。

## 功能特点

- 📈 **实时图表**：使用 Recharts 展示股票历史价格走势
- 🔄 **实时数据**：模拟实时股票价格更新（每5秒）
- 🔍 **股票搜索**：支持搜索股票代码查看详情
- 💰 **模拟交易**：支持买入和卖出操作
- 📱 **响应式设计**：完美适配桌面和移动端设备
- 📋 **自选股列表**：管理关注的股票

## 快速开始

### 前置要求

- Node.js (推荐 v18 或更高版本)
- npm (通常随 Node.js 一起安装)

### 安装步骤

1. 打开终端，进入项目目录。
2. 安装项目依赖：

```bash
npm install
```

### 运行开发服务器

启动本地开发预览：

```bash
npm run dev
```

启动后，打开浏览器访问终端显示的地址（通常是 `http://localhost:5173`）。

### 构建生产版本

如果要部署应用，运行以下命令构建生产文件：
 
```bash
npm run build
```

构建产物将位于 `dist` 目录下。

## 在线部署 (GitHub Pages)

本项目已配置 GitHub Actions 自动部署。

1.  在 GitHub 上创建一个新仓库。
2.  在本地初始化 Git 并推送到远程仓库：

```bash
git init
git add .
git commit -m "feat: init project"
git branch -M main
git remote add origin <您的仓库地址>
git push -u origin main
```

3.  在 GitHub 仓库设置中：
    - 进入 **Settings** -> **Pages**
    - 在 **Build and deployment** 下，选择 **Source** 为 **GitHub Actions**
    - 以后每次推送到 `main` 分支，GitHub Actions 都会自动构建并部署到 Pages。

## 技术栈

- React 18
- TypeScript
- Vite
- Axios
- Recharts
