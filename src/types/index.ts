/**
 * 类型定义 - 参考 Folo 的数据结构设计
 */

/** 订阅源 */
export interface Feed {
    id: string
    title: string
    url: string           // RSS/Atom URL
    siteUrl?: string      // 原站地址
    category?: string     // 分类
    description?: string  // 描述
    favicon?: string      // 图标 URL
    aiFilter?: string     // AI 筛选规则
    lastFetched?: number  // 最后抓取时间戳
    createdAt: number
}

/** 文章元数据 */
export interface Article {
    id: string
    feedId: string
    title: string
    link: string
    pubDate: number       // 发布时间戳
    author?: string
    isRead: boolean
    isStarred: boolean    // 收藏
    aiSummary?: string    // AI 生成的摘要
    summaryGeneratedAt?: number
    // 注意：原文内容不存储，按需获取
}

/** 收藏的文章（包含原文） */
export interface StarredArticle extends Article {
    content: string       // 收藏时保存原文
    starredAt: number
}

/** AI 配置 */
export interface AIConfig {
    provider: 'siliconflow'
    apiKey: string
    baseUrl: string
    model: string
}

/** 默认 AI 配置 - SiliconFlow */
export const DEFAULT_AI_CONFIG: Omit<AIConfig, 'apiKey'> = {
    provider: 'siliconflow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3.2',
}

/** 应用设置 */
export interface AppSettings {
    theme: 'light' | 'dark' | 'system'
    aiConfig: AIConfig
}
