/**
 * 状态管理 - 使用 Zustand
 * 参考 Folo 的 Jotai atoms 设计，简化为 Zustand store
 */
import { create } from 'zustand'
import type { Feed, Article } from '@/types'
import { db, dbHelpers } from '@/db'
import { fetchFeed, fetchArticleContent } from '@/services/rss'
import { generateSummary, filterArticlesBatch, isAIConfigured } from '@/services/ai'
import { extractContentForSummary } from '@/services/contentExtractor'
import { generateUUID } from '@/utils/uuid'
import { PRESET_FEEDS } from '@/config/presetFeeds'

interface FeedState {
    // 数据
    feeds: Feed[]
    articles: Article[]
    filteredArticles: Article[]  // AI 筛选后的文章
    selectedFeed: Feed | null
    selectedArticle: Article | null

    // UI 状态
    isLoading: boolean
    isFetchingFeed: boolean
    isFiltering: boolean  // 正在 AI 筛选
    generatingSummaryIds: Set<string>
    error: string | null

    // Actions
    loadFeeds: () => Promise<void>
    initPresetFeeds: () => Promise<{ addedCount: number; skippedCount: number }>
    addFeed: (url: string, title?: string, category?: string, aiFilter?: string) => Promise<void>
    deleteFeed: (feedId: string) => Promise<void>
    selectFeed: (feed: Feed | null) => void
    selectArticle: (article: Article | null) => void
    refreshFeed: (feedId: string) => Promise<void>
    refreshAllFeeds: () => Promise<void>
    markArticleRead: (articleId: string) => Promise<void>
    generateArticleSummary: (article: Article) => Promise<string | null>
    starArticle: (articleId: string, content: string) => Promise<void>
    unstarArticle: (articleId: string) => Promise<void>
}

