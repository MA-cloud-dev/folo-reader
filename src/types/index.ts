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
    description?: string  // RSS 源的 description/content 字段（用于快速生成摘要）
    isRead: boolean
    isStarred: boolean    // 收藏
    aiSummary?: string    // AI 生成的摘要
    summaryGeneratedAt?: number
    expiresAt?: number    // 过期时间戳(24小时后)
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

/** AI对话消息 */
export interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}

/** AI对话会话 */
export interface ChatSession {
    id: string              // 会话ID
    articleId: string       // 关联文章ID
    messages: ChatMessage[] // 对话消息列表
    model: string           // 使用的AI模型
    createdAt: number       // 创建时间
    lastUpdatedAt: number   // 最后更新时间
    expiresAt: number       // 过期时间(创建时间+24小时)
}

/** 收藏的AI对话 */
export interface StarredChatSession extends ChatSession {
    starredAt: number       // 收藏时间
    title?: string          // 用户自定义标题（可选）
    articleTitle?: string   // 关联文章标题（快照）
}

/** 收藏类型枚举 */
export type CollectionItemType = 'article' | 'chat'

/** 收藏项（统一视图） */
export interface CollectionItem {
    id: string
    type: CollectionItemType
    title: string
    preview: string         // 预览内容
    starredAt: number
    relatedArticleId?: string
}

/** 笔记引用关系 */
export interface NoteReference {
    type: 'article' | 'chat'
    id: string              // articleId 或 sessionId
    title: string           // 快照标题
    snippet: string         // 引用的内容片段
    url?: string            // 文章URL（用于@引用跳转）
    addedAt: number
}

/** 笔记 */
export interface Note {
    id: string
    title: string
    content: string        // Markdown格式
    createdAt: number
    updatedAt: number
    tags?: string[]        // 可选标签

    // 内容引用（来源追溯）
    references?: NoteReference[]
}
