/**
 * 文章列表组件 - AI摘要卡片流视图
 */
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Clock, Star, CheckCircle, Filter, Loader2, PanelLeftClose, PanelLeftOpen, Rss } from 'lucide-react'
import { useFeedStore } from '@/stores/feedStore'
import { clsx } from 'clsx'

interface FeedListProps {
    isExpanded: boolean
    onToggle: () => void
}

export function FeedList({ isExpanded, onToggle }: FeedListProps) {
    const {
        articles,
        filteredArticles,
        selectedFeed,
        selectedArticle,
        selectArticle,
        isFiltering,
    } = useFeedStore()

    // 使用筛选后的文章列表
    const displayArticles = filteredArticles.length > 0 ? filteredArticles : articles

    // 收缩状态显示
    if (!isExpanded) {
        return (
            <div className="flex flex-col h-full items-center py-4 gap-4">
                {/* 展开按钮 */}
                <button
                    onClick={onToggle}
                    className="btn-ghost p-2 text-slate-600 hover:text-orange-500"
                    title="展开文章列表"
                >
                    <PanelLeftOpen size={20} />
                </button>

                {/* 文章图标或订阅源图标 */}
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    {selectedFeed?.favicon ? (
                        <img
                            src={selectedFeed.favicon}
                            alt=""
                            className="w-6 h-6 rounded"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                            }}
                        />
                    ) : (
                        <Rss size={20} className="text-slate-400" />
                    )}
                    {displayArticles.length > 0 && (
                        <span className="text-xs text-slate-400">{displayArticles.length}</span>
                    )}
                </div>
            </div>
        )
    }

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
                <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-slate-800 truncate flex-1">
                        {selectedFeed.title}
                    </h2>
                    <button
                        onClick={onToggle}
                        className="btn-ghost p-2 ml-2"
                        title="收缩文章列表"
                    >
                        <PanelLeftClose size={18} />
                    </button>
                </div>
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
                            onSelect={() => selectArticle(article)}
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
    }
    isSelected: boolean
    onSelect: () => void
}

function ArticleCard({
    article,
    isSelected,
    onSelect,
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

            {/* 时间戳 */}
            <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
                <Clock size={12} />
                <span>{timeAgo}</span>
            </div>
        </div>
    )
}
