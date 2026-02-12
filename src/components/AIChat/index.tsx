/**
 * AI 对话侧边栏组件
 * 可以读取当前文章内容，与 AI 进行持续对话
 */
import { useState, useRef, useEffect } from 'react'
import { useFeedStore } from '@/stores/feedStore'
import { useUIStore } from '@/stores/uiStore'
import { toast } from 'sonner'
import { chatWithAIStream, isAIConfigured, DEFAULT_MODEL } from '@/services/ai'
import { fetchArticleContent } from '@/services/rss'
import { extractTextFromHtml } from '@/services/contentExtractor'
import { db, dbHelpers } from '@/db'
import { AI_CONSTANTS } from '@/utils/constants'
import { generateUUID } from '@/utils/uuid'
import { Message } from './types'
import { ChatNavbar } from './ChatNavbar'
import { MessageList } from './MessageList'
import { InputArea } from './InputArea'

/** 解析输入中的 @[标题](type:id) 引用 */
interface MentionRef {
    fullMatch: string
    title: string
    type: 'note' | 'article'
    id: string
}

function parseMentions(text: string): MentionRef[] {
    const regex = /@\[([^\]]+)\]\((note|article):([^)]+)\)/g
    const refs: MentionRef[] = []
    let match
    while ((match = regex.exec(text)) !== null) {
        refs.push({
            fullMatch: match[0],
            title: match[1],
            type: match[2] as 'note' | 'article',
            id: match[3],
        })
    }
    return refs
}

/** 从引用中获取实际内容，拼接为上下文字符串 */
async function resolveMentionContext(refs: MentionRef[]): Promise<string> {
    if (refs.length === 0) return ''

    const parts: string[] = []

    for (const ref of refs) {
        try {
            if (ref.type === 'note') {
                const note = await dbHelpers.getNote(ref.id)
                if (note) {
                    parts.push(`[引用笔记「${note.title}」]\n${note.content.slice(0, 2000)}`)
                }
            } else {
                const article = await db.articles.get(ref.id)
                if (article) {
                    const content = article.description || article.aiSummary || ''
                    parts.push(`[引用文章「${article.title}」]\n${content.slice(0, 2000)}`)
                }
            }
        } catch (err) {
            console.error(`[AI Chat] Failed to resolve mention ${ref.type}:${ref.id}`, err)
        }
    }

    return parts.length > 0 ? '\n\n--- 引用上下文 ---\n' + parts.join('\n\n') : ''
}

