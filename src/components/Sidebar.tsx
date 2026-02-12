/**
 * 侧边栏组件 - 订阅源列表
 */
import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Trash2, Rss, ChevronRight, Settings, PanelLeftClose, PanelLeftOpen, Download, ChevronsUpDown, Star, FileText, Database, Sun, Moon } from 'lucide-react'
import { toast } from 'sonner'
import { useFeedStore } from '@/stores/feedStore'
import { useThemeStore } from '@/stores/themeStore'
import { useUIStore } from '@/stores/uiStore'
import { clsx } from 'clsx'
import { AISettings } from './AISettings'
import { AddFeedModal } from './AddFeedModal'
import { DataManagementModal } from './DataManagementModal'

interface SidebarProps {
    isExpanded: boolean
    onToggle: () => void
    activeView?: 'feed' | 'collection'
    onViewChange?: (view: 'feed' | 'collection') => void
    onNotePanelToggle?: () => void
    isNotePanelExpanded?: boolean  // 新增：笔记面板是否展开
}

export function Sidebar({ isExpanded, onToggle, activeView = 'feed', onViewChange, onNotePanelToggle, isNotePanelExpanded = false }: SidebarProps) {
    const {
        feeds,
        selectedFeed,
        isLoading,
        isFetchingFeed,
        loadFeeds,
        deleteFeed,
        selectFeed,
        refreshAllFeeds,
    } = useFeedStore()

    const { theme, isDark, setTheme } = useThemeStore()

    const [showAddModal, setShowAddModal] = useState(false)
    const { isAISettingsOpen, setAISettingsOpen } = useUIStore()
    const [showDataManagement, setShowDataManagement] = useState(false)
    const [isLoadingPresets, setIsLoadingPresets] = useState(false)

    // 分类折叠状态（localStorage 持久化）
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('folo_collapsed_categories')
            return saved ? new Set(JSON.parse(saved)) : new Set()
        } catch {
            return new Set()
        }
    })

    // 初始加载
    useEffect(() => {
        loadFeeds()
    }, [loadFeeds])

    // 持久化折叠状态
    useEffect(() => {
        localStorage.setItem('folo_collapsed_categories', JSON.stringify([...collapsedCategories]))
    }, [collapsedCategories])



    // 一键加载预设订阅源
    const handleLoadPresets = async () => {
        toast('即将加载预设信息源（共22个）', {
            description: '已存在的源将自动跳过',
            action: {
                label: '确定加载',
                onClick: async () => {
                    setIsLoadingPresets(true)
                    try {
                        const result = await useFeedStore.getState().initPresetFeeds()
                        toast.success(`加载完成！新增 ${result.addedCount} 个，跳过 ${result.skippedCount} 个`)
                    } catch (err) {
                        console.error('Failed to load presets:', err)
                        toast.error('加载预设源失败，请稍后重试')
                    } finally {
                        setIsLoadingPresets(false)
                    }
                },
            },
        })
    }

    // 切换单个分类折叠状态
    const toggleCategory = (category: string) => {
        setCollapsedCategories(prev => {
            const newSet = new Set(prev)
            if (newSet.has(category)) {
                newSet.delete(category)
            } else {
                newSet.add(category)
            }
            return newSet
        })
    }

    // 一键折叠/展开所有分类
    const toggleAllCategories = () => {
        const allCategories = Object.keys(groupedFeeds)
        const allCollapsed = allCategories.every(cat => collapsedCategories.has(cat))

        if (allCollapsed) {
            setCollapsedCategories(new Set()) // 全部展开
        } else {
            setCollapsedCategories(new Set(allCategories)) // 全部折叠
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
            <div className="flex flex-col h-full items-center py-4 gap-4 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
                {/* 展开按钮 */}
                <button
                    onClick={onToggle}
                    className="btn-ghost p-2 text-slate-600 dark:text-slate-400 hover:text-orange-500"
                    title="展开侧边栏"
                >
                    <PanelLeftOpen size={20} />
                </button>

                {/* RSS 图标 */}
                <div className="flex-1 flex items-center">
                    <Rss size={20} className="text-slate-400 dark:text-slate-500" />
                </div>

                {/* 数据管理图标 */}
                <button
                    onClick={() => setShowDataManagement(true)}
                    className="btn-ghost p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    title="数据管理"
                >
                    <Database size={16} />
                </button>

                {/* 设置图标 */}
                <button
                    onClick={() => setAISettingsOpen(true)}
                    className="btn-ghost p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    title="AI 设置"
                >
                    <Settings size={16} />
                </button>

                {/* AI 设置弹窗 */}
                <AISettings isOpen={isAISettingsOpen} onClose={() => setAISettingsOpen(false)} />
                <DataManagementModal isOpen={showDataManagement} onClose={() => setShowDataManagement(false)} />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">{/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Folo</h1>
                <div className="flex gap-1">
                    <button
                        onClick={toggleAllCategories}
                        className="btn-ghost p-2 text-slate-600 dark:text-slate-400"
                        title={Object.keys(groupedFeeds).every(cat => collapsedCategories.has(cat)) ? '展开全部' : '折叠全部'}
                    >
                        <ChevronsUpDown size={18} />
                    </button>
                    <button
                        onClick={handleLoadPresets}
                        disabled={isLoadingPresets}
                        className="btn-ghost p-2 text-slate-600 dark:text-slate-400"
                        title="加载预设源"
                    >
                        <Download size={18} className={clsx(isLoadingPresets && 'animate-pulse')} />
                    </button>
                    <button
                        onClick={() => refreshAllFeeds()}
                        disabled={isFetchingFeed}
                        className="btn-ghost p-2 text-slate-600 dark:text-slate-400"
                        title="刷新所有"
                    >
                        <RefreshCw
                            size={18}
                            className={clsx(isFetchingFeed && 'animate-spin')}
                        />
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-ghost p-2 text-slate-600 dark:text-slate-400"
                        title="添加订阅"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        onClick={onToggle}
                        className="btn-ghost p-2 text-slate-600 dark:text-slate-400"
                        title="收缩侧边栏"
                    >
                        <PanelLeftClose size={18} />
                    </button>
                </div>
            </div>

            {/* 订阅源列表 */}
            <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                        加载中...
                    </div>
                ) : feeds.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
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
                            <div
                                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                onClick={() => toggleCategory(category)}
                            >
                                <ChevronRight
                                    size={14}
                                    className={clsx(
                                        'transition-transform',
                                        !collapsedCategories.has(category) && 'rotate-90'
                                    )}
                                />
                                {category}
                                <span className="text-xs ml-auto opacity-60">({categoryFeeds.length})</span>
                            </div>
                            {!collapsedCategories.has(category) && categoryFeeds.map((feed) => (
                                <div
                                    key={feed.id}
                                    className={clsx(
                                        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                                        selectedFeed?.id === feed.id
                                            ? 'bg-orange-500 text-white'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    )}
                                    onClick={() => {
                                        selectFeed(feed)
                                        onViewChange?.('feed')
                                    }}
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
                                                toast.success(`已删除 "${feed.title}"`)
                                            }
                                        }}
                                        className={clsx(
                                            'opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 dark:hover:bg-red-500/30',
                                            selectedFeed?.id === feed.id
                                                ? 'text-white hover:bg-white/20'
                                                : 'text-red-500 dark:text-red-400'
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

            {/* 底部操作区 */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => {
                            if (activeView === 'collection') {
                                onViewChange?.('feed')
                            } else {
                                onViewChange?.('collection')
                            }
                        }}
                        className={clsx(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                            activeView === 'collection'
                                ? 'bg-orange-500 text-white'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        )}
                    >
                        <Star size={18} />
                        我的收藏
                    </button>
                    <button
                        onClick={() => onNotePanelToggle?.()}
                        className={clsx(
                            'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                            isNotePanelExpanded
                                ? 'bg-orange-500 text-white'  // active状态
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        )}
                    >
                        <FileText size={16} />
                        我的笔记
                    </button>
                    <button
                        onClick={() => setShowDataManagement(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
                    >
                        <Database size={16} />
                        数据管理
                    </button>
                    <button
                        onClick={() => setAISettingsOpen(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
                    >
                        <Settings size={16} />
                        AI 设置
                    </button>
                    <button
                        onClick={() => {
                            const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
                            setTheme(next)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
                    >
                        {isDark ? <Moon size={16} /> : <Sun size={16} />}
                        {theme === 'light' ? '浅色模式' : theme === 'dark' ? '深色模式' : '跟随系统'}
                    </button>
                </div>
            </div>

            {/* 添加订阅弹窗 */}
            <AddFeedModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

            {/* AI 设置弹窗 */}
            <AISettings isOpen={isAISettingsOpen} onClose={() => setAISettingsOpen(false)} />
            <DataManagementModal isOpen={showDataManagement} onClose={() => setShowDataManagement(false)} />
        </div>
    )
}
