import { useState, useEffect, useRef } from 'react'
import { Search, FileText, StickyNote, ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'
import { searchService, SearchResult } from '@/services/search'
import { useFeedStore } from '@/stores/feedStore'
import { Note } from '@/types'

interface SearchModalProps {
    isOpen: boolean
    onClose: () => void
    onSelectNote: (note: Note) => void
}

export function SearchModal({ isOpen, onClose, onSelectNote }: SearchModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isSearching, setIsSearching] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const { selectArticle } = useFeedStore()

    // 自动聚焦
    useEffect(() => {
        if (isOpen) {
            setQuery('')
            setResults([])
            setSelectedIndex(0)
            // 稍微延迟聚焦，等待动画/渲染
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    // 执行搜索
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query.trim()) {
                setResults([])
                return
            }

            setIsSearching(true)
            try {
                const data = await searchService.search(query)
                setResults(data)
                setSelectedIndex(0)
            } catch (err) {
                console.error('Search failed:', err)
            } finally {
                setIsSearching(false)
            }
        }, 200) // 防抖

        return () => clearTimeout(timer)
    }, [query])

    // 键盘导航
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(prev => (prev - 1 + Math.max(1, results.length)) % Math.max(1, results.length))
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (results[selectedIndex]) {
                    handleSelect(results[selectedIndex])
                }
            } else if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, results, selectedIndex])

    // 滚动跟随
    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const el = listRef.current.children[selectedIndex] as HTMLElement
            if (el) {
                el.scrollIntoView({ block: 'nearest' })
            }
        }
    }, [selectedIndex])

    const handleSelect = (item: SearchResult) => {
        if (item.type === 'article') {
            // 类型断言：searchService 保证 originalItem 是 Article
            selectArticle(item.originalItem as any)
        } else if (item.type === 'note') {
            onSelectNote(item.originalItem as any)
        }
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]">
            <div className="bg-white w-[600px] max-w-[90vw] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* 搜索框 */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                    <Search className="text-slate-400" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="搜索文章标题、笔记内容..."
                        className="flex-1 bg-transparent text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                        {isSearching && <div className="w-4 h-4 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin" />}
                        <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 text-[10px] font-medium text-slate-500 bg-slate-100 rounded border border-slate-200">ESC</kbd>
                    </div>
                </div>

                {/* 结果列表 */}
                <div
                    ref={listRef}
                    className="max-h-[60vh] overflow-y-auto p-2 space-y-1"
                >
                    {results.length > 0 ? (
                        results.map((item, index) => (
                            <div
                                key={`${item.type}-${item.id}`}
                                onClick={() => handleSelect(item)}
                                className={clsx(
                                    'flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors',
                                    index === selectedIndex ? 'bg-orange-50' : 'hover:bg-slate-50'
                                )}
                            >
                                <div className={clsx(
                                    'mt-1 p-1.5 rounded-md',
                                    item.type === 'article' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'
                                )}>
                                    {item.type === 'article' ? <FileText size={16} /> : <StickyNote size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h4 className={clsx(
                                            'font-medium truncate',
                                            index === selectedIndex ? 'text-orange-900' : 'text-slate-800'
                                        )}>
                                            {item.title}
                                        </h4>
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            {new Date(item.date).toLocaleDateString()}
                                            {index === selectedIndex && <ArrowRight size={12} className="text-orange-500" />}
                                        </span>
                                    </div>
                                    {item.subtitle && (
                                        <p className="text-xs text-slate-500 line-clamp-1">
                                            {item.subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : query.trim() ? (
                        <div className="py-12 text-center text-slate-400">
                            {isSearching ? '搜索中...' : '未找到相关内容'}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-400">
                            <p>输入关键词搜索</p>
                            <div className="flex justify-center gap-4 mt-4 text-xs">
                                <span className="flex items-center gap-1"><FileText size={12} /> 文章</span>
                                <span className="flex items-center gap-1"><StickyNote size={12} /> 笔记</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 底部提示 */}
                {results.length > 0 && (
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                        <span>
                            找到 {results.length} 个结果
                        </span>
                        <span className="flex gap-3">
                            <span>↑↓ 选择</span>
                            <span>Enter 打开</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
