/**
 * 文章@提及选择器组件
 */
import { useState, useEffect } from 'react'
import { Search, FileText, ExternalLink } from 'lucide-react'
import { dbHelpers } from '@/db'
import type { Article } from '@/types'
import { clsx } from 'clsx'

interface ArticleMentionSelectorProps {
    onSelect: (article: Article) => void
    onClose: () => void
    searchQuery?: string
}

export function ArticleMentionSelector({
    onSelect,
    onClose,
    searchQuery = '',
}: ArticleMentionSelectorProps) {
    const [articles, setArticles] = useState<Article[]>([])
    const [filteredArticles, setFilteredArticles] = useState<Article[]>([])
    const [search, setSearch] = useState(searchQuery)
    const [selectedIndex, setSelectedIndex] = useState(0)

    // 加载已浏览的文章
    useEffect(() => {
        const loadArticles = async () => {
            const allArticles = await dbHelpers.getAllArticles()
            setArticles(allArticles)
        }
        loadArticles()
    }, [])

    // 过滤文章
    useEffect(() => {
        if (!search) {
            setFilteredArticles(articles.slice(0, 10)) // 最多显示10条
            return
        }

        const query = search.toLowerCase()
        const filtered = articles
            .filter(article =>
                article.title.toLowerCase().includes(query)
            )
            .slice(0, 10)
        setFilteredArticles(filtered)
        setSelectedIndex(0)
    }, [search, articles])

    // 键盘导航
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(prev =>
                    Math.min(prev + 1, filteredArticles.length - 1)
                )
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(prev => Math.max(prev - 1, 0))
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (filteredArticles[selectedIndex]) {
                    onSelect(filteredArticles[selectedIndex])
                }
            } else if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [filteredArticles, selectedIndex, onSelect, onClose])

    // 格式化时间
    const formatTime = (timestamp: number) => {
        const now = Date.now()
        const diff = now - timestamp
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (hours < 1) return '刚刚'
        if (hours < 24) return `${hours}小时前`
        if (days < 7) return `${days}天前`
        return new Date(timestamp).toLocaleDateString('zh-CN')
    }

    return (
        <div className="absolute z-50 mt-1 w-96 bg-white rounded-lg shadow-lg border border-slate-300 max-h-96 overflow-hidden">
            {/* 搜索框 */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-3">
                <div className="relative">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="搜索已浏览的文章..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        autoFocus
                    />
                </div>
            </div>

            {/* 文章列表 */}
            <div className="overflow-y-auto max-h-80">
                {filteredArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <FileText size={32} className="mb-2 opacity-30" />
                        <p className="text-sm">
                            {articles.length === 0
                                ? '还没有浏览过任何文章'
                                : '未找到匹配的文章'}
                        </p>
                    </div>
                ) : (
                    filteredArticles.map((article, index) => (
                        <button
                            key={article.id}
                            onClick={() => onSelect(article)}
                            className={clsx(
                                'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0',
                                selectedIndex === index && 'bg-orange-50'
                            )}
                        >
                            <div className="flex items-start gap-2">
                                <ExternalLink
                                    size={14}
                                    className="mt-0.5 text-slate-400 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-slate-800 line-clamp-2">
                                        {article.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {formatTime(article.pubDate)}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* 提示 */}
            <div className="border-t border-slate-200 px-4 py-2 bg-slate-50 text-xs text-slate-500">
                ↑↓ 选择 · Enter 确认 · Esc 取消
            </div>
        </div>
    )
}
