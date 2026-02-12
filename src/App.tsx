import { useState, useEffect } from 'react'
import { Bot } from 'lucide-react'
import { Toaster } from 'sonner'
import { Sidebar } from '@/components/Sidebar'
import { FeedList } from '@/components/FeedList'
import { ArticleView } from '@/components/ArticleView'
import { AIChat } from '@/components/AIChat/index'
import { CollectionView } from '@/components/CollectionView'
import { NotePanel } from '@/components/NotePanel'
import { ResizablePanel } from '@/components/ResizablePanel'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useFeedStore } from '@/stores/feedStore'
import { useThemeStore } from '@/stores/themeStore'
import { dbHelpers } from '@/db'
import { SearchModal } from '@/components/SearchModal'
import type { Note } from '@/types'

const STORAGE_KEY = 'folo-panel-layout'
const COLLAPSED_WIDTH = 48

// 默认布局配置
const DEFAULT_LAYOUT = {
    sidebar: { expanded: true, width: 240 },
    feedList: { expanded: true, width: 380 },
    aiChat: { expanded: false, width: 360 },
    notePanel: { expanded: false, width: 400 },  // 新增：笔记面板
}

// 宽度限制
const WIDTH_LIMITS = {
    sidebar: { min: 180, max: 360 },
    feedList: { min: 280, max: 480 },
    aiChat: { min: 300, max: 500 },
    notePanel: { min: 320, max: 600 },  // 新增：笔记面板
}

/**
 * 主应用组件 - 五栏布局(含 AI 侧边栏和笔记面板)
 */
