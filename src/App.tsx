import { useState, useEffect } from 'react'
import { Bot } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { FeedList } from '@/components/FeedList'
import { ArticleView } from '@/components/ArticleView'
import { AIChat } from '@/components/AIChat'
import { ResizablePanel } from '@/components/ResizablePanel'
import { useFeedStore } from '@/stores/feedStore'

const STORAGE_KEY = 'folo-panel-layout'
const COLLAPSED_WIDTH = 48

// 默认布局配置
const DEFAULT_LAYOUT = {
    sidebar: { expanded: true, width: 240 },
    feedList: { expanded: true, width: 380 },
    aiChat: { expanded: false, width: 360 },
}

// 宽度限制
const WIDTH_LIMITS = {
    sidebar: { min: 180, max: 360 },
    feedList: { min: 280, max: 480 },
    aiChat: { min: 300, max: 500 },
}

/**
 * 主应用组件 - 四栏布局(含 AI 侧边栏)
 */
function App() {
    const { selectedArticle } = useFeedStore()

    // 从 localStorage 读取或使用默认布局
    const [layout, setLayout] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? JSON.parse(saved) : DEFAULT_LAYOUT
        } catch {
            return DEFAULT_LAYOUT
        }
    })

    // 持久化布局到 localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
    }, [layout])

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

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* 侧边栏 - 订阅源列表 */}
            <ResizablePanel
                width={layout.sidebar.expanded ? layout.sidebar.width : COLLAPSED_WIDTH}
                minWidth={WIDTH_LIMITS.sidebar.min}
                maxWidth={WIDTH_LIMITS.sidebar.max}
                onResize={(w) => handleResize('sidebar', w)}
                showHandle={layout.sidebar.expanded}
                className="border-r border-slate-200 bg-slate-100/50"
            >
                <Sidebar
                    isExpanded={layout.sidebar.expanded}
                    onToggle={() => togglePanel('sidebar')}
                />
            </ResizablePanel>

            {/* 内容区域 - 文章列表 */}
            <ResizablePanel
                width={layout.feedList.expanded ? layout.feedList.width : COLLAPSED_WIDTH}
                minWidth={WIDTH_LIMITS.feedList.min}
                maxWidth={WIDTH_LIMITS.feedList.max}
                onResize={(w) => handleResize('feedList', w)}
                showHandle={layout.feedList.expanded}
                className="border-r border-slate-200 bg-white"
            >
                <FeedList
                    isExpanded={layout.feedList.expanded}
                    onToggle={() => togglePanel('feedList')}
                />
            </ResizablePanel>

            {/* 阅读区域 - 文章详情 */}
            <article className="flex-1 overflow-y-auto bg-white relative">
                {selectedArticle ? (
                    <ArticleView />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <div className="text-center">
                            <p className="text-lg">选择一篇文章开始阅读</p>
                            <p className="text-sm mt-2">AI 会为你生成摘要</p>
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
                    className="border-l border-slate-200"
                >
                    <AIChat
                        isOpen={layout.aiChat.expanded}
                        onClose={() => togglePanel('aiChat')}
                    />
                </ResizablePanel>
            )}
        </div>
    )
}

export default App

