/**
 * 侧边栏组件 - 订阅源列表
 */
import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Trash2, Rss, ChevronRight, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useFeedStore } from '@/stores/feedStore'
import { clsx } from 'clsx'
import { AISettings } from './AISettings'

interface SidebarProps {
    isExpanded: boolean
    onToggle: () => void
}

export function Sidebar({ isExpanded, onToggle }: SidebarProps) {
    const {
        feeds,
        selectedFeed,
        isLoading,
        isFetchingFeed,
        loadFeeds,
        addFeed,
        deleteFeed,
        selectFeed,
        refreshAllFeeds,
    } = useFeedStore()

    const [showAddModal, setShowAddModal] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [newFeedUrl, setNewFeedUrl] = useState('')
    const [newFeedTitle, setNewFeedTitle] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    // 初始加载
    useEffect(() => {
        loadFeeds()
    }, [loadFeeds])

    // 添加订阅源
    const handleAddFeed = async () => {
        if (!newFeedUrl.trim()) return

        setIsAdding(true)
        try {
            await addFeed(newFeedUrl.trim(), newFeedTitle.trim() || undefined)
            setNewFeedUrl('')
            setNewFeedTitle('')
            setShowAddModal(false)
        } catch (err) {
            console.error('Failed to add feed:', err)
            alert('添加订阅源失败,请检查 URL 是否正确')
        } finally {
            setIsAdding(false)
        }
    }


    // 按分类分组
    const groupedFeeds = feeds.reduce((acc, feed) => {
        const category = feed.category || '未分类'
        if (!acc[category]) acc[category] = []
        acc[category].push(feed)
        return acc
    }, {} as Record<string, typeof feeds>)

    // 收缩状态显示
    if (!isExpanded) {
        return (
            <div className="flex flex-col h-full items-center py-4 gap-4">
                {/* 展开按钮 */}
                <button
                    onClick={onToggle}
                    className="btn-ghost p-2 text-slate-600 hover:text-orange-500"
                    title="展开侧边栏"
                >
                    <PanelLeftOpen size={20} />
                </button>

                {/* RSS 图标 */}
                <div className="flex-1 flex items-center">
                    <Rss size={20} className="text-slate-400" />
                </div>

                {/* 设置图标 */}
                <button
                    onClick={() => setShowSettings(true)}
                    className="btn-ghost p-2 text-slate-400 hover:text-slate-600"
                    title="AI 设置"
                >
                    <Settings size={16} />
                </button>

                {/* AI 设置弹窗 */}
                <AISettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">{/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h1 className="text-lg font-semibold text-slate-800">Folo</h1>
                <div className="flex gap-1">
                    <button
                        onClick={() => refreshAllFeeds()}
                        disabled={isFetchingFeed}
                        className="btn-ghost p-2"
                        title="刷新所有"
                    >
                        <RefreshCw
                            size={18}
                            className={clsx(isFetchingFeed && 'animate-spin')}
                        />
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-ghost p-2"
                        title="添加订阅"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        onClick={onToggle}
                        className="btn-ghost p-2"
                        title="收缩侧边栏"
                    >
                        <PanelLeftClose size={18} />
                    </button>
                </div>
            </div>

            {/* 订阅源列表 */}
            <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                    <div className="text-center py-8 text-slate-400">
                        加载中...
                    </div>
                ) : feeds.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Rss size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">暂无订阅源</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="text-orange-500 text-sm mt-2 hover:underline"
                        >
                            添加第一个订阅
                        </button>
                    </div>
                ) : (
                    Object.entries(groupedFeeds).map(([category, categoryFeeds]) => (
                        <div key={category} className="mb-4">
                            <div className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 uppercase tracking-wider">
                                <ChevronRight size={14} />
                                {category}
                            </div>
                            {categoryFeeds.map((feed) => (
                                <div
                                    key={feed.id}
                                    className={clsx(
                                        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                                        selectedFeed?.id === feed.id
                                            ? 'bg-orange-500 text-white'
                                            : 'hover:bg-slate-100 text-slate-700'
                                    )}
                                    onClick={() => selectFeed(feed)}
                                >
                                    {feed.favicon ? (
                                        <img
                                            src={feed.favicon}
                                            alt=""
                                            className="w-4 h-4 rounded"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none'
                                            }}
                                        />
                                    ) : (
                                        <Rss size={14} className="opacity-50" />
                                    )}
                                    <span className="flex-1 truncate text-sm">{feed.title}</span>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation()
                                            const confirmed = window.confirm(`确定删除 "${feed.title}"？`)
                                            if (confirmed) {
                                                await deleteFeed(feed.id)
                                            }
                                        }}
                                        className={clsx(
                                            'opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20',
                                            selectedFeed?.id === feed.id
                                                ? 'text-white hover:bg-white/20'
                                                : 'text-red-500'
                                        )}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* 底部设置按钮 */}
            <div className="p-3 border-t border-slate-200">
                <button
                    onClick={() => setShowSettings(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors text-sm"
                >
                    <Settings size={16} />
                    AI 设置
                </button>
            </div>

            {/* 添加订阅弹窗 */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-96 max-w-[90vw]">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800">添加订阅源</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-500 mb-1">
                                    RSS 地址 *
                                </label>
                                <input
                                    type="url"
                                    value={newFeedUrl}
                                    onChange={(e) => setNewFeedUrl(e.target.value)}
                                    placeholder="https://example.com/feed.xml"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-500 mb-1">
                                    名称（可选）
                                </label>
                                <input
                                    type="text"
                                    value={newFeedTitle}
                                    onChange={(e) => setNewFeedTitle(e.target.value)}
                                    placeholder="留空则自动获取"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleAddFeed}
                                disabled={isAdding || !newFeedUrl.trim()}
                                className="flex-1 btn-primary disabled:opacity-50"
                            >
                                {isAdding ? '添加中...' : '添加'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI 设置弹窗 */}
            <AISettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </div>
    )
}

