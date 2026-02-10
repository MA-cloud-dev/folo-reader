/**
 * 笔记列表组件
 */
import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Clock } from 'lucide-react'
import { dbHelpers } from '@/db'
import type { Note } from '@/types'
import { clsx } from 'clsx'

interface NoteListProps {
    onSelectNote: (note: Note | null) => void
    selectedNoteId?: string
    refreshTrigger?: number  // 用于触发列表刷新
}

export function NoteList({ onSelectNote, selectedNoteId, refreshTrigger }: NoteListProps) {
    const [notes, setNotes] = useState<Note[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    // 加载笔记列表
    const loadNotes = async () => {
        setIsLoading(true)
        try {
            const allNotes = await dbHelpers.getAllNotes()
            setNotes(allNotes)
        } catch (err) {
            console.error('Failed to load notes:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadNotes()
    }, [refreshTrigger])  // 监听refreshTrigger变化

    // 创建新笔记
    const handleCreateNote = async () => {
        try {
            const noteId = await dbHelpers.createNote({
                title: '未命名笔记',
                content: '',
            })
            await loadNotes()

            // 选中新创建的笔记
            const newNote = await dbHelpers.getNote(noteId)
            if (newNote) {
                onSelectNote(newNote)
            }
        } catch (err) {
            console.error('Failed to create note:', err)
        }
    }

    // 筛选笔记
    const filteredNotes = notes.filter(note => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query) ||
            note.tags?.some(tag => tag.toLowerCase().includes(query))
        )
    })

    // 格式化时间
    const formatTime = (timestamp: number) => {
        const now = Date.now()
        const diff = now - timestamp
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 1) return '刚刚'
        if (minutes < 60) return `${minutes}分钟前`
        if (hours < 24) return `${hours}小时前`
        if (days < 7) return `${days}天前`
        return new Date(timestamp).toLocaleDateString('zh-CN')
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-slate-400">加载中...</div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* 头部 */}
            <div className="flex-shrink-0 p-4 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <FileText size={20} className="text-orange-500" />
                        我的笔记
                    </h2>
                    <button
                        onClick={handleCreateNote}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={16} />
                        新建笔记
                    </button>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="搜索笔记..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            {/* 笔记列表 */}
            <div className="flex-1 overflow-y-auto p-4">
                {filteredNotes.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-30" />
                        <p>{searchQuery ? '未找到相关笔记' : '还没有笔记，点击"新建笔记"开始创作'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                className={clsx(
                                    'bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md',
                                    selectedNoteId === note.id
                                        ? 'border-orange-500 ring-2 ring-orange-100'
                                        : 'border-slate-200 hover:border-orange-300'
                                )}
                                onClick={() => onSelectNote(note)}
                            >
                                {/* 笔记标题 */}
                                <h3 className="font-semibold text-slate-800 mb-2 line-clamp-1">
                                    {note.title || '未命名笔记'}
                                </h3>

                                {/* 笔记预览 */}
                                <p className="text-sm text-slate-600 mb-3 line-clamp-3">
                                    {note.content || '空白笔记'}
                                </p>

                                {/* 标签 */}
                                {note.tags && note.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {note.tags.slice(0, 3).map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {note.tags.length > 3 && (
                                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                                +{note.tags.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* 时间 */}
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock size={12} />
                                    {formatTime(note.updatedAt)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
