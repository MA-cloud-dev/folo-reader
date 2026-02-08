# Folo 极简阅读器

<p align="center">
  <strong>AI 优先的个人 RSS 阅读器 —— 先看摘要，按需深入</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#项目结构">项目结构</a>
</p>

---

## 功能特性

### 📰 智能阅读
- **AI 摘要卡片流**：自动为文章生成中文摘要，快速浏览
- **三栏布局**：订阅源 → 文章列表 → 阅读详情
- **本地优先**：数据存储在 IndexedDB，无需后端

### 🤖 AI 能力
- **智能摘要**：基于 SiliconFlow API，自动提取文章核心观点
- **AI 对话**：基于当前文章内容进行持续对话
- **智能筛选**：根据自然语言规则过滤不感兴趣的内容

### ⚙️ 个性化配置
- **全局 AI 设置**：支持自定义 API Base URL、API Key、模型
- **预设订阅源**：内置足球、AI 应用、AI 理论等精选源
- **分类管理**：订阅源按分类分组展示

---

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置 AI（可选但推荐）

复制 `.env.example` 为 `.env`，填入 API Key：

```bash
cp .env.example .env
```

或在应用内通过 **AI 设置** 进行配置。

### 3. 启动

```bash
pnpm dev
```

打开 http://localhost:5173 即可使用。

---

## 内置订阅源

首次启动时自动添加以下订阅源：

| 分类 | 订阅源 | AI 筛选规则 |
|------|--------|-------------|
| ⚽ 足球 | BBC 英超、ESPN 足球、懂球帝热门 | 英超/梅西/C罗 相关 |
| 🤖 AI 应用 | GitHub 热门、Hacker News、Hugging Face | AI/机器学习/开源 相关 |
| 🧠 AI 理论 | OpenAI、Google AI、Anthropic、机器之心 | 无筛选 |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 样式 | TailwindCSS |
| 状态管理 | Zustand |
| 本地存储 | Dexie.js (IndexedDB) |
| AI 服务 | SiliconFlow API (OpenAI 兼容) |

---

## 项目结构

```
src/
├── components/          # UI 组件
│   ├── Sidebar.tsx     # 侧边栏（订阅源列表）
│   ├── FeedList.tsx    # 文章列表（AI 摘要卡片）
│   ├── ArticleView.tsx # 文章详情
│   ├── AIChat.tsx      # AI 对话侧边栏
│   └── AISettings.tsx  # AI 设置弹窗
├── config/
│   └── presetFeeds.ts  # 预设订阅源配置
├── db/
│   └── index.ts        # IndexedDB 数据库
├── services/
│   ├── ai.ts           # AI 服务（摘要/对话/筛选）
│   └── rss.ts          # RSS 解析服务
├── stores/
│   └── feedStore.ts    # Zustand 状态管理
├── types/
│   └── index.ts        # TypeScript 类型定义
├── App.tsx             # 主应用组件
├── main.tsx            # 入口文件
└── index.css           # 全局样式
```

---

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_SILICONFLOW_API_KEY` | SiliconFlow API Key | - |

---

## 获取 API Key

1. 访问 https://siliconflow.cn
2. 注册账号并登录
3. 在控制台创建 API Key
4. 填入 `.env` 文件或在应用内 **AI 设置** 中配置

---

## License

MIT
