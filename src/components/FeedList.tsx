/**
 * 文章列表组件 - AI摘要卡片流视图
 */
import { useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Clock, Star, CheckCircle, Sparkles, AlertCircle, Filter, Loader2 } from 'lucide-react'
import { useFeedStore } from '@/stores/feedStore'
import { clsx } from 'clsx'
import { isAIConfigured } from '@/services/ai'

export function FeedList() {
    const {
        articles,
        filteredArticles,
        selectedFeed,
        selectedArticle,
        selectArticle,
        generateArticleSummary,
        generatingSummaryIds,
        isFiltering,
    } = useFeedStore()

    // 使用筛选后的文章列表
    const displayArticles = filteredArticles.length > 0 ? filteredArticles : articles

    // 选中订阅源时自动生成未有摘要的文章摘要
    useEffect(() => {
        if (!isAIConfigured()) return

        const articlesWithoutSummary = displayArticles
            .filter(a => !a.aiSummary)
            .slice(0, 3)

        articlesWithoutSummary.forEach(article => {
            generateArticleSummary(article)
        })
    }, [selectedFeed?.id, filteredArticles.length])

    if (!selectedFeed) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                <p>选择一个订阅源查看文章</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* 头部 */}
            <div className="flex-shrink-0 p-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800 truncate">
                    {selectedFeed.title}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    {selectedFeed.aiFilter ? (
                        <>
                            {isFiltering ? (
                                <span className="text-blue-500">
                                    <Loader2 size={12} className="inline mr-1 animate-spin" />
                                    AI 筛选中...
                                </span>
                            ) : (
                                <span className="text-green-600">
                                    <Filter size={12} className="inline mr-1" />
                                    已筛选 {displayArticles.length}/{articles.length} 篇
                                </span>
                            )}
                        </>
                    ) : (
                        <>{articles.length} 篇文章</>
                    )}
                    {!isAIConfigured() && (
                        <span className="text-amber-500 ml-2">
                            <AlertCircle size={12} className="inline mr-1" />
                            未配置 AI
                        </span>
                    )}
                </p>
            </div>

            {/* 文章卡片流 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {displayArticles.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        {isFiltering ? '正在筛选...' : '暂无文章'}
                    </div>
                ) : (
                    displayArticles.map((article) => (
                        <ArticleCard
                            key={article.id}
                            article={article}
                            isSelected={selectedArticle?.id === article.id}
                            isGenerating={generatingSummaryIds.has(article.id)}
                            onSelect={() => selectArticle(article)}
                            onGenerateSummary={() => generateArticleSummary(article)}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

interface ArticleCardProps {
    article: {
        id: string
        title: string
        link: string
        pubDate: number
        isRead: boolean
        isStarred: boolean
        aiSummary?: string
    }
    isSelected: boolean
    isGenerating: boolean
    onSelect: () => void
    onGenerateSummary: () => void
}

function ArticleCard({
    article,
    isSelected,
    isGenerating,
    onSelect,
    onGenerateSummary,
}: ArticleCardProps) {
    const timeAgo = formatDistanceToNow(new Date(article.pubDate), {
        addSuffix: true,
        locale: zhCN,
    })

    return (
        <div
            className={clsx(
                'card p-4 cursor-pointer transition-all hover:shadow-md',
                isSelected && 'ring-2 ring-orange-500',
                article.isRead && 'opacity-70'
            )}
            onClick={onSelect}
        >
            {/* 标题行 */}
            <div className="flex items-start gap-2">
                <h3
                    className={clsx(
                        'flex-1 font-medium leading-snug',
                        article.isRead ? 'text-slate-400' : 'text-slate-800'
                    )}
                >
                    {article.title}
                </h3>
                {article.isStarred && (
                    <Star size={16} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                )}
                {article.isRead && (
                    <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                )}
            </div>

            {/* AI 摘要 */}
            <div className="mt-3">
                {article.aiSummary ? (
                    <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-2 text-orange-500 font-medium">
                            <Sparkles size={14} />
                            <span className="text-xs">AI 摘要</span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">
                            {article.aiSummary}
                        </p>
                    </div>
                ) : isAIConfigured() ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onGenerateSummary()
                        }}
                        disabled={isGenerating}
                        className="text-sm text-orange-500 hover:underline flex items-center gap-1"
                    >
                        <Sparkles size={14} />
                        {isGenerating ? '生成中...' : '生成 AI 摘要'}
                    </button>
                ) : (
                    <p className="text-sm text-slate-400 italic">
                        配置 API Key 后可生成摘要
                    </p>
                )}
            </div>

            {/* 时间戳 */}
            <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
                <Clock size={12} />
                <span>{timeAgo}</span>
            </div>
        </div>
    )
}
