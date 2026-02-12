import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, StopCircle, Undo2, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { AI_MODELS } from '@/services/ai'
import { MentionSelector, type MentionItem } from './MentionSelector'

interface InputAreaProps {
    input: string
    isLoading: boolean
    selectedArticle: any
    hasMessages: boolean
    selectedModel: string
    onInputChange: (value: string) => void
    onSend: () => void
    onStop: () => void
    onUndo: () => void
    onModelChange: (model: string) => void
}

export function InputArea({
    input,
    isLoading,
    selectedArticle,
    hasMessages,
    selectedModel,
    onInputChange,
    onSend,
    onStop,
    onUndo,
    onModelChange
}: InputAreaProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false)
    const selectorRef = useRef<HTMLDivElement>(null)

    // @ 引用状态
    const [mentionQuery, setMentionQuery] = useState<string | null>(null)
    const [mentionStartPos, setMentionStartPos] = useState(0)

    // 自动调整输入框高度
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`
        }
    }, [input])

    // 点击外部关闭模型选择器
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
                setIsModelSelectorOpen(false)
            }
        }
        if (isModelSelectorOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isModelSelectorOpen])

    // 检测 @ 触发
    const handleInputChange = useCallback((value: string) => {
        onInputChange(value)

        const textarea = inputRef.current
        if (!textarea) return

        const cursorPos = textarea.selectionStart
        const textBeforeCursor = value.slice(0, cursorPos)

        // 查找最近的 @ 符号（不在 @[...] 标记内的）
        const lastAtIndex = textBeforeCursor.lastIndexOf('@')

        if (lastAtIndex >= 0) {
            const afterAt = textBeforeCursor.slice(lastAtIndex + 1)
            // 如果 @ 后面没有换行、没有空格开头，且不是已完成的标记
            if (!afterAt.includes('\n') && !afterAt.startsWith('[') && afterAt.length <= 20) {
                setMentionQuery(afterAt)
                setMentionStartPos(lastAtIndex)
                return
            }
        }

        setMentionQuery(null)
    }, [onInputChange])

    // 选中引用项
    const handleMentionSelect = useCallback((item: MentionItem) => {
        const before = input.slice(0, mentionStartPos)
        const after = input.slice(mentionStartPos + 1 + (mentionQuery?.length || 0))
        const mention = `@[${item.title}](${item.type}:${item.id}) `
        const newValue = before + mention + after

        onInputChange(newValue)
        setMentionQuery(null)

        // 聚焦并设置光标位置
        setTimeout(() => {
            if (inputRef.current) {
                const pos = before.length + mention.length
                inputRef.current.focus()
                inputRef.current.setSelectionRange(pos, pos)
            }
        }, 0)
    }, [input, mentionStartPos, mentionQuery, onInputChange])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // 如果引用菜单打开，让 MentionSelector 处理键盘事件
        if (mentionQuery !== null) {
            if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                e.preventDefault()
                return
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
        }
    }

    const getModelName = (id: string) => {
        for (const category of Object.values(AI_MODELS)) {
            const found = category.find(m => m.id === id)
            if (found) return found.name
        }
        const parts = id.split('/')
        return parts[parts.length - 1]
    }

    const canSend = input.trim() && !isLoading && selectedArticle

    return (
        <div className="border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-between px-3 py-1.5">
                {/* 模型选择器 */}
                <div className="relative" ref={selectorRef}>
                    <button
                        onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    >
                        <span className="font-medium">{getModelName(selectedModel)}</span>
                        <ChevronDown size={10} className={clsx(
                            'transition-transform',
                            isModelSelectorOpen && 'rotate-180'
                        )} />
                    </button>

                    {isModelSelectorOpen && (
                        <div className="absolute bottom-full left-0 mb-1 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-20 max-h-64 overflow-y-auto">
                            {Object.entries(AI_MODELS).map(([category, models]) => (
                                <div key={category}>
                                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        {category === 'fast' ? '⚡ 快速' : '🧠 深度思考'}
                                    </div>
                                    {models.map(model => (
                                        <button
                                            key={model.id}
                                            onClick={() => {
                                                onModelChange(model.id)
                                                setIsModelSelectorOpen(false)
                                            }}
                                            className={clsx(
                                                'w-full text-left px-3 py-2 text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors',
                                                selectedModel === model.id
                                                    ? 'text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-900/30 font-medium'
                                                    : 'text-slate-600 dark:text-slate-300'
                                            )}
                                        >
                                            {model.name}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 停止/撤回 */}
                <div className="flex items-center gap-1">
                    {isLoading && (
                        <button
                            onClick={onStop}
                            className="flex items-center gap-1 px-2 py-1 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-[11px] transition-colors"
                        >
                            <StopCircle size={12} />
                            <span>停止</span>
                        </button>
                    )}
                    {!isLoading && hasMessages && (
                        <button
                            onClick={onUndo}
                            className="p-1.5 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="撤回上一轮"
                        >
                            <Undo2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* 输入框 */}
            <div className="px-3 pb-3">
                <div className="relative bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-400 transition-all">
                    {/* @ 引用选择器 */}
                    {mentionQuery !== null && (
                        <MentionSelector
                            query={mentionQuery}
                            onSelect={handleMentionSelect}
                            onClose={() => setMentionQuery(null)}
                        />
                    )}

                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedArticle ? '输入问题... 按 @ 引用笔记或文章' : '选择文章后开始对话'}
                        disabled={!selectedArticle}
                        rows={1}
                        className="w-full pl-4 pr-12 py-3 bg-transparent border-none resize-none focus:outline-none text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500 disabled:cursor-not-allowed"
                        style={{ minHeight: '44px', maxHeight: '128px' }}
                    />
                    <div className="absolute bottom-2.5 right-2.5">
                        <button
                            onClick={onSend}
                            disabled={!canSend}
                            className={clsx(
                                'p-2 rounded-xl transition-all',
                                canSend
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-md active:scale-95'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500 cursor-not-allowed'
                            )}
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
