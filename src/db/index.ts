/**
 * IndexedDB 数据库配置 - 使用 Dexie.js
 * 参考 Folo 的数据库设计思路
 */
import Dexie, { type Table } from 'dexie'
import type {
    Feed,
    Article,
    StarredArticle,
    ChatSession,
    StarredChatSession,
    ChatMessage,
    CollectionItem,
    Note,
    NoteReference
} from '@/types'

export class FoloDatabase extends Dexie {
    feeds!: Table<Feed>
    articles!: Table<Article>
    starredArticles!: Table<StarredArticle>
    chatSessions!: Table<ChatSession>
    starredChatSessions!: Table<StarredChatSession>
    notes!: Table<Note>
    settings!: Table<{ key: string; value: unknown }>

    constructor() {
        super('folo-minimal')

        // Version 3 (原有版本)
        this.version(3).stores({
            feeds: 'id, title, category, &url, createdAt',
            articles: 'id, feedId, pubDate, isRead, isStarred',
            starredArticles: 'id, feedId, starredAt',
            settings: 'key',
        })

        // Version 4 - 添加过期机制和AI对话存储
        this.version(4).stores({
            // 订阅源表：url 为唯一索引
            feeds: 'id, title, category, &url, createdAt',

            // 文章表：添加 expiresAt 索引用于过期清理
            articles: 'id, feedId, pubDate, isRead, isStarred, expiresAt',

            // 收藏文章表（包含原文）
            starredArticles: 'id, feedId, starredAt',

            // AI对话会话表
            chatSessions: 'id, articleId, expiresAt, createdAt',

            // 设置表
            settings: 'key',
        }).upgrade(async (trans) => {
            // 迁移现有文章,添加过期时间(24小时后)
            const now = Date.now()
            const expiresAt = now + 24 * 60 * 60 * 1000

            await trans.table('articles').toCollection().modify((article: Article) => {
                if (!article.expiresAt) {
                    article.expiresAt = expiresAt
                }
            })
        })

        // Version 5 - 添加收藏对话表
        this.version(5).stores({
            feeds: 'id, title, category, &url, createdAt',
            articles: 'id, feedId, pubDate, isRead, isStarred, expiresAt',
            starredArticles: 'id, feedId, starredAt',
            chatSessions: 'id, articleId, expiresAt, createdAt',
            starredChatSessions: 'id, articleId, starredAt',  // 新增收藏对话表
            settings: 'key',
        })

        // Version 6 - 添加笔记表
        this.version(6).stores({
            feeds: 'id, title, category, &url, createdAt',
            articles: 'id, feedId, pubDate, isRead, isStarred, expiresAt',
            starredArticles: 'id, feedId, starredAt',
            chatSessions: 'id, articleId, expiresAt, createdAt',
            starredChatSessions: 'id, articleId, starredAt',
            notes: 'id, title, createdAt, updatedAt',  // 新增笔记表
            settings: 'key',
        })
    }
}

export const db = new FoloDatabase()

