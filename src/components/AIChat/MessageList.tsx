import { useEffect, useRef, useState } from 'react'
import { Bot, User, Loader2, Edit2, RotateCcw, Trash2, Check, MessageSquare, Copy, X, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { AI_MODELS } from '@/services/ai'
import { Message } from './types'

interface MessageListProps {
    messages: Message[]

    editingMessageId: string | null
    editingContent: string
    isAIConfigured: boolean
    selectedArticle: any
    onEditChange: (content: string) => void
    onSaveEdit: (messageId: string) => void
    onCancelEdit: () => void
    onStartEdit: (messageId: string, content: string) => void
    onRetry: (index: number) => void
    onDelete: (messageId: string) => void
    onSuggestionClick: (text: string) => void
}

/** 查找模型显示名称 */
function getModelDisplayName(model: string): string {
    for (const category of Object.values(AI_MODELS)) {
        const found = category.find(m => m.id === model)
        if (found) return found.name
    }
    // 截取最后一段作为简短名称
    const parts = model.split('/')
    return parts[parts.length - 1]
}

/** 复制文本到剪贴板 */
async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text)
    } catch {
        // fallback
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
    }
}

/** 从 HTML 中提取纯文本 */
function stripHtml(html: string): string {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
}

export function MessageList({
    messages,
    editingMessageId,
    editingContent,
    isAIConfigured,
    selectedArticle,
    onEditChange,
    onSaveEdit,
    onCancelEdit,
    onStartEdit,
    onRetry,
    onDelete,
    onSuggestionClick
}: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleCopy = async (messageId: string, text: string) => {
        await copyToClipboard(text)
        setCopiedId(messageId)
        setTimeout(() => setCopiedId(null), 2000)
    }

    // === 空状态 ===
    if (!isAIConfigured) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                    <Bot size={32} className="opacity-50" />
                </div>
                <p className="text-sm">请先在设置中配置 API Key</p>
            </div>
        )
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    <MessageSquare size={28} className="text-orange-400" />
                </div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                    {selectedArticle ? '关于这篇文章，你想问什么？' : '选择一篇文章开始对话'}
                </p>
                <p className="text-xs text-slate-300 mb-6">AI 会结合文章内容为你解答</p>
                {selectedArticle && (
                    <div className="w-full max-w-xs space-y-2">
                        {[
                            '这篇文章的核心观点是什么？',
                            '用简单的话解释一下这篇文章',
                            '这篇文章有哪些值得深入思考的点？',
                        ].map((text) => (
                            <button
                                key={text}
                                onClick={() => onSuggestionClick(text)}
                                className="block w-full text-left text-sm px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all text-slate-600 hover:text-slate-800"
                            >
                                {text}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // === 消息列表 ===
    return (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
            {messages.map((message, index) => (
                <div
                    key={message.id}
                    className={clsx(
                        'group flex gap-3 animate-fadeIn',
                        message.role === 'user' && 'flex-row-reverse'
                    )}
                >

                    {/* 中断消息显示为特殊状态 */}
                    {message.status === 'interrupted' ? (
                        <div className="flex-1 mx-1">
                            <div className="flex items-center gap-2 p-2 mx-4 mb-4 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 rounded-lg">
                                <AlertCircle size={14} />
                                <span>上一次请求被中断</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onRetry(index)}
                                    className="flex items-center gap-1 hover:text-red-700 hover:bg-red-100/50 px-1.5 py-0.5 rounded transition-colors"
                                >
                                    <RotateCcw size={12} />
                                    重新生成
                                </button>
                                <button
                                    onClick={() => onDelete(message.id)}
                                    className="hover:text-red-700 hover:bg-red-100/50 p-0.5 rounded transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 头像 */}
                            <div
                                className={clsx(
                                    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                                    message.role === 'user'
                                        ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm'
                                        : 'bg-white text-orange-500 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700'
                                )}
                            >
                                {message.role === 'user' ? (
                                    <User size={14} />
                                ) : (
                                    <Bot size={14} />
                                )}
                            </div>

                            {/* 内容区 */}
                            <div className={clsx(
                                'flex flex-col gap-0.5 min-w-0',
                                message.role === 'user' ? 'items-end max-w-[85%]' : 'max-w-[90%]'
                            )}>
                                {/* 角色名 & 模型标签 */}
                                <div className={clsx(
                                    'flex items-center gap-1.5',
                                    message.role === 'user' && 'flex-row-reverse'
                                )}>
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                        {message.role === 'user' ? '你' : 'AI'}
                                    </span>
                                    {message.role === 'assistant' && message.model && (
                                        <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                            {getModelDisplayName(message.model)}
                                        </span>
                                    )}
                                </div>

                                {/* 消息气泡 / 编辑框 */}
                                {editingMessageId === message.id ? (
                                    <div className="space-y-2 mt-1 w-full">
                                        <textarea
                                            value={editingContent}
                                            onChange={(e) => onEditChange(e.target.value)}
                                            className="w-full px-3 py-2 border border-orange-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            rows={3}
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onSaveEdit(message.id)}
                                                className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs hover:bg-orange-600 flex items-center gap-1 transition-colors shadow-sm"
                                            >
                                                <Check size={12} /> 保存并重新生成
                                            </button>
                                            <button
                                                onClick={onCancelEdit}
                                                className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs hover:bg-slate-200 transition-colors dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div
                                            className={clsx(
                                                'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                                                message.role === 'user'
                                                    ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-tr-md shadow-sm'
                                                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-md shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                            )}
                                        >
                                            {message.role === 'assistant' ? (
                                                message.content ? (
                                                    <div
                                                        className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-700 prose-a:text-orange-600 dark:prose-headings:text-slate-200 dark:prose-p:text-slate-300 dark:prose-a:text-orange-400"
                                                        dangerouslySetInnerHTML={{ __html: message.content }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2 text-orange-500 py-1">
                                                        <Loader2 size={14} className="animate-spin" />
                                                        <span className="text-xs text-slate-400">思考中...</span>
                                                    </div>
                                                )
                                            ) : (
                                                <p className="whitespace-pre-wrap">{message.content}</p>
                                            )}
                                        </div>

                                        {/* 操作按钮 (Hover) */}
                                        <div className={clsx(
                                            'flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
                                            message.role === 'user' && 'justify-end'
                                        )}>
                                            {/* 复制 */}
                                            <button
                                                onClick={() => {
                                                    const text = message.role === 'assistant'
                                                        ? stripHtml(message.content)
                                                        : message.content
                                                    handleCopy(message.id, text)
                                                }}
                                                className={clsx(
                                                    "p-1 rounded transition-all flex items-center gap-1",
                                                    copiedId === message.id
                                                        ? "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                                                        : "text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:text-slate-600 dark:hover:text-slate-400 dark:hover:bg-slate-700"
                                                )}
                                                title="复制"
                                            >
                                                {copiedId === message.id ? (
                                                    <>
                                                        <Check size={12} />
                                                        <span className="text-[10px]">已复制</span>
                                                    </>
                                                ) : (
                                                    <Copy size={12} />
                                                )}
                                            </button>
                                            {/* 编辑 (仅用户消息) */}
                                            {message.role === 'user' && (
                                                <button
                                                    onClick={() => onStartEdit(message.id, message.content)}
                                                    className="p-1 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors dark:text-slate-600 dark:hover:text-orange-400 dark:hover:bg-orange-900/20"
                                                    title="编辑"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            )}
                                            {/* 重新生成 (仅 AI 消息) */}
                                            {message.role === 'assistant' && message.content && (
                                                <button
                                                    onClick={() => onRetry(index)}
                                                    className="p-1 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors dark:text-slate-600 dark:hover:text-orange-400 dark:hover:bg-orange-900/20"
                                                    title="重新生成"
                                                >
                                                    <RotateCcw size={12} />
                                                </button>
                                            )}
                                            {/* 删除 */}
                                            <button
                                                onClick={() => onDelete(message.id)}
                                                className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors dark:text-slate-600 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                                                title="删除"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    )
}
