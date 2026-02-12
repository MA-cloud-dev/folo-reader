/**
 * 笔记面板组件 - 右侧可折叠面板（集成列表和编辑器）
 */
import { useState, useEffect } from 'react'
import { FileText, ChevronRight, ChevronLeft, Search, Plus, Download, Trash2 } from 'lucide-react'
import { NoteEditor } from '@/components/NoteEditor'
import { dbHelpers } from '@/db'
import type { Note } from '@/types'
import { clsx } from 'clsx'

interface NotePanelProps {
    isExpanded: boolean
    width: number
    onToggle: () => void
    selectedNote: Note | null
    onNoteChange: (note: Note | null) => void
    onNoteUpdate: () => void
    onNoteDelete: () => void
}

export function NotePanel({
    isExpanded,
    width,
    onToggle,
    selectedNote,
    onNoteChange,
    onNoteUpdate,
    onNoteDelete,
}: NotePanelProps) {
    const [notes, setNotes] = useState<Note[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filteredNotes, setFilteredNotes] = useState<Note[]>([])

    // 加载笔记列表
    useEffect(() => {
        if (isExpanded) {
            loadNotes()
        }
    }, [isExpanded])

    const loadNotes = async () => {
        const allNotes = await dbHelpers.getAllNotes()
        setNotes(allNotes)
    }

    // 过滤笔记
    useEffect(() => {
        if (!searchQuery) {
            setFilteredNotes(notes)
            return
        }

        const query = searchQuery.toLowerCase()
        const filtered = notes.filter(note =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query) ||
            note.tags?.some(tag => tag.toLowerCase().includes(query))
        )
        setFilteredNotes(filtered)
    }, [searchQuery, notes])

    // 创建新笔记
    const handleCreateNote = async () => {
        const noteId = await dbHelpers.createNote({
            title: '未命名笔记',
            content: '',
            tags: [],
            references: []
        })
        await loadNotes()
        const newNote = await dbHelpers.getNote(noteId)
        if (newNote) {
            onNoteChange(newNote)
        }
    }

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

    if (!isExpanded) {
        // 折叠状态 - 只显示切换按钮
        return (
            <div className="relative flex items-center justify-center w-12 bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
                <button
                    onClick={onToggle}
                    className="absolute top-4 p-2 rounded-lg hover:bg-slate-200 transition-colors"
                    title="打开笔记面板"
                >
                    <ChevronLeft size={20} className="text-slate-600" />
                </button>
                <div className="writing-vertical text-sm text-slate-500 font-medium">
                    笔记
                </div>
            </div>
        )
    }

    return (
        <div
            className="flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700"
            style={{ width: `${width}px` }}
        >
            {/* 头部 */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                    <FileText size={18} className="text-orange-500" />
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">我的笔记</h2>
                </div>
                <button
                    onClick={onToggle}
                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                    title="关闭笔记面板"
                >
                    <ChevronRight size={18} className="text-slate-600" />
                </button>
            </div>

            {/* 内容区域 */}
            {selectedNote ? (
                /* 笔记编辑器 */
                <NoteEditor
                    note={selectedNote}
                    onClose={() => {
                        onNoteChange(null)
                        loadNotes() // 关闭后刷新列表
                    }}
                    onUpdate={async () => {
                        await onNoteUpdate()
                        await loadNotes() // 更新后刷新列表
                    }}
                    onDelete={async () => {
                        await onNoteDelete()
                        await loadNotes() // 删除后刷新列表
                    }}
                />
            ) : (
                /* 笔记列表 */
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* 搜索和新建 */}
                    <div className="flex-shrink-0 p-4 space-y-3">
                        <button
                            onClick={handleCreateNote}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-2"
                        >
                            <Plus size={18} />
                            新建笔记
                        </button>

                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="搜索笔记..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>
                    </div>

                    {/* 笔记列表 */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 px-4">
                                <FileText size={48} className="mb-4 opacity-30" />
                                <p className="text-sm text-center">
                                    {notes.length === 0
                                        ? '还没有笔记'
                                        : '未找到匹配的笔记'}
                                </p>
                                {notes.length === 0 && (
                                    <p className="text-xs mt-2 text-slate-300">
                                        点击上方按钮创建第一篇笔记
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2 p-4 pt-0">
                                {filteredNotes.map(note => (
                                    <div
                                        key={note.id}
                                        className={clsx(
                                            'w-full p-4 rounded-lg border transition-all',
                                            'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-slate-700/50 group'
                                        )}
                                    >
                                        {/* 点击区域打开笔记 */}
                                        <div
                                            onClick={() => onNoteChange(note)}
                                            className="cursor-pointer"
                                        >
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 line-clamp-1">
                                                {note.title || '未命名笔记'}
                                            </h3>
                                            {note.content && (
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                                                    {note.content}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {note.tags && note.tags.length > 0 && (
                                                    <div className="flex gap-1 flex-wrap">
                                                        {note.tags.slice(0, 3).map(tag => (
                                                            <span
                                                                key={tag}
                                                                className="inline-block px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-xs"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {note.tags.length > 3 && (
                                                            <span className="text-xs text-slate-400">
                                                                +{note.tags.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <span className="text-xs text-slate-400 ml-auto">
                                                    {formatTime(note.updatedAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 操作按钮 - 始终可见 */}
                                        <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    // 导出为Markdown文件
                                                    const markdown = [
                                                        `# ${note.title || '未命名笔记'}`,
                                                        '',
                                                        note.content || '',
                                                        '',
                                                        '---',
                                                        '',
                                                        note.tags && note.tags.length > 0 ? `**标签**: ${note.tags.join(', ')}  ` : '',
                                                        `**创建时间**: ${new Date(note.createdAt).toLocaleString('zh-CN')}  `,
                                                        `**更新时间**: ${new Date(note.updatedAt).toLocaleString('zh-CN')}  `
                                                    ].join('\n')

                                                    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
                                                    const url = URL.createObjectURL(blob)
                                                    const a = document.createElement('a')
                                                    a.href = url
                                                    a.download = `${note.title || '未命名笔记'}.md`

                                                    // 添加到DOM才能触发下载
                                                    document.body.appendChild(a)
                                                    a.click()
                                                    document.body.removeChild(a)

                                                    URL.revokeObjectURL(url)
                                                }}
                                                className="flex-1 px-3 py-1.5 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1"
                                                title="导出为Markdown"
                                            >
                                                <Download size={14} />
                                                导出
                                            </button>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation()
                                                    console.log('删除按钮被点击，笔记ID:', note.id)
                                                    if (window.confirm(`确定要删除笔记"${note.title || '未命名笔记'}"吗？`)) {
                                                        await dbHelpers.deleteNote(note.id)
                                                        await loadNotes()
                                                        await onNoteDelete()
                                                    }
                                                }}
                                                className="flex-1 px-3 py-1.5 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-1"
                                                title="删除笔记"
                                            >
                                                <Trash2 size={14} />
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