export const useFeedStore = create<FeedState>((set, get) => ({
    // 初始状态
    feeds: [],
    articles: [],
    filteredArticles: [],
    selectedFeed: null,
    selectedArticle: null,
    isLoading: false,
    isFetchingFeed: false,
    isFiltering: false,
    generatingSummaryIds: new Set(),
    error: null,

    // 加载所有订阅源
    loadFeeds: async () => {
        set({ isLoading: true, error: null })
        try {
            const feeds = await dbHelpers.getAllFeeds()
            set({ feeds, isLoading: false })
        } catch (err) {
            set({ error: '加载订阅源失败', isLoading: false })
            console.error('Failed to load feeds:', err)
        }
    },

    // 初始化预设订阅源（用户手动触发）
    initPresetFeeds: async () => {
        console.log('Initializing preset feeds...')
        let addedCount = 0
        let skippedCount = 0

        for (const preset of PRESET_FEEDS) {
            try {
                // 检查是否已存在该 URL 的订阅源
                const existingFeeds = get().feeds
                const exists = existingFeeds.some(f => f.url === preset.url)

                if (exists) {
                    console.log(`Skipped preset feed (already exists): ${preset.title}`)
                    skippedCount++
                    continue
                }

                const feedData = await fetchFeed(preset.url)

                await dbHelpers.addFeed({
                    title: preset.title,
                    url: preset.url,
                    siteUrl: feedData.link,
                    category: preset.category,
                    description: preset.description,
                    aiFilter: preset.aiFilter,
                    favicon: feedData.image?.url,
                })

                addedCount++
                console.log(`Added preset feed: ${preset.title}`)
            } catch (err) {
                console.error(`Failed to add preset feed ${preset.title}:`, err)
                // 即使抓取失败也添加，后续可以手动刷新
                try {
                    await dbHelpers.addFeed({
                        title: preset.title,
                        url: preset.url,
                        category: preset.category,
                        description: preset.description,
                        aiFilter: preset.aiFilter,
                    })
                    addedCount++
                } catch (dbErr) {
                    console.error(`Failed to add fallback feed ${preset.title}:`, dbErr)
                }
            }
        }

        // 重新加载订阅源列表
        await get().loadFeeds()

        console.log(`Preset feeds initialization complete: ${addedCount} added, ${skippedCount} skipped`)
        return { addedCount, skippedCount }
    },

    // 添加订阅源
    addFeed: async (url: string, title?: string, category?: string) => {
        set({ isLoading: true, error: null })
        try {
            // 先尝试获取 RSS 信息
            const feedData = await fetchFeed(url)

            const feedId = await dbHelpers.addFeed({
                title: title || feedData.title || url,
                url,
                siteUrl: feedData.link,
                category,
                favicon: feedData.image?.url,
            })

            // 保存文章元数据
            if (feedData.items.length > 0) {
                const articles = feedData.items.map(item => ({
                    id: item.guid || item.link || generateUUID(),
                    feedId,
                    title: item.title || '无标题',
                    link: item.link || '',
                    pubDate: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
                    author: item.creator || item.author,
                    description: item.content || item.description, // 用于快速生成摘要
                }))
                await dbHelpers.upsertArticles(articles)
            }

            await get().loadFeeds()
            set({ isLoading: false })
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '未知错误'
            set({
                error: '添加订阅源失败\n\n' +
                    `错误详情：${errorMsg}\n\n` +
                    '可能原因：\n' +
                    '• 该网站不支持 RSS 或已停止服务\n' +
                    '• URL 格式不正确\n' +
                    '• 网络连接问题\n\n' +
                    '建议：某些网站（如知乎、微博）需要使用 RSSHub 等服务访问',
                isLoading: false
            })
            console.error('Failed to add feed:', err)
            throw err
        }
    },

    // 删除订阅源
    deleteFeed: async (feedId: string) => {
        console.log(`[FeedStore] Deleting feed: ${feedId}`)
        try {
            await dbHelpers.deleteFeed(feedId)
            console.log(`[FeedStore] Feed deleted from DB, updating UI...`)
            const { selectedFeed } = get()
            if (selectedFeed?.id === feedId) {
                set({ selectedFeed: null, articles: [], selectedArticle: null })
            }
            await get().loadFeeds()
            console.log(`[FeedStore] Feeds reloaded successfully`)
        } catch (err) {
            console.error('[FeedStore] Failed to delete feed:', err)
            throw err
        }
    },

    // 选择订阅源
    selectFeed: async (feed: Feed | null) => {
        set({ selectedFeed: feed, selectedArticle: null, filteredArticles: [] })
        if (feed) {
            let articles = await dbHelpers.getArticlesByFeed(feed.id)

            // 如果没有文章，自动刷新获取
            if (articles.length === 0) {
                await get().refreshFeed(feed.id)
                articles = await dbHelpers.getArticlesByFeed(feed.id)
            }

            set({ articles })

            // 如果该订阅源有 AI 筛选规则，进行筛选
            if (feed.aiFilter && isAIConfigured()) {
                set({ isFiltering: true })
                try {
                    const matchedIds = await filterArticlesBatch(
                        articles.map(a => ({ id: a.id, title: a.title })),
                        feed.aiFilter
                    )
                    const filtered = articles.filter(a => matchedIds.has(a.id))
                    set({ filteredArticles: filtered, isFiltering: false })
                } catch (err) {
                    console.error('AI filter failed:', err)
                    set({ filteredArticles: articles, isFiltering: false })
                }
            } else {
                set({ filteredArticles: articles })
            }
        } else {
            set({ articles: [], filteredArticles: [] })
        }
    },

    // 选择文章
    selectArticle: (article: Article | null) => {
        set({ selectedArticle: article })
        if (article && !article.isRead) {
            get().markArticleRead(article.id)
        }
    },

    // 刷新单个订阅源
    refreshFeed: async (feedId: string) => {
        set({ isFetchingFeed: true })
        try {
            const feed = get().feeds.find(f => f.id === feedId)
            if (!feed) return

            const feedData = await fetchFeed(feed.url)

            if (feedData.items.length > 0) {
                const articles = feedData.items.map(item => ({
                    id: item.guid || item.link || generateUUID(),
                    feedId,
                    title: item.title || '无标题',
                    link: item.link || '',
                    pubDate: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
                    author: item.creator || item.author,
                    description: item.content || item.description, // 用于快速生成摘要
                }))
                await dbHelpers.upsertArticles(articles)
            }

            // 更新最后抓取时间
            await db.feeds.update(feedId, { lastFetched: Date.now() })

            // 如果当前选中的是这个订阅源，刷新文章列表
            if (get().selectedFeed?.id === feedId) {
                const articles = await dbHelpers.getArticlesByFeed(feedId)
                set({ articles })
            }
        } catch (err) {
            console.error('Failed to refresh feed:', err)
        } finally {
            set({ isFetchingFeed: false })
        }
    },

    // 刷新所有订阅源
    refreshAllFeeds: async () => {
        const { feeds, refreshFeed } = get()
        for (const feed of feeds) {
            await refreshFeed(feed.id)
        }
    },

    // 标记已读
    markArticleRead: async (articleId: string) => {
        await dbHelpers.markAsRead(articleId)
        set(state => ({
            articles: state.articles.map(a =>
                a.id === articleId ? { ...a, isRead: true } : a
            ),
            selectedArticle: state.selectedArticle?.id === articleId
                ? { ...state.selectedArticle, isRead: true }
                : state.selectedArticle,
        }))
    },

    // 生成 AI 摘要
    generateArticleSummary: async (article: Article) => {
        // 如果已有摘要，直接返回
        if (article.aiSummary) {
            return article.aiSummary
        }

        set(state => ({ generatingSummaryIds: new Set([...state.generatingSummaryIds, article.id]) }))
        try {
            // 使用智能内容提取服务
            const { content, source } = await extractContentForSummary(
                article.description, // 使用 RSS 自带的 description/content 字段
                article.link,
                fetchArticleContent
            )

            console.log(`[摘要生成] ${article.title.substring(0, 30)}... | 来源: ${source}, 长度: ${content.length}`)

            // 调用 AI 生成摘要
            const summary = await generateSummary(content)

            // 保存到数据库
            await dbHelpers.updateAISummary(article.id, summary)

            // 更新状态
            set(state => ({
                articles: state.articles.map(a =>
                    a.id === article.id ? { ...a, aiSummary: summary } : a
                ),
                selectedArticle: state.selectedArticle?.id === article.id
                    ? { ...state.selectedArticle, aiSummary: summary }
                    : state.selectedArticle,
            }))

            console.log('[摘要生成] 成功')
            return summary
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '未知错误'
            console.error('[摘要生成] 失败:', errorMsg)
            return null
        } finally {
            set(state => {
                const newIds = new Set(state.generatingSummaryIds)
                newIds.delete(article.id)
                return { generatingSummaryIds: newIds }
            })
        }
    },

    // 收藏文章
    starArticle: async (articleId: string, content: string) => {
        await dbHelpers.starArticle(articleId, content)
        set(state => ({
            articles: state.articles.map(a =>
                a.id === articleId ? { ...a, isStarred: true } : a
            ),
            selectedArticle: state.selectedArticle?.id === articleId
                ? { ...state.selectedArticle, isStarred: true }
                : state.selectedArticle,
        }))
    },

    // 取消收藏文章
    unstarArticle: async (articleId: string) => {
        await dbHelpers.unstarArticle(articleId)
        set(state => ({
            articles: state.articles.map(a =>
                a.id === articleId ? { ...a, isStarred: false } : a
            ),
            selectedArticle: state.selectedArticle?.id === articleId
                ? { ...state.selectedArticle, isStarred: false }
                : state.selectedArticle,
        }))
    },
}))
