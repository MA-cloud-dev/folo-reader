/**
 * 笔记编辑器组件（增强版）
 * - 支持编辑/预览模式切换
 * - 支持@引用已浏览文章
 */
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Save, Trash2, Tag, Link as LinkIcon, X, Eye, Edit3, AtSign } from 'lucide-react'
import { toast } from 'sonner'
import { dbHelpers } from '@/db'
import type { Note, Article } from '@/types'
import { clsx } from 'clsx'
import { MarkdownPreview } from './MarkdownPreview'
import { ArticleMentionSelector } from './ArticleMentionSelector'

interface NoteEditorProps {
    note: Note
    onClose: () => void
    onDelete: () => void
    onUpdate: () => void
}

export function NoteEditor({ note, onClose, onDelete, onUpdate }: NoteEditorProps) {
    const [title, setTitle] = useState(note.title)
    const [content, setContent] = useState(note.content)
    const [tags, setTags] = useState<string[]>(note.tags || [])
    const [newTag, setNewTag] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // 新增：编辑/预览模式
    const [isPreviewMode, setIsPreviewMode] = useState(false)

    // 新增：@引用功能
    const [showMentionSelector, setShowMentionSelector] = useState(false)
    const [mentionSearchQuery, setMentionSearchQuery] = useState('')
    const [cursorPosition, setCursorPosition] = useState(0)
    const contentInputRef = useRef<HTMLTextAreaElement>(null)

    // 监听内容变化
    useEffect(() => {
        const hasChanges =
            title !== note.title ||
            content !== note.content ||
            JSON.stringify(tags) !== JSON.stringify(note.tags || [])
        setHasUnsavedChanges(hasChanges)
    }, [title, content, tags, note])

    // 保存笔记
    const handleSave = async () => {
        setIsSaving(true)
        try {
            await dbHelpers.updateNote(note.id, {
                title,
                content,
                tags: tags.length > 0 ? tags : undefined,
            })
            setHasUnsavedChanges(false)
            onUpdate()
        } catch (err) {
            console.error('Failed to save note:', err)
            toast.error('保存失败')
        } finally {
            setIsSaving(false)
        }
    }

    // 删除笔记
    const handleDelete = async () => {
        if (!window.confirm('确定要删除这篇笔记吗？')) return

        try {
            await dbHelpers.deleteNote(note.id)
            onDelete()
            toast.success('笔记已删除')
        } catch (err) {
            console.error('Failed to delete note:', err)
            toast.error('删除失败')
        }
    }

    // 添加标签
    const handleAddTag = () => {
        const trimmedTag = newTag.trim()
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags([...tags, trimmedTag])
            setNewTag('')
        }
    }

    // 删除标签
    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove))
    }

    // 监听@触发
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        const cursorPos = e.target.selectionStart

        setContent(value)
        setCursorPosition(cursorPos)

        // 检测@ mention
        const textBeforeCursor = value.slice(0, cursorPos)
        const atMatch = textBeforeCursor.match(/@(\w*)$/)

        if (atMatch) {
            setShowMentionSelector(true)
            setMentionSearchQuery(atMatch[1])
        } else {
            setShowMentionSelector(false)
        }
    }

    // 插入文章链接
    const insertArticleLink = async (article: Article) => {
        const link = `[${article.title}](${article.link})`

        // 获取@ mention的起始位置
        const textBeforeCursor = content.slice(0, cursorPosition)
        const atMatch = textBeforeCursor.match(/@(\w*)$/)

        if (atMatch) {
            const atStartPos = cursorPosition - atMatch[0].length
            const newContent =
                content.slice(0, atStartPos) +
                link +
                content.slice(cursorPosition)

            setContent(newContent)

            // 同时添加到references
            try {
                await dbHelpers.addReferenceToNote(note.id, {
                    type: 'article',
                    id: article.id,
                    title: article.title,
                    snippet: article.title,
                    url: article.link,
                    addedAt: Date.now(),
                })
            } catch (err) {
                console.error('Failed to add reference:', err)
            }
        }

        setShowMentionSelector(false)

        // 重新聚焦到textarea
        setTimeout(() => {
            contentInputRef.current?.focus()
        }, 0)
    }

    // 格式化引用时间
    const formatReferenceTime = (timestamp: number) => {
        const now = Date.now()
        const diff = now - timestamp
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (hours < 1) return '刚刚添加'
        if (hours < 24) return `${hours}小时前添加`
        if (days < 7) return `${days}天前添加`
        return new Date(timestamp).toLocaleDateString('zh-CN') + ' 添加'
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* 头部工具栏 */}
            <div className="flex-shrink-0 flex items-center gap-2 p-4 border-b border-slate-200">
                <button
                    onClick={onClose}
                    className="btn-ghost p-2 flex items-center gap-1"
                    title="返回"
                >
                    <ArrowLeft size={18} />
                </button>

                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="flex-1 text-lg font-semibold border-none focus:outline-none"
                    placeholder="笔记标题"
                />

                <div className="flex items-center gap-2">
                    {/* 编辑/预览切换 */}
                    <button
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={clsx(
                            'btn-ghost flex items-center gap-2 px-3 py-1.5',
                            isPreviewMode && 'bg-orange-100 text-orange-600'
                        )}
                        title={isPreviewMode ? '切换到编辑模式' : '切换到预览模式'}
                    >
                        {isPreviewMode ? (
                            <>
                                <Edit3 size={16} />
                                <span className="text-sm">编辑</span>
                            </>
                        ) : (
                            <>
                                <Eye size={16} />
                                <span className="text-sm">预览</span>
                            </>
                        )}
                    </button>

                    {hasUnsavedChanges && (
                        <span className="text-xs text-orange-500">未保存</span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        className={clsx(
                            'btn-primary flex items-center gap-2',
                            (!hasUnsavedChanges || isSaving) && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        <Save size={16} />
                        {isSaving ? '保存中...' : '保存'}
                    </button>
                    <button
                        onClick={handleDelete}
                        className="btn-ghost text-red-500 hover:bg-red-50 p-2"
                        title="删除笔记"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* 编辑/预览区域 */}
            <div className="flex-1 overflow-y-auto p-6">
                {isPreviewMode ? (
                    /* 预览模式 */
                    <div>
                        <MarkdownPreview content={content} />
                    </div>
                ) : (
                    /* 编辑模式 */
                    <>
                        {/* 标签管理 */}
                        <div className="mb-6">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <Tag size={16} />
                                标签
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => handleRemoveTag(tag)}
                                            className="hover:bg-orange-200 rounded-full p-0.5"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleAddTag()
                                        }
                                    }}
                                    placeholder="添加标签（回车确认）"
                                    className="flex-1 px-3 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <button
                                    onClick={handleAddTag}
                                    className="btn-ghost px-3 py-1 text-sm"
                                >
                                    添加
                                </button>
                            </div>
                        </div>

                        {/* Markdown 编辑器 */}
                        <div className="mb-6 relative">
                            <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                                <span>内容 (支持 Markdown)</span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <AtSign size={12} />
                                    输入 @ 可引用文章
                                </span>
                            </label>
                            <textarea
                                ref={contentInputRef}
                                value={content}
                                onChange={handleContentChange}
                                placeholder="开始写作...&#10;&#10;提示：输入 @ 可以快速引用已浏览的文章"
                                className="w-full h-96 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm resize-none"
                            />

                            {/* @引用选择器 */}
                            {showMentionSelector && (
                                <div className="absolute top-24 left-4 z-10">
                                    <ArticleMentionSelector
                                        onSelect={insertArticleLink}
                                        onClose={() => setShowMentionSelector(false)}
                                        searchQuery={mentionSearchQuery}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 引用来源 */}
                        {note.references && note.references.length > 0 && (
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                                    <LinkIcon size={16} />
                                    引用来源
                                </label>
                                <div className="space-y-2">
                                    {note.references.map((ref, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                                                    {ref.type === 'article' ? '文章' : '对话'}
                                                </span>
                                                {ref.url ? (
                                                    <a
                                                        href={ref.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-medium text-sm text-orange-600 hover:text-orange-700 underline"
                                                    >
                                                        {ref.title}
                                                    </a>
                                                ) : (
                                                    <span className="font-medium text-sm text-slate-800">
                                                        {ref.title}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm texte-700 mb-1 line-clamp-2">
                                                {ref.snippet}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {formatReferenceTime(ref.addedAt)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
