/**
 * IndexedDB 数据库配置 - 使用 Dexie.js
 * 参考 Folo 的数据库设计思路
 */
import Dexie, { type Table } from 'dexie'
import type { Feed, Article, StarredArticle, AppSettings } from '@/types'

export class FoloDatabase extends Dexie {
    feeds!: Table<Feed>
    articles!: Table<Article>
    starredArticles!: Table<StarredArticle>
    settings!: Table<{ key: string; value: unknown }>

    constructor() {
        super('folo-minimal')

        this.version(3).stores({
            // 订阅源表：按 ID 索引，url 为唯一索引
            feeds: 'id, title, category, &url, createdAt',

            // 文章表：按 ID 索引，支持按订阅源、时间、阅读状态查询
            articles: 'id, feedId, pubDate, isRead, isStarred',

            // 收藏文章表（包含原文）
            starredArticles: 'id, feedId, starredAt',

            // 设置表
            settings: 'key',
        })
    }
}

export const db = new FoloDatabase()

/**
 * 数据库操作辅助函数
 */
export const dbHelpers = {
    /** 添加订阅源（自动去重，如已存在则返回现有 ID） */
    async addFeed(feed: Omit<Feed, 'id' | 'createdAt'>): Promise<string> {
        // 检查 URL 是否已存在
        const existing = await db.feeds.where('url').equals(feed.url).first()
        if (existing) {
            console.log(`Feed already exists: ${feed.url}`)
            return existing.id
        }

        const id = crypto.randomUUID()
        await db.feeds.add({
            ...feed,
            id,
            createdAt: Date.now(),
        })
        return id
    },

    /** 获取所有订阅源 */
    async getAllFeeds(): Promise<Feed[]> {
        return db.feeds.orderBy('createdAt').toArray()
    },

    /** 删除订阅源及其文章 */
    async deleteFeed(feedId: string): Promise<void> {
        await db.transaction('rw', [db.feeds, db.articles], async () => {
            await db.feeds.delete(feedId)
            await db.articles.where('feedId').equals(feedId).delete()
        })
    },

    /** 添加或更新文章 */
    async upsertArticles(articles: Omit<Article, 'isRead' | 'isStarred'>[]): Promise<void> {
        const articlesToAdd = articles.map(article => ({
            ...article,
            isRead: false,
            isStarred: false,
        }))

        await db.articles.bulkPut(articlesToAdd)
    },

    /** 获取订阅源的文章列表 */
    async getArticlesByFeed(feedId: string, limit = 50): Promise<Article[]> {
        return db.articles
            .where('feedId')
            .equals(feedId)
            .reverse()
            .sortBy('pubDate')
            .then(articles => articles.slice(0, limit))
    },

    /** 获取所有未读文章 */
    async getUnreadArticles(limit = 100): Promise<Article[]> {
        return db.articles
            .where('isRead')
            .equals(0) // Dexie 中 boolean false = 0
            .reverse()
            .sortBy('pubDate')
            .then(articles => articles.slice(0, limit))
    },

    /** 标记文章已读 */
    async markAsRead(articleId: string): Promise<void> {
        await db.articles.update(articleId, { isRead: true })
    },

    /** 更新文章 AI 摘要 */
    async updateAISummary(articleId: string, summary: string): Promise<void> {
        await db.articles.update(articleId, {
            aiSummary: summary,
            summaryGeneratedAt: Date.now(),
        })
    },

    /** 收藏文章（保存原文） */
    async starArticle(articleId: string, content: string): Promise<void> {
        const article = await db.articles.get(articleId)
        if (!article) return

        await db.transaction('rw', [db.articles, db.starredArticles], async () => {
            await db.articles.update(articleId, { isStarred: true })
            await db.starredArticles.put({
                ...article,
                content,
                isStarred: true,
                starredAt: Date.now(),
            })
        })
    },

    /** 取消收藏 */
    async unstarArticle(articleId: string): Promise<void> {
        await db.transaction('rw', [db.articles, db.starredArticles], async () => {
            await db.articles.update(articleId, { isStarred: false })
            await db.starredArticles.delete(articleId)
        })
    },
}
