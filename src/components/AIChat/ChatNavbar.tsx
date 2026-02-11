import { Bot, Star, Trash2, X } from 'lucide-react'
import { clsx } from 'clsx'

interface ChatNavbarProps {
    isStarred: boolean
    hasMessages: boolean
    onToggleStar: () => void
    onClear: () => void
    onClose: () => void
}

export function ChatNavbar({
    isStarred,
    hasMessages,
    onToggleStar,
    onClear,
    onClose
}: ChatNavbarProps) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-white flex items-center justify-center shadow-sm">
                    <Bot size={16} />
                </div>
                <span className="font-semibold text-sm text-slate-800">AI 助手</span>
            </div>
            <div className="flex items-center">
                <button
                    onClick={onToggleStar}
                    disabled={!hasMessages}
                    className={clsx(
                        'p-1.5 rounded-md transition-all',
                        isStarred
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100',
                        !hasMessages && 'opacity-40 cursor-not-allowed'
                    )}
                    title={isStarred ? '取消收藏' : '收藏对话'}
                >
                    <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
                </button>
                <button
                    onClick={onClear}
                    disabled={!hasMessages}
                    className={clsx(
                        'p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all',
                        !hasMessages && 'opacity-40 cursor-not-allowed'
                    )}
                    title="清空对话"
                >
                    <Trash2 size={16} />
                </button>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all ml-1"
                    title="关闭"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    )
}
