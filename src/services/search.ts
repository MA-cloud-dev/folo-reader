import { db } from '@/db'
import { Article, Note } from '@/types'

export interface SearchResult {
    id: string
    type: 'article' | 'note'
    title: string
    subtitle?: string
    snippet?: string
    date: number
    score: number // 匹配度分数
    originalItem: Article | Note
}

/**
 * 搜索服务 - 支持文章和笔记的标题搜索
 */
export const searchService = {
    /**
     * 全局搜索
     */
    async search(query: string, limit = 20): Promise<SearchResult[]> {
        if (!query || query.trim().length === 0) return []

        const NormalizedQuery = query.toLowerCase().trim()

        // 并行查询文章和笔记
        const [articles, notes] = await Promise.all([
            this.searchArticles(NormalizedQuery, limit),
            this.searchNotes(NormalizedQuery, limit)
        ])

        // 合并排序
        return [...articles, ...notes]
            .sort((a, b) => b.score - a.score) // 按相关度排序
            .slice(0, limit)
    },

    /**
     * 搜索文章
     */
    async searchArticles(query: string, _limit: number): Promise<SearchResult[]> {
        // Dexie 不支持复杂的全文搜索，这里先用 filter
        // 优化策略：先获取最近的 500 篇文章在内存中搜索（平衡性能）
        // 或者使用 startsWithIgnoreCase 对 title 索引搜索

        // 策略1: 标题匹配 (利用索引)
        // const titleMatches = await db.articles
        //     .where('title')
        //     .startsWithIgnoreCase(query)
        //     .limit(limit)
        //     .toArray()

        // 策略2: 内存过滤 (当前数据量较小，建议直接加载最近文章过滤，支持模糊搜索)
        const recentArticles = await db.articles
            .orderBy('pubDate')
            .reverse()
            .limit(500)
            .toArray()

        return recentArticles
            .filter(article => {
                const titleMatch = article.title?.toLowerCase().includes(query)
                const summaryMatch = article.aiSummary?.toLowerCase().includes(query)
                return titleMatch || summaryMatch
            })
            .map(article => {
                const isTitleMatch = article.title?.toLowerCase().includes(query)
                return {
                    id: article.id,
                    type: 'article' as const,
                    title: article.title,
                    subtitle: article.aiSummary || article.description,
                    date: article.pubDate,
                    score: isTitleMatch ? 10 : 5, // 标题匹配权重高
                    originalItem: article
                }
            })
    },

    /**
     * 搜索笔记
     */
    async searchNotes(query: string, _limit: number): Promise<SearchResult[]> {
        const notes = await db.notes.toArray() // 笔记数量通常较少，全部加载

        return notes
            .filter(note => {
                return note.title.toLowerCase().includes(query) ||
                    note.content.toLowerCase().includes(query)
            })
            .map(note => {
                const isTitleMatch = note.title.toLowerCase().includes(query)
                return {
                    id: note.id,
                    type: 'note' as const,
                    title: note.title,
                    subtitle: note.content.substring(0, 100),
                    date: note.updatedAt,
                    score: isTitleMatch ? 10 : 5,
                    originalItem: note
                }
            })
    }
}
