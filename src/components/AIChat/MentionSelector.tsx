/**
 * @ 引用选择器 —— 输入 @ 后弹出的笔记/文章搜索菜单
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, StickyNote, Search } from 'lucide-react'
import { dbHelpers } from '@/db'
import { clsx } from 'clsx'

export interface MentionItem {
    id: string
    type: 'note' | 'article'
    title: string
}

interface MentionSelectorProps {
    query: string
    onSelect: (item: MentionItem) => void
    onClose: () => void
}

export function MentionSelector({ query, onSelect, onClose }: MentionSelectorProps) {
    const [items, setItems] = useState<MentionItem[]>([])
    const [activeIndex, setActiveIndex] = useState(0)
    const listRef = useRef<HTMLDivElement>(null)

    // 加载并过滤数据
    useEffect(() => {
        let cancelled = false

        const load = async () => {
            const [notes, articles] = await Promise.all([
                dbHelpers.getAllNotes(),
                dbHelpers.getAllArticles(),
            ])

            if (cancelled) return

            const q = query.toLowerCase()

            const noteItems: MentionItem[] = notes
                .filter(n => n.title.toLowerCase().includes(q))
                .slice(0, 5)
                .map(n => ({ id: n.id, type: 'note', title: n.title }))

            const articleItems: MentionItem[] = articles
                .filter(a => a.title.toLowerCase().includes(q))
                .slice(0, 8)
                .map(a => ({ id: a.id, type: 'article', title: a.title }))

            setItems([...noteItems, ...articleItems])
            setActiveIndex(0)
        }

        load()
        return () => { cancelled = true }
    }, [query])

    // 键盘导航
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(prev => Math.min(prev + 1, items.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (items[activeIndex]) {
                onSelect(items[activeIndex])
            }
        } else if (e.key === 'Escape') {
            onClose()
        }
    }, [items, activeIndex, onSelect, onClose])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    // 滚动到激活项
    useEffect(() => {
        const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
        el?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex])

    if (items.length === 0) {
        return (
            <div className="absolute bottom-full left-0 mb-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Search size={14} />
                    <span>没有找到匹配的笔记或文章</span>
                </div>
            </div>
        )
    }

    // 分组
    const noteItems = items.filter(i => i.type === 'note')
    const articleItems = items.filter(i => i.type === 'article')

    let globalIndex = 0

    return (
        <div className="absolute bottom-full left-0 mb-1 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 max-h-64 overflow-y-auto" ref={listRef}>
            {noteItems.length > 0 && (
                <>
                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        📝 笔记
                    </div>
                    {noteItems.map(item => {
                        const idx = globalIndex++
                        return (
                            <button
                                key={item.id}
                                onClick={() => onSelect(item)}
                                className={clsx(
                                    'w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors',
                                    idx === activeIndex
                                        ? 'bg-orange-50 text-orange-600'
                                        : 'text-slate-600 hover:bg-slate-50'
                                )}
                            >
                                <StickyNote size={13} className="flex-shrink-0 text-orange-400" />
                                <span className="truncate">{item.title}</span>
                            </button>
                        )
                    })}
                </>
            )}

            {articleItems.length > 0 && (
                <>
                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        📄 文章
                    </div>
                    {articleItems.map(item => {
                        const idx = globalIndex++
                        return (
                            <button
                                key={item.id}
                                onClick={() => onSelect(item)}
                                className={clsx(
                                    'w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors',
                                    idx === activeIndex
                                        ? 'bg-orange-50 text-orange-600'
                                        : 'text-slate-600 hover:bg-slate-50'
                                )}
                            >
                                <FileText size={13} className="flex-shrink-0 text-blue-400" />
                                <span className="truncate">{item.title}</span>
                            </button>
                        )
                    })}
                </>
            )}
        </div>
    )
}
