/**
 * 文章阅读视图组件
 */
import { useState, useEffect } from 'react'
import { ExternalLink, Star, RefreshCw, Globe, Sparkles } from 'lucide-react'
import { useFeedStore } from '@/stores/feedStore'
import { fetchArticleContent } from '@/services/rss'
import { extractTextFromHtml } from '@/services/contentExtractor'
import { clsx } from 'clsx'

export function ArticleView() {
    const { selectedArticle, starArticle, unstarArticle, generateArticleSummary, generatingSummaryIds } = useFeedStore()
    const [content, setContent] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [showContent, setShowContent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isGenerating = selectedArticle ? generatingSummaryIds.has(selectedArticle.id) : false

    useEffect(() => {
        setContent('')
        setShowContent(false)
        setError(null)
    }, [selectedArticle?.id])

    const loadContent = async () => {
        if (!selectedArticle) return

        setIsLoading(true)
        setError(null)
        try {
            const html = await fetchArticleContent(selectedArticle.link)
            setContent(html)
            setShowContent(true)
        } catch (err) {
            setError('无法加载文章内容')
            console.error('Failed to load content:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleStar = async () => {
        if (!selectedArticle) return

        // 如果已收藏，则取消收藏
        if (selectedArticle.isStarred) {
            await unstarArticle(selectedArticle.id)
            return
        }

        // 否则收藏文章
        let articleContent = content
        if (!articleContent) {
            try {
                const html = await fetchArticleContent(selectedArticle.link)
                articleContent = extractTextFromHtml(html)
            } catch {
                articleContent = ''
            }
        }

        await starArticle(selectedArticle.id, articleContent)
    }

    if (!selectedArticle) {
        return null
    }

    return (
        <div className="flex flex-col h-full">
            {/* 工具栏 */}
            <div className="flex-shrink-0 flex items-center gap-2 p-4 border-b border-slate-200">
                <button
                    onClick={handleStar}
                    className={clsx(
                        'btn-ghost p-2 flex items-center gap-1',
                        selectedArticle.isStarred && 'text-amber-500'
                    )}
                    title={selectedArticle.isStarred ? '已收藏' : '收藏'}
                >
                    <Star
                        size={18}
                        className={clsx(selectedArticle.isStarred && 'fill-amber-500')}
                    />
                </button>
                <div className="flex-1" />

                {/* 查看原文 - 优先跳转浏览器 */}
                <a
                    href={selectedArticle.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex items-center gap-2"
                >
                    <ExternalLink size={16} />
                    查看原文
                </a>

                {/* 本地渲染 - 次要选项 */}
                {!showContent && (
                    <button
                        onClick={loadContent}
                        disabled={isLoading}
                        className="btn-ghost flex items-center gap-2 text-slate-600"
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                加载中...
                            </>
                        ) : (
                            <>
                                <Globe size={16} />
                                本地预览
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* 标题 */}
                <h1 className="text-2xl font-bold text-slate-800 leading-tight mb-4">
                    {selectedArticle.title}
                </h1>

                {/* AI 摘要卡片 */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-200/50 p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3 text-orange-500 font-medium">
                        <Sparkles size={18} />
                        <span>AI 摘要</span>
                    </div>
                    {selectedArticle.aiSummary ? (
                        <div
                            className="text-slate-700 leading-relaxed prose prose-sm prose-slate max-w-none"
                            dangerouslySetInnerHTML={{ __html: selectedArticle.aiSummary }}
                        />
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => generateArticleSummary(selectedArticle)}
                                disabled={isGenerating}
                                className="text-orange-500 hover:underline"
                            >
                                {isGenerating ? '生成中...' : '点击生成摘要'}
                            </button>
                        </div>
                    )}
                </div>

                {/* 原文内容 */}
                {error && (
                    <div className="text-red-500 text-center py-8">
                        {error}
                    </div>
                )}

                {showContent && content && (
                    <article
                        className="prose prose-slate max-w-none"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                )}

                {!showContent && !isLoading && (
                    <div className="text-center py-12 text-slate-400">
                        <Globe size={48} className="mx-auto mb-4 opacity-30" />
                        <p>点击「展开原文」查看完整内容</p>
                        <p className="text-sm mt-2">或直接在浏览器中打开</p>
                    </div>
                )}
            </div>
        </div>
    )
}
