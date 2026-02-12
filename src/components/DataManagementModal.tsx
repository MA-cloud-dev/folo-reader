import { useState, useRef } from 'react'
import { X, Upload, Download, FileText, Check, AlertCircle, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useFeedStore } from '@/stores/feedStore'
import { parseOpml, generateOpml } from '@/services/opml'

interface DataManagementModalProps {
    isOpen: boolean
    onClose: () => void
}

type Tab = 'import' | 'export'

export function DataManagementModal({ isOpen, onClose }: DataManagementModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('import')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importError, setImportError] = useState<string | null>(null)
    const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'importing' | 'success'>('idle')
    const [parseResult, setParseResult] = useState<{ total: number, categories: string[] } | null>(null)
    const [parsedFeeds, setParsedFeeds] = useState<any[] | null>(null)
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 })

    const { feeds } = useFeedStore()

    if (!isOpen) return null

    // 处理文件选择
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImportFile(file)
        setImportError(null)
        setImportStatus('parsing')
        setParseResult(null)
        setParsedFeeds(null)

        try {
            const text = await file.text()
            const feeds = parseOpml(text)

            if (feeds.length === 0) {
                setImportError('未在文件中找到有效的 RSS 订阅源')
                setImportStatus('idle')
                return
            }

            const categories = Array.from(new Set(feeds.map(f => f.category).filter(Boolean) as string[]))
            setParseResult({
                total: feeds.length,
                categories
            })
            setParsedFeeds(feeds)
            setImportStatus('idle')
        } catch (err) {
            console.error(err)
            setImportError('文件解析失败，请检查是否为有效的 OPML 格式')
            setImportStatus('idle')
        }
    }

    // 执行导入
    const handleImport = async () => {
        if (!parsedFeeds || parsedFeeds.length === 0) return

        setImportStatus('importing')
        setImportProgress({ current: 0, total: parsedFeeds.length, success: 0, fail: 0 })

        const addFeed = useFeedStore.getState().addFeed
        let successCount = 0
        let failCount = 0

        for (let i = 0; i < parsedFeeds.length; i++) {
            const feed = parsedFeeds[i]
            try {
                // 串行导入避免并发过高（也可以改为通过 Promise.allLimit 优化）
                await addFeed(feed.xmlUrl, feed.title)
                successCount++
            } catch (err) {
                console.error(`Failed to import ${feed.title}:`, err)
                failCount++
            }
            setImportProgress(prev => ({ ...prev, current: i + 1, success: successCount, fail: failCount }))
        }

        setImportStatus('success')
    }

    // 执行导出
    const handleExport = () => {
        const opmlString = generateOpml(feeds)
        const blob = new Blob([opmlString], { type: 'text/xml' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `folo_feeds_${new Date().toISOString().slice(0, 10)}.opml`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-[500px] max-w-[90vw] overflow-hidden flex flex-col max-h-[80vh]">
                {/* 标题栏 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">数据管理</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 pt-4 gap-6 border-b border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('import')}
                        className={clsx(
                            'pb-2 text-sm font-medium border-b-2 transition-colors',
                            activeTab === 'import'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        )}
                    >
                        导入订阅源
                    </button>
                    <button
                        onClick={() => setActiveTab('export')}
                        className={clsx(
                            'pb-2 text-sm font-medium border-b-2 transition-colors',
                            activeTab === 'export'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        )}
                    >
                        导出备份
                    </button>
                </div>

                {/* 内容区 */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {activeTab === 'import' ? (
                        <div className="space-y-6">
                            {/* 初始状态 & 解析结果 */}
                            {importStatus !== 'importing' && importStatus !== 'success' && (
                                <div className="space-y-4">
                                    <div
                                        className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-orange-200 dark:hover:border-orange-800 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={32} className="mb-2 text-slate-400" />
                                        <p className="text-sm font-medium">点击选择 OPML 文件</p>
                                        <p className="text-xs text-slate-400 mt-1">支持 .opml 或 .xml 格式</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".opml,.xml"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </div>

                                    {importError && (
                                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                                            <AlertCircle size={16} />
                                            {importError}
                                        </div>
                                    )}

                                    {parseResult && (
                                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">解析成功</h3>
                                                <span className="text-xs text-slate-400 truncate max-w-[200px]">{importFile?.name}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1">
                                                <p>• 包含 {parseResult.total} 个订阅源</p>
                                                <p>• 包含 {parseResult.categories.length} 个分类：{parseResult.categories.join(', ') || '无'}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 导入中 */}
                            {importStatus === 'importing' && (
                                <div className="py-8 space-y-4 text-center">
                                    <Loader2 size={32} className="mx-auto text-orange-500 animate-spin" />
                                    <div className="space-y-1">
                                        <h3 className="text-slate-800 dark:text-slate-200 font-medium">正在导入...</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {importProgress.current} / {importProgress.total}
                                        </p>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-500 transition-all duration-300"
                                            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 导入完成 */}
                            {importStatus === 'success' && (
                                <div className="py-8 text-center space-y-4">
                                    <div className="w-12 h-12 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                        <Check size={24} />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">导入完成</h3>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        成功: {importProgress.success} 个，失败: {importProgress.fail} 个
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="btn-primary"
                                    >
                                        完成
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl flex flex-col items-center text-center">
                                <FileText size={48} className="text-orange-200 dark:text-orange-900/40 mb-4" />
                                <h3 className="text-slate-800 dark:text-slate-200 font-medium mb-1">导出订阅源</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    将当前的 {feeds.length} 个订阅源导出为标准 OPML 文件，可用于备份或迁移到其他阅读器。
                                </p>
                                <button
                                    onClick={handleExport}
                                    className="flex items-center gap-2 btn-primary px-6 py-2.5"
                                >
                                    <Download size={18} />
                                    导出 OPML 文件
                                </button>
                            </div>

                            <div className="text-xs text-slate-400 px-4">
                                <p>• 包含订阅源标题、URL 和分类信息</p>
                                <p>• 兼容大多数 RSS 阅读器（如 Feedly, Reeder 等）</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 底部按钮 (仅导入Tab且非加载/完成状态显示) */}
                {activeTab === 'import' && importStatus !== 'importing' && importStatus !== 'success' && (
                    <div className="p-6 pt-0 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!parsedFeeds}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            开始导入
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
