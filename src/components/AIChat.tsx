/**
 * AI 对话侧边栏组件
 * 可以读取当前文章内容，与 AI 进行持续对话
 */
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, X, MessageSquare, Loader2, Trash2 } from 'lucide-react'
import { useFeedStore } from '@/stores/feedStore'
import { chatWithAI, isAIConfigured } from '@/services/ai'
import { fetchArticleContent, extractTextFromHtml } from '@/services/rss'
import { clsx } from 'clsx'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}

interface AIChatProps {
    isOpen: boolean
    onClose: () => void
}

export function AIChat({ isOpen, onClose }: AIChatProps) {
    const { selectedArticle } = useFeedStore()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [articleContent, setArticleContent] = useState<string>('')
    const [isLoadingContent, setIsLoadingContent] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // 当选中文章变化时，重置对话并加载文章内容
    useEffect(() => {
        if (selectedArticle) {
            setMessages([])
            loadArticleContent()
        }
    }, [selectedArticle?.id])

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // 加载文章内容作为上下文
    const loadArticleContent = async () => {
        if (!selectedArticle) return

        setIsLoadingContent(true)
        try {
            const html = await fetchArticleContent(selectedArticle.link)
            const text = extractTextFromHtml(html)
            setArticleContent(text.slice(0, 8000)) // 限制长度
        } catch (err) {
            console.error('Failed to load article content:', err)
            // 如果有摘要，使用摘要作为上下文
            if (selectedArticle.aiSummary) {
                setArticleContent(selectedArticle.aiSummary)
            }
        } finally {
            setIsLoadingContent(false)
        }
    }

    // 发送消息
    const handleSend = async () => {
        if (!input.trim() || isLoading || !isAIConfigured()) return

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input.trim(),
            timestamp: Date.now(),
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            // 构建对话历史
            const history = messages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }))

            // 调用 AI
            const response = await chatWithAI(
                userMessage.content,
                history,
                selectedArticle?.title || '',
                articleContent
            )

            const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response,
                timestamp: Date.now(),
            }

            setMessages(prev => [...prev, assistantMessage])
        } catch (err) {
            console.error('AI chat error:', err)
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '抱歉，发生了错误，请稍后重试。',
                timestamp: Date.now(),
            }])
        } finally {
            setIsLoading(false)
        }
    }

    // 清空对话
    const handleClear = () => {
        setMessages([])
    }

    // 快捷键发送
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (!isOpen) return null

    return (
        <div className="flex flex-col h-full border-l border-slate-200 bg-slate-50">
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                    <Bot size={20} className="text-orange-500" />
                    <span className="font-semibold text-slate-800">AI 助手</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleClear}
                        className="btn-ghost p-2 text-slate-400 hover:text-slate-600"
                        title="清空对话"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={onClose}
                        className="btn-ghost p-2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* 文章上下文提示 */}
            {selectedArticle && (
                <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 text-sm">
                    <div className="text-orange-600 font-medium truncate">
                        📄 {selectedArticle.title}
                    </div>
                    {isLoadingContent ? (
                        <div className="text-orange-400 text-xs mt-1">正在加载文章内容...</div>
                    ) : articleContent ? (
                        <div className="text-orange-400 text-xs mt-1">
                            已加载 {articleContent.length} 字作为上下文
                        </div>
                    ) : null}
                </div>
            )}

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!isAIConfigured() ? (
                    <div className="text-center text-slate-400 py-8">
                        <Bot size={32} className="mx-auto mb-2 opacity-50" />
                        <p>请先配置 API Key</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                            {selectedArticle
                                ? '可以针对这篇文章提问'
                                : '选择一篇文章开始对话'}
                        </p>
                        {selectedArticle && (
                            <div className="mt-4 space-y-2">
                                <p className="text-xs text-slate-400">试试问：</p>
                                <button
                                    onClick={() => setInput('这篇文章的核心观点是什么？')}
                                    className="block w-full text-left text-sm px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-orange-300 transition-colors"
                                >
                                    这篇文章的核心观点是什么？
                                </button>
                                <button
                                    onClick={() => setInput('用简单的话解释一下这篇文章')}
                                    className="block w-full text-left text-sm px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-orange-300 transition-colors"
                                >
                                    用简单的话解释一下这篇文章
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={clsx(
                                'flex gap-3',
                                message.role === 'user' ? 'flex-row-reverse' : ''
                            )}
                        >
                            <div
                                className={clsx(
                                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                    message.role === 'user'
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-slate-200 text-slate-600'
                                )}
                            >
                                {message.role === 'user' ? (
                                    <User size={16} />
                                ) : (
                                    <Bot size={16} />
                                )}
                            </div>
                            <div
                                className={clsx(
                                    'max-w-[80%] rounded-xl px-4 py-2 text-sm leading-relaxed',
                                    message.role === 'user'
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white border border-slate-200 text-slate-700'
                                )}
                            >
                                <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <Bot size={16} className="text-slate-600" />
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2">
                            <Loader2 size={16} className="animate-spin text-orange-500" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="p-4 border-t border-slate-200 bg-white">
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedArticle ? '针对这篇文章提问...' : '选择文章后可以提问'}
                        disabled={!selectedArticle || !isAIConfigured()}
                        rows={1}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading || !selectedArticle || !isAIConfigured()}
                        className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
