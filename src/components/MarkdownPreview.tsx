/**
 * Markdown预览组件
 */
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface MarkdownPreviewProps {
    content: string
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
    return (
        <div className="max-w-none p-6 bg-white">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                    // 自定义链接样式，支持外部链接
                    a: ({ node, ...props }) => (
                        <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-700 underline"
                        />
                    ),
                }}
            >
                {content || '*暂无内容*'}
            </ReactMarkdown>
        </div>
    )
}
