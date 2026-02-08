/**
 * 状态管理 - 使用 Zustand
 * 参考 Folo 的 Jotai atoms 设计，简化为 Zustand store
 */
import { create } from 'zustand'
import type { Feed, Article } from '@/types'
import { db, dbHelpers } from '@/db'
import { fetchFeed } from '@/services/rss'
import { generateSummary, filterArticlesBatch, isAIConfigured } from '@/services/ai'
import { PRESET_FEEDS, hasInitializedPresets, markPresetsInitialized } from '@/config/presetFeeds'

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
    initPresetFeeds: () => Promise<void>
    addFeed: (url: string, title?: string, category?: string, aiFilter?: string) => Promise<void>
    deleteFeed: (feedId: string) => Promise<void>
    selectFeed: (feed: Feed | null) => void
    selectArticle: (article: Article | null) => void
    refreshFeed: (feedId: string) => Promise<void>
    refreshAllFeeds: () => Promise<void>
    markArticleRead: (articleId: string) => Promise<void>
    generateArticleSummary: (article: Article) => Promise<string | null>
    starArticle: (articleId: string, content: string) => Promise<void>
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
            // 首次加载时初始化预设订阅源
            if (!hasInitializedPresets()) {
                await get().initPresetFeeds()
            }

            const feeds = await dbHelpers.getAllFeeds()
            set({ feeds, isLoading: false })
        } catch (err) {
            set({ error: '加载订阅源失败', isLoading: false })
            console.error('Failed to load feeds:', err)
        }
    },

    // 初始化预设订阅源
    initPresetFeeds: async () => {
        console.log('Initializing preset feeds...')
        for (const preset of PRESET_FEEDS) {
            try {
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

                console.log(`Added preset feed: ${preset.title}`)
            } catch (err) {
                console.error(`Failed to add preset feed ${preset.title}:`, err)
                // 即使抓取失败也添加，后续可以手动刷新
                await dbHelpers.addFeed({
                    title: preset.title,
                    url: preset.url,
                    category: preset.category,
                    description: preset.description,
                    aiFilter: preset.aiFilter,
                })
            }
        }
        markPresetsInitialized()
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
                    id: item.guid || item.link || crypto.randomUUID(),
                    feedId,
                    title: item.title || '无标题',
                    link: item.link || '',
                    pubDate: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
                    author: item.creator || item.author,
                }))
                await dbHelpers.upsertArticles(articles)
            }

            await get().loadFeeds()
            set({ isLoading: false })
        } catch (err) {
            set({ error: '添加订阅源失败，请检查 URL 是否正确', isLoading: false })
            console.error('Failed to add feed:', err)
            throw err
        }
    },

    // 删除订阅源
    deleteFeed: async (feedId: string) => {
        try {
            await dbHelpers.deleteFeed(feedId)
            const { selectedFeed } = get()
            if (selectedFeed?.id === feedId) {
                set({ selectedFeed: null, articles: [], selectedArticle: null })
            }
            await get().loadFeeds()
        } catch (err) {
            console.error('Failed to delete feed:', err)
        }
    },

    // 选择订阅源
    selectFeed: async (feed: Feed | null) => {
        set({ selectedFeed: feed, selectedArticle: null, filteredArticles: [] })
        if (feed) {
            const articles = await dbHelpers.getArticlesByFeed(feed.id)
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
                    id: item.guid || item.link || crypto.randomUUID(),
                    feedId,
                    title: item.title || '无标题',
                    link: item.link || '',
                    pubDate: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
                    author: item.creator || item.author,
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
            // 需要先获取文章原文
            const response = await fetch(
                `https://api.allorigins.win/raw?url=${encodeURIComponent(article.link)}`
            )
            const html = await response.text()

            // 简单提取文本内容
            const tempDiv = document.createElement('div')
            tempDiv.innerHTML = html
            const textContent = tempDiv.textContent || tempDiv.innerText || ''

            // 调用 AI 生成摘要
            const summary = await generateSummary(textContent.slice(0, 8000))

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

            return summary
        } catch (err) {
            console.error('Failed to generate summary:', err)
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
}))
