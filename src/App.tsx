import { useState } from 'react'
import { Bot } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { FeedList } from '@/components/FeedList'
import { ArticleView } from '@/components/ArticleView'
import { AIChat } from '@/components/AIChat'
import { useFeedStore } from '@/stores/feedStore'

/**
 * 主应用组件 - 四栏布局（含 AI 侧边栏）
 */
function App() {
    const { selectedArticle } = useFeedStore()
    const [sidebarWidth] = useState(240)
    const [listWidth] = useState(380)
    const [aiChatWidth] = useState(360)
    const [isAIChatOpen, setIsAIChatOpen] = useState(false)

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* 侧边栏 - 订阅源列表 */}
            <aside
                className="flex-shrink-0 border-r border-slate-200 bg-slate-100/50"
                style={{ width: sidebarWidth }}
            >
                <Sidebar />
            </aside>

            {/* 内容区域 - 文章列表 */}
            <main
                className="flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto"
                style={{ width: listWidth }}
            >
                <FeedList />
            </main>

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
                {selectedArticle && !isAIChatOpen && (
                    <button
                        onClick={() => setIsAIChatOpen(true)}
                        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-all hover:scale-105 flex items-center justify-center z-40"
                        title="与 AI 对话"
                    >
                        <Bot size={24} />
                    </button>
                )}
            </article>

            {/* AI 对话侧边栏 */}
            {isAIChatOpen && (
                <aside
                    className="flex-shrink-0"
                    style={{ width: aiChatWidth }}
                >
                    <AIChat
                        isOpen={isAIChatOpen}
                        onClose={() => setIsAIChatOpen(false)}
                    />
                </aside>
            )}
        </div>
    )
}

export default App
