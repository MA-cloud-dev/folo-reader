/**
 * 添加订阅源弹窗组件
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { useFeedStore } from '@/stores/feedStore'

interface AddFeedModalProps {
    isOpen: boolean
    onClose: () => void
}

export function AddFeedModal({ isOpen, onClose }: AddFeedModalProps) {
    const { addFeed } = useFeedStore()
    const [newFeedUrl, setNewFeedUrl] = useState('')
    const [newFeedTitle, setNewFeedTitle] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    const handleAddFeed = async () => {
        if (!newFeedUrl.trim()) return

        setIsAdding(true)
        try {
            await addFeed(newFeedUrl.trim(), newFeedTitle.trim() || undefined)
            setNewFeedUrl('')
            setNewFeedTitle('')
            onClose()
            toast.success('订阅源添加成功')
        } catch (err) {
            console.error('Failed to add feed:', err)
            toast.error('添加订阅源失败，请检查 URL 是否正确')
        } finally {
            setIsAdding(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-96 max-w-[90vw]">
                <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">添加订阅源</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                            RSS 地址 *
                        </label>
                        <input
                            type="url"
                            value={newFeedUrl}
                            onChange={(e) => setNewFeedUrl(e.target.value)}
                            placeholder="https://example.com/feed.xml"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                            名称（可选）
                        </label>
                        <input
                            type="text"
                            value={newFeedTitle}
                            onChange={(e) => setNewFeedTitle(e.target.value)}
                            placeholder="留空则自动获取"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </div>
                <div className="flex gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleAddFeed}
                        disabled={isAdding || !newFeedUrl.trim()}
                        className="flex-1 btn-primary disabled:opacity-50"
                    >
                        {isAdding ? '添加中...' : '添加'}
                    </button>
                </div>
            </div>
        </div>
    )
}
