/**
 * 全局常量配置
 */

/** AI 内容处理相关常量 */
export const AI_CONSTANTS = {
    /** 传递给 AI 的最大内容长度（字符数） */
    MAX_CONTENT_LENGTH: 6000,

    /** 摘要生成的最大 token 数 */
    SUMMARY_MAX_TOKENS: 300,

    /** RSS description 字段的最小有效长度（少于此值需要抓取全文） */
    MIN_RSS_CONTENT_LENGTH: 300,
} as const

/** 数据过期时间常量 */
export const EXPIRY_CONSTANTS = {
    /** 文章元数据过期时间（24小时，毫秒） */
    ARTICLE_EXPIRY: 24 * 60 * 60 * 1000,

    /** AI 对话会话过期时间（24小时，毫秒） */
    CHAT_SESSION_EXPIRY: 24 * 60 * 60 * 1000,
} as const
