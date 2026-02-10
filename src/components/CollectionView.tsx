import { useState, useEffect } from 'react'
import { Search, Star, MessageSquare, FileText, X } from 'lucide-react'
import { db, dbHelpers } from '@/db'
import type { CollectionItem } from '@/types'
import { useFeedStore } from '@/stores/feedStore'

interface CollectionViewProps {
    isExpanded?: boolean
    onToggle?: () => void
}

/**
 * 收藏视图组件 - 统一展示收藏的文章和AI对话
 */
export function CollectionView({ isExpanded = true, onToggle }: CollectionViewProps) {
    const [items, setItems] = useState<CollectionItem[]>([])
    const [filter, setFilter] = useState<'all' | 'article' | 'chat'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)

    const { selectArticle } = useFeedStore()

    // 加载收藏项
    const loadCollectionItems = async () => {
        setLoading(true)
        try {
            const allItems = await dbHelpers.getAllCollectionItems()
            setItems(allItems)
        } catch (error) {
            console.error('Failed to load collection items:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCollectionItems()
    }, [])

    // 过滤和搜索
    const filteredItems = items.filter(item => {
        // 类型筛选
        if (filter !== 'all' && item.type !== filter) return false

        // 搜索筛选
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return item.title.toLowerCase().includes(query) ||
                item.preview.toLowerCase().includes(query)
        }

        return true
    })

    // 取消收藏
    const handleUnstar = async (item: CollectionItem) => {
        try {
            if (item.type === 'article') {
                await dbHelpers.unstarArticle(item.id)
            } else {
                await dbHelpers.unstarChatSession(item.id)
            }
            await loadCollectionItems()
        } catch (error) {
            console.error('Failed to unstar item:', error)
        }
    }

    // 查看文章
    const handleViewArticle = async (item: CollectionItem) => {
        if (item.type === 'article') {
            const article = await db.starredArticles.get(item.id)
            if (article) {
                selectArticle(article)
            }
        } else {
            // 对话类型 - 跳转到对应文章并打开AI对话
            if (item.relatedArticleId) {
                const article = await db.articles.get(item.relatedArticleId)
                if (article) {
                    selectArticle(article)
                    // TODO: 打开AI对话面板并加载该对话
                }
            }
        }
    }

    // 格式化时间
    const formatTime = (timestamp: number) => {
        const now = Date.now()
        const diff = now - timestamp
        const minute = 60 * 1000
        const hour = 60 * minute
        const day = 24 * hour

        if (diff < hour) {
            return `${Math.floor(diff / minute)}分钟前`
        } else if (diff < day) {
            return `${Math.floor(diff / hour)}小时前`
        } else {
            return `${Math.floor(diff / day)}天前`
        }
    }

    if (!isExpanded) {
        return (
            <div className="h-full bg-slate-100/50 flex flex-col items-center pt-4 gap-2">
                <button
                    onClick={onToggle}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    title="展开收藏"
                >
                    <Star size={20} className="text-slate-600" />
                </button>
            </div>
        )
    }

    return (
        <div className="h-full bg-white flex flex-col">
            {/* 顶部栏 */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Star size={20} className="text-orange-500" />
                        我的收藏
                    </h2>
                    {onToggle && (
                        <button
                            onClick={onToggle}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title="收起"
                        >
                            <X size={18} className="text-slate-500" />
                        </button>
                    )}
                </div>

                {/* 筛选器 */}
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === 'all'
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        全部
                    </button>
                    <button
                        onClick={() => setFilter('article')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${filter === 'article'
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <FileText size={14} />
                        文章
                    </button>
                    <button
                        onClick={() => setFilter('chat')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${filter === 'chat'
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <MessageSquare size={14} />
                        对话
                    </button>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索收藏..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* 收藏列表 */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        加载中...
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Star size={48} className="mb-2 opacity-20" />
                        <p className="text-sm">暂无收藏</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {filteredItems.map(item => (
                            <div
                                key={`${item.type}-${item.id}`}
                                className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-orange-300 transition-colors cursor-pointer group"
                                onClick={() => handleViewArticle(item)}
                            >
                                {/* 标题和时间 */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                        {item.type === 'article' ? (
                                            <FileText size={16} className="text-orange-500 mt-1 flex-shrink-0" />
                                        ) : (
                                            <MessageSquare size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                                        )}
                                        <h3 className="font-medium text-slate-800 line-clamp-2 text-sm">
                                            {item.title}
                                        </h3>
                                    </div>
                                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                                        {formatTime(item.starredAt)}
                                    </span>
                                </div>

                                {/* 预览内容 */}
                                <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                                    {item.preview}
                                </p>

                                {/* 操作按钮 */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleViewArticle(item)
                                        }}
                                        className="px-3 py-1 text-xs bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                                    >
                                        查看
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleUnstar(item)
                                        }}
                                        className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                                    >
                                        取消收藏
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