/** 移除消息中的引用标记，保留标题用于显示 */
function stripMentionMarkup(text: string): string {
    return text.replace(/@\[([^\]]+)\]\((note|article):[^)]+\)/g, '@$1')
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
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
    const [isStarred, setIsStarred] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [editingContent, setEditingContent] = useState('')

    const abortControllerRef = useRef<AbortController | null>(null)

    // Load initial data
    useEffect(() => {
        if (selectedArticle) {
            loadChatHistory()
            loadArticleContent()
            checkStarredStatus()
        }
    }, [selectedArticle?.id])

    // Save history on change
    useEffect(() => {
        if (selectedArticle && messages.length > 0) {
            saveChatHistory()
        }
    }, [messages])

    const checkStarredStatus = async () => {
        if (!selectedArticle) return
        try {
            const sessions = await db.chatSessions.where('articleId').equals(selectedArticle.id).toArray()
            if (sessions && sessions.length > 0) {
                const sessionId = sessions[0].id
                const starredSession = await db.starredChatSessions.get(sessionId)
                setIsStarred(!!starredSession)
            } else {
                setIsStarred(false)
            }
        } catch (err) {
            console.error('Failed to check starred status:', err)
            setIsStarred(false)
        }
    }

    const handleToggleStar = async () => {
        if (!selectedArticle || messages.length === 0) return
        try {
            const sessions = await db.chatSessions.where('articleId').equals(selectedArticle.id).toArray()
            if (!sessions || sessions.length === 0) return
            const sessionId = sessions[0].id
            if (isStarred) {
                await dbHelpers.unstarChatSession(sessionId)
                setIsStarred(false)
            } else {
                await dbHelpers.starChatSession(sessionId)
                setIsStarred(true)
            }
        } catch (err) {
            console.error('Failed to toggle star:', err)
        }
    }

    const loadChatHistory = async () => {
        if (!selectedArticle) return
        try {
            const history = await dbHelpers.loadChatSession(selectedArticle.id)
            if (history && history.length > 0) {
                const loadedMessages: Message[] = history.map((msg, index) => ({
                    id: `${selectedArticle.id}-${msg.role}-${index}`,
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    model: index > 0 && msg.role === 'assistant' ? selectedModel : undefined,
                }))
                setMessages(loadedMessages)
            } else {
                setMessages([])
            }
        } catch (err) {
            console.error('Failed to load chat history:', err)
            setMessages([])
        }
    }

    const saveChatHistory = async () => {
        if (!selectedArticle || messages.length === 0) return
        try {
            const chatMessages = messages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
            }))
            await dbHelpers.saveChatSession(selectedArticle.id, chatMessages, selectedModel)
        } catch (err) {
            console.error('Failed to save chat history:', err)
        }
    }

    const loadArticleContent = async () => {
        if (!selectedArticle) return
        try {
            const html = await fetchArticleContent(selectedArticle.link)
            const text = extractTextFromHtml(html)
            setArticleContent(text.slice(0, AI_CONSTANTS.MAX_CONTENT_LENGTH))
        } catch (err) {
            console.error('Failed to load article content:', err)
            if (selectedArticle.aiSummary) {
                setArticleContent(selectedArticle.aiSummary)
            }
        }
    }

    const handleSend = async (content?: string, fromMessageIndex?: number) => {
        const messageContent = content || input.trim()
        if (!messageContent || isLoading) return

        if (!isAIConfigured()) {
            toast.error('AI 功能需要配置 API Key', {
                action: {
                    label: '去配置',
                    onClick: () => useUIStore.getState().setAISettingsOpen(true)
                }
            })
            return
        }

        const abortController = new AbortController()
        abortControllerRef.current = abortController

        const userMessage: Message = {
            id: generateUUID(),
            role: 'user',
            content: stripMentionMarkup(messageContent),
            timestamp: Date.now(),
        }

        const assistantMessageId = generateUUID()
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            model: selectedModel,
            status: 'sending',
        }

        if (fromMessageIndex !== undefined) {
            setMessages(prev => [...prev.slice(0, fromMessageIndex), userMessage, assistantMessage])
        } else {
            setMessages(prev => [...prev, userMessage, assistantMessage])
        }

        setInput('')
        setIsLoading(true)

        try {
            const historyMessages = fromMessageIndex !== undefined
                ? messages.slice(0, fromMessageIndex)
                : messages

            const history = historyMessages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            }))

            // 解析 @ 引用并加载上下文
            const mentions = parseMentions(messageContent)
            const mentionContext = await resolveMentionContext(mentions)
            const fullArticleContext = articleContent + mentionContext

            await chatWithAIStream(
                stripMentionMarkup(userMessage.content),
                history,
                selectedArticle?.title || '',
                fullArticleContext,
                (chunk) => {
                    setMessages(prev =>
                        prev.map(m =>
                            m.id === assistantMessageId
                                ? { ...m, content: m.content + chunk, status: 'sending' }
                                : m
                        )
                    )
                },
                selectedModel,
                abortController.signal
            )

            // Mark as success if completed normally
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantMessageId
                        ? { ...m, status: 'success' }
                        : m
                )
            )
        } catch (err: any) {
            if (err?.name === 'AbortError' || abortController.signal.aborted) {
                console.log('[AI Chat] User aborted generation')
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMessageId
                            ? { ...m, status: 'interrupted', content: '' }
                            : m
                    )
                )
                return
            }
            console.error('AI chat error:', err)
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantMessageId
                        ? { ...m, status: 'error', error: 'Sorry, an error occurred. Please try again later.' }
                        : m
                )
            )
        } finally {
            setIsLoading(false)
            abortControllerRef.current = null
        }
    }

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setIsLoading(false)
        }
    }

    const handleDeleteMessage = async (messageId: string) => {
        setMessages(prev => prev.filter(m => m.id !== messageId))
    }

    const handleUndoLastTurn = async () => {
        setMessages(prev => {
            let lastUserIndex = -1
            for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].role === 'user') {
                    lastUserIndex = i
                    break
                }
            }
            if (lastUserIndex === -1) return prev
            return prev.slice(0, lastUserIndex)
        })
    }

    const handleRetry = async (messageIndex: number) => {
        const message = messages[messageIndex]
        if (!message || message.role !== 'assistant') return

        let userIndex = messageIndex - 1
        while (userIndex >= 0 && messages[userIndex].role !== 'user') {
            userIndex--
        }

        if (userIndex === -1) return

        const userMessage = messages[userIndex]
        await handleSend(userMessage.content, userIndex)
    }

    const handleStartEdit = (messageId: string, content: string) => {
        setEditingMessageId(messageId)
        setEditingContent(content)
    }

    const handleSaveEdit = async (messageId: string) => {
        if (!editingContent.trim()) return
        const messageIndex = messages.findIndex(m => m.id === messageId)
        if (messageIndex === -1) return

        setEditingMessageId(null)
        setEditingContent('')
        await handleSend(editingContent.trim(), messageIndex)
    }

    const handleCancelEdit = () => {
        setEditingMessageId(null)
        setEditingContent('')
    }

    const handleClear = async () => {
        setMessages([])
        if (selectedArticle) {
            try {
                await dbHelpers.saveChatSession(selectedArticle.id, [], selectedModel)
            } catch (err) {
                console.error('Failed to clear chat history:', err)
            }
        }
    }

    if (!isOpen) return null

    return (
        <div className="flex flex-col h-full border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-xl">
            <ChatNavbar
                isStarred={isStarred}
                hasMessages={messages.length > 0}
                onToggleStar={handleToggleStar}
                onClear={handleClear}
                onClose={onClose}
            />
            {selectedArticle && articleContent && (
                <div className="px-4 py-1.5 bg-orange-50/50 dark:bg-orange-900/20 border-b border-orange-100/50 dark:border-orange-800/30 text-[10px] text-orange-400 flex justify-between items-center">
                    <span className="truncate max-w-[200px]">Context: {selectedArticle.title}</span>
                    <span>{articleContent.length} chars</span>
                </div>
            )}
            <MessageList
                messages={messages}

                editingMessageId={editingMessageId}
                editingContent={editingContent}
                isAIConfigured={isAIConfigured()}
                selectedArticle={selectedArticle}
                onEditChange={setEditingContent}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onStartEdit={handleStartEdit}
                onRetry={handleRetry}
                onDelete={handleDeleteMessage}
                onSuggestionClick={(text) => setInput(text)}
            />
            <InputArea
                input={input}
                isLoading={isLoading}
                selectedArticle={selectedArticle}
                hasMessages={messages.length > 0}
                selectedModel={selectedModel}
                onInputChange={setInput}
                onSend={() => handleSend()}
                onStop={handleStopGeneration}
                onUndo={handleUndoLastTurn}
                onModelChange={setSelectedModel}
            />
        </div>
    )
}