function App() {
    const { selectedArticle } = useFeedStore()
    const [activeView, setActiveView] = useState<'feed' | 'collection'>('feed')
    const [selectedNote, setSelectedNote] = useState<Note | null>(null)
    const [isSearchOpen, setIsSearchOpen] = useState(false)

    // 从 localStorage 读取或使用默认布局
    const [layout, setLayout] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            // 合并保存的布局和默认布局，确保新增的属性不会丢失
            return saved ? { ...DEFAULT_LAYOUT, ...JSON.parse(saved) } : DEFAULT_LAYOUT
        } catch {
            return DEFAULT_LAYOUT
        }
    })

    // 持久化布局到 localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
    }, [layout])

    // 应用启动时清理过期数据,并设置定时清理
    useEffect(() => {
        // 立即执行一次清理
        dbHelpers.cleanupExpiredData()

        // 每小时执行一次清理
        const cleanupInterval = setInterval(() => {
            dbHelpers.cleanupExpiredData()
        }, 60 * 60 * 1000) // 1小时

        // 组件卸载时清除定时器
        return () => clearInterval(cleanupInterval)
    }, [])

    // 全局快捷键监听
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd+K 搜索
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                setIsSearchOpen(prev => !prev)
                return
            }

            // 以下快捷键仅在非输入框时生效
            const tag = (e.target as HTMLElement).tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return

            const { articles, filteredArticles, selectedFeed, selectedArticle, selectArticle } = useFeedStore.getState()
            const hasFilter = !!selectedFeed?.aiFilter
            const displayArticles = hasFilter ? filteredArticles : (filteredArticles.length > 0 ? filteredArticles : articles)

            if (e.key === 'j' || e.key === 'k') {
                // j = 下一篇，k = 上一篇
                if (displayArticles.length === 0) return
                const currentIndex = selectedArticle
                    ? displayArticles.findIndex(a => a.id === selectedArticle.id)
                    : -1
                const nextIndex = e.key === 'j'
                    ? Math.min(currentIndex + 1, displayArticles.length - 1)
                    : Math.max(currentIndex - 1, 0)
                selectArticle(displayArticles[nextIndex])
                e.preventDefault()
            } else if (e.key === 'Escape') {
                setIsSearchOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // 更新布局
    const updateLayout = (updates: Partial<typeof DEFAULT_LAYOUT>) => {
        setLayout((prev: typeof DEFAULT_LAYOUT) => ({ ...prev, ...updates }))
    }

    // 切换面板展开/收缩
    const togglePanel = (panel: keyof typeof layout) => {
        updateLayout({
            [panel]: {
                ...layout[panel],
                expanded: !layout[panel].expanded,
            },
        })
    }

    // 调整面板宽度
    const handleResize = (panel: keyof typeof layout, newWidth: number) => {
        updateLayout({
            [panel]: {
                ...layout[panel],
                width: newWidth,
            },
        })
    }

    // 订阅主题变化以触发 re-render
    useThemeStore()

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* 侧边栏 - 订阅源列表 */}
            <ResizablePanel
                width={layout.sidebar.expanded ? layout.sidebar.width : COLLAPSED_WIDTH}
                minWidth={WIDTH_LIMITS.sidebar.min}
                maxWidth={WIDTH_LIMITS.sidebar.max}
                onResize={(w) => handleResize('sidebar', w)}
                showHandle={layout.sidebar.expanded}
                className="border-r border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50"
            >
                <ErrorBoundary fallbackTitle="侧边栏出现问题">
                    <Sidebar
                        isExpanded={layout.sidebar.expanded}
                        onToggle={() => togglePanel('sidebar')}
                        activeView={activeView}
                        onViewChange={setActiveView}
                        onNotePanelToggle={() => togglePanel('notePanel')}
                        isNotePanelExpanded={layout.notePanel.expanded}
                    />
                </ErrorBoundary>
            </ResizablePanel>

            {/* 内容区域 - 条件渲染文章列表、收藏视图或笔记视图 */}
            {activeView === 'feed' ? (
                <ResizablePanel
                    width={layout.feedList.expanded ? layout.feedList.width : COLLAPSED_WIDTH}
                    minWidth={WIDTH_LIMITS.feedList.min}
                    maxWidth={WIDTH_LIMITS.feedList.max}
                    onResize={(w) => handleResize('feedList', w)}
                    showHandle={layout.feedList.expanded}
                    className="border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                    <ErrorBoundary fallbackTitle="文章列表出现问题">
                        <FeedList
                            isExpanded={layout.feedList.expanded}
                            onToggle={() => togglePanel('feedList')}
                        />
                    </ErrorBoundary>
                </ResizablePanel>
            ) : activeView === 'collection' ? (
                <div className="w-96 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <CollectionView />
                </div>
            ) : null  /* 移除notes视图 */}

            {/* 阅读区域 - 文章详情 */}
            <article className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 relative">
                {selectedArticle ? (
                    <ErrorBoundary fallbackTitle="文章渲染出现问题">
                        <ArticleView />
                    </ErrorBoundary>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                        <div className="text-center">
                            <p className="text-lg">
                                {activeView === 'collection'
                                    ? '浏览您的收藏'
                                    : '选择一篇文章开始阅读'}
                            </p>
                            <p className="text-sm mt-2">
                                {activeView === 'feed' && 'AI 会为你生成摘要'}
                            </p>
                        </div>
                    </div>
                )}

                {/* AI 聊天按钮 - 固定在右下角 */}
                {selectedArticle && !layout.aiChat.expanded && (
                    <button
                        onClick={() => togglePanel('aiChat')}
                        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-all hover:scale-105 flex items-center justify-center z-40"
                        title="与 AI 对话"
                    >
                        <Bot size={24} />
                    </button>
                )}
            </article>

            {/* AI 对话侧边栏 */}
            {layout.aiChat.expanded && (
                <ResizablePanel
                    width={layout.aiChat.width}
                    minWidth={WIDTH_LIMITS.aiChat.min}
                    maxWidth={WIDTH_LIMITS.aiChat.max}
                    onResize={(w) => handleResize('aiChat', w)}
                    showHandle={true}
                    handlePosition="left"
                    className="border-l border-slate-200 dark:border-slate-700"
                >
                    <AIChat
                        isOpen={layout.aiChat.expanded}
                        onClose={() => togglePanel('aiChat')}
                    />
                </ResizablePanel>
            )}

            {/* 笔记面板 - 最右侧 */}
            {layout.notePanel.expanded ? (
                <ResizablePanel
                    width={layout.notePanel.width}
                    minWidth={WIDTH_LIMITS.notePanel.min}
                    maxWidth={WIDTH_LIMITS.notePanel.max}
                    onResize={(w) => handleResize('notePanel', w)}
                    showHandle={true}
                    handlePosition="left"
                    className="border-l border-slate-200 dark:border-slate-700"
                >
                    <NotePanel
                        isExpanded={true}
                        width={layout.notePanel.width}
                        onToggle={() => togglePanel('notePanel')}
                        selectedNote={selectedNote}
                        onNoteChange={setSelectedNote}
                        onNoteUpdate={async () => {
                            if (selectedNote) {
                                const updated = await dbHelpers.getNote(selectedNote.id)
                                if (updated) {
                                    setSelectedNote(updated)
                                }
                            }
                        }}
                        onNoteDelete={() => {
                            setSelectedNote(null)
                        }}
                    />
                </ResizablePanel>
            ) : (
                <NotePanel
                    isExpanded={false}
                    width={48}
                    onToggle={() => togglePanel('notePanel')}
                    selectedNote={null}
                    onNoteChange={setSelectedNote}
                    onNoteUpdate={() => { }}
                    onNoteDelete={() => { }}
                />
            )}

            {/* 全局搜索模态框 */}
            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelectNote={(note) => {
                    // 确保笔记面板展开
                    if (!layout.notePanel.expanded) {
                        updateLayout({
                            notePanel: { ...layout.notePanel, expanded: true }
                        })
                    }
                    setSelectedNote(note)
                }}
            />

            {/* Toast 通知 */}
            <Toaster
                position="top-center"
                richColors
                toastOptions={{
                    style: { fontSize: '14px' },
                }}
            />
        </div>
    )
}

export default App

