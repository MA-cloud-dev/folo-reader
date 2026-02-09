/**
 * AI 对话侧边栏组件
 * 可以读取当前文章内容，与 AI 进行持续对话
 */
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, X, MessageSquare, Loader2, Trash2 } from 'lucide-react'
import { useFeedStore } from '@/stores/feedStore'
import { chatWithAIStream, isAIConfigured, AI_MODELS, DEFAULT_MODEL } from '@/services/ai'
import { fetchArticleContent, extractTextFromHtml } from '@/services/rss'
import { clsx } from 'clsx'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    model?: string // AI 模型名称
}

interface AIChatProps {
    isOpen: boolean
    onClose: () => void
}

// 获取模型的显示名称
function getModelDisplayName(model: string): string {
    // 先在 AI_MODELS 中查找
    for (const category of Object.values(AI_MODELS)) {
        const found = category.find(m => m.id === model)
        if (found) return found.name
    }

    // 如果没找到，返回原始 model名
    return model
}

export function AIChat({ isOpen, onClose }: AIChatProps) {
    const { selectedArticle } = useFeedStore()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [articleContent, setArticleContent] = useState<string>('')
    const [isLoadingContent, setIsLoadingContent] = useState(false)
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL) // 模型选择
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

        // 创建空的 assistant 消息用于流式填充
        const assistantMessageId = crypto.randomUUID()
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            model: selectedModel, // 记录使用的模型
        }

        setMessages(prev => [...prev, userMessage, assistantMessage])
        setInput('')
        setIsLoading(true)

        try {
            // 构建对话历史
            const history = messages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }))

            // 调用流式 AI
            await chatWithAIStream(
                userMessage.content,
                history,
                selectedArticle?.title || '',
                articleContent,
                (chunk) => {
                    // 逐步追加内容
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === assistantMessageId
                                ? { ...m, content: m.content + chunk }
                                : m
                        )
                    )
                },
                selectedModel // 传入选中的模型
            )
        } catch (err) {
            console.error('AI chat error:', err)
            // 更新错误消息
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantMessageId
                        ? { ...m, content: '抱歉，发生了错误，请稍后重试。' }
                        : m
                )
            )
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
                            className="flex gap-2"
                        >
                            {/* 头像 */}
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

                            {/* 右侧内容区：模型名称 + 消息内容垂直排列 */}
                            <div className="flex-1 flex flex-col gap-1">
                                {/* 模型名称 */}
                                {message.role === 'assistant' && message.model && (
                                    <span className="text-[10px] text-slate-400">
                                        {getModelDisplayName(message.model)}
                                    </span>
                                )}

                                {/* 消息气泡 */}
                                <div
                                    className={clsx(
                                        'rounded-xl px-4 py-2 text-sm leading-relaxed w-fit max-w-full',
                                        message.role === 'user'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-white border border-slate-200 text-slate-700'
                                    )}
                                >
                                    {message.role === 'assistant' ? (
                                        message.content ? (
                                            <div
                                                className="prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: message.content }}
                                            />
                                        ) : (
                                            <Loader2 size={16} className="animate-spin text-orange-500" />
                                        )
                                    ) : (
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="p-4 border-t border-slate-200 bg-white">
                {/* 模型选择器 */}
                <div className="mb-3">
                    <label className="text-xs text-slate-500 mb-1.5 block font-medium">模型选择</label>
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-colors"
                    >
                        <optgroup label="⚡ Fast 模型">
                            {AI_MODELS.fast.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="🧠 Thinking 模型">
                            {AI_MODELS.thinking.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>
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