/**
 * 生成UUID v4字符串（兼容性处理）
 */
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

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

        const id = generateUUID()
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
        console.log(`[DB] Starting to delete feed: ${feedId}`)
        try {
            await db.transaction('rw', [db.feeds, db.articles], async () => {
                console.log(`[DB] Deleting feed from feeds table...`)
                await db.feeds.delete(feedId)
                console.log(`[DB] Deleting articles for feed...`)
                await db.articles.where('feedId').equals(feedId).delete()
                console.log(`[DB] Deletion completed successfully`)
            })
        } catch (error) {
            console.error(`[DB] Error deleting feed:`, error)
            throw error
        }
    },

    /** 添加或更新文章 */
    async upsertArticles(articles: Omit<Article, 'isRead' | 'isStarred'>[]): Promise<void> {
        const now = Date.now()
        const expiresAt = now + 24 * 60 * 60 * 1000 // 24小时后过期

        const articlesToAdd = articles.map(article => ({
            ...article,
            isRead: false,
            isStarred: false,
            expiresAt: article.expiresAt || expiresAt, // 如果已有过期时间则保留,否则设置新的
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
        const now = Date.now()
        const expiresAt = now + 24 * 60 * 60 * 1000 // 重置过期时间为24小时后

        await db.articles.update(articleId, {
            aiSummary: summary,
            summaryGeneratedAt: now,
            expiresAt,
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

    /** 获取所有已浏览的文章（用于@引用选择器） */
    async getAllArticles(): Promise<Article[]> {
        return await db.articles.orderBy('pubDate').reverse().toArray()
    },

    /** 保存AI对话会话 */
    async saveChatSession(
        articleId: string,
        messages: ChatMessage[],
        model: string
    ): Promise<void> {
        const now = Date.now()
        const expiresAt = now + 24 * 60 * 60 * 1000 // 24小时后过期

        // 查找现有会话
        const existing = await db.chatSessions
            .where('articleId').equals(articleId)
            .first()

        if (existing) {
            // 更新现有会话
            await db.chatSessions.update(existing.id, {
                messages,
                model,
                lastUpdatedAt: now,
                expiresAt, // 重新计算过期时间
            })
        } else {
            // 创建新会话
            await db.chatSessions.add({
                id: generateUUID(),
                articleId,
                messages,
                model,
                createdAt: now,
                lastUpdatedAt: now,
                expiresAt,
            })
        }
    },

    /** 加载AI对话会话 */
    async loadChatSession(articleId: string): Promise<ChatMessage[] | null> {
        const session = await db.chatSessions
            .where('articleId').equals(articleId)
            .first()

        if (!session) return null

        // 检查是否过期
        if (session.expiresAt < Date.now()) {
            await db.chatSessions.delete(session.id)
            return null
        }

        return session.messages
    },

    /** 清理过期数据 */
    async cleanupExpiredData(): Promise<void> {
        const now = Date.now()

        console.log('[DB] Starting cleanup of expired data...')

        try {
            // 清理过期的文章元数据(保留收藏的文章)
            const expiredArticles = await db.articles
                .where('expiresAt').below(now)
                .and(article => !article.isStarred)
                .count()

            if (expiredArticles > 0) {
                await db.articles
                    .where('expiresAt').below(now)
                    .and(article => !article.isStarred)
                    .delete()
                console.log(`[DB] Cleaned up ${expiredArticles} expired articles`)
            }

            // 清理过期的AI对话
            const expiredChats = await db.chatSessions
                .where('expiresAt').below(now)
                .count()

            if (expiredChats > 0) {
                await db.chatSessions
                    .where('expiresAt').below(now)
                    .delete()
                console.log(`[DB] Cleaned up ${expiredChats} expired chat sessions`)
            }

            console.log('[DB] Cleanup completed')
        } catch (error) {
            console.error('[DB] Error during cleanup:', error)
        }
    },

    /** 检查文章是否过期 */
    isArticleExpired(article: Article): boolean {
        return !!article.expiresAt && article.expiresAt < Date.now()
    },

    /** 收藏AI对话 */
    async starChatSession(
        sessionId: string,
        customTitle?: string
    ): Promise<void> {
        const session = await db.chatSessions.get(sessionId)
        if (!session) return

        // 获取关联文章的标题作为快照
        const article = await db.articles.get(session.articleId)
        const articleTitle = article?.title

        await db.starredChatSessions.put({
            ...session,
            starredAt: Date.now(),
            title: customTitle,
            articleTitle,
        })
    },

    /** 取消收藏AI对话 */
    async unstarChatSession(sessionId: string): Promise<void> {
        await db.starredChatSessions.delete(sessionId)
    },

    /** 获取所有收藏的对话 */
    async getStarredChatSessions(): Promise<StarredChatSession[]> {
        return db.starredChatSessions
            .orderBy('starredAt')
            .reverse()
            .toArray()
    },

    /** 获取所有收藏项（文章+对话） */
    async getAllCollectionItems(): Promise<CollectionItem[]> {
        const [articles, chats] = await Promise.all([
            db.starredArticles.toArray(),
            db.starredChatSessions.toArray(),
        ])

        const articleItems: CollectionItem[] = articles.map(article => ({
            id: article.id,
            type: 'article' as const,
            title: article.title,
            preview: article.aiSummary || article.content?.substring(0, 200) || '',
            starredAt: article.starredAt,
            relatedArticleId: article.id,
        }))

        const chatItems: CollectionItem[] = chats.map(chat => ({
            id: chat.id,
            type: 'chat' as const,
            title: chat.title || chat.articleTitle || '未命名对话',
            preview: chat.messages[0]?.content?.substring(0, 200) || '',
            starredAt: chat.starredAt,
            relatedArticleId: chat.articleId,
        }))

        return [...articleItems, ...chatItems]
            .sort((a, b) => b.starredAt - a.starredAt)
    },

    /** ========== 笔记管理 ========== */

    /** 创建笔记 */
    async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const now = Date.now()
        const id = generateUUID()

        const newNote: Note = {
            id,
            ...note,
            createdAt: now,
            updatedAt: now,
        }

        await db.notes.add(newNote)
        return id
    },

    /** 更新笔记 */
    async updateNote(noteId: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void> {
        await db.notes.update(noteId, {
            ...updates,
            updatedAt: Date.now(),
        })
    },

    /** 删除笔记 */
    async deleteNote(noteId: string): Promise<void> {
        await db.notes.delete(noteId)
    },

    /** 获取所有笔记 */
    async getAllNotes(): Promise<Note[]> {
        return await db.notes.orderBy('updatedAt').reverse().toArray()
    },

    /** 获取单个笔记 */
    async getNote(noteId: string): Promise<Note | undefined> {
        return await db.notes.get(noteId)
    },

    /** 添加引用到笔记 */
    async addReferenceToNote(noteId: string, reference: NoteReference): Promise<void> {
        const note = await db.notes.get(noteId)
        if (!note) {
            throw new Error('Note not found')
        }

        const references = note.references || []
        references.push(reference)

        await db.notes.update(noteId, {
            references,
            updatedAt: Date.now(),
        })
    },
}
