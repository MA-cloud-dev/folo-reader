/**
 * 内容提取服务
 * 优先级策略：RSS内容 > 子标题提取 > 全文前N字
 */
import { AI_CONSTANTS } from '@/utils/constants'

export interface ContentExtractionResult {
    content: string
    source: 'rss' | 'headings' | 'fulltext'
    length: number
}

/**
 * 从 HTML 中提取子标题（h1-h3）及其下方的段落
 * 用于生成结构化摘要
 */
export function extractHeadingsFromHtml(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html

    // 移除无用标签
    div.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove())

    // 提取所有 h1-h3 标题
    const headings = div.querySelectorAll('h1, h2, h3')
    const result: string[] = []

    headings.forEach(heading => {
        // 添加标题文本
        const headingText = heading.textContent?.trim()
        if (headingText && headingText.length > 3) {
            result.push(`## ${headingText}`)

            // 尝试获取标题后的第一段内容
            let nextEl = heading.nextElementSibling
            while (nextEl && result.join('\n').length < 2000) {
                if (nextEl.tagName === 'P') {
                    const pText = nextEl.textContent?.trim()
                    if (pText && pText.length > 20) {
                        result.push(pText)
                        break // 每个标题只取第一段
                    }
                }
                // 如果遇到下一个标题就停止
                if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(nextEl.tagName)) {
                    break
                }
                nextEl = nextEl.nextElementSibling
            }
        }
    })

    return result.join('\n\n')
}

/**
 * 从 HTML 中提取纯文本（用于 AI 摘要）
 * 增强版：优先提取主内容区域
 */
export function extractTextFromHtml(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html

    // 移除脚本和样式
    div.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove())

    // 尝试找主内容区
    const article = div.querySelector('article, main, .content, .post-content, .entry-content, [role="main"]')
    const target = article || div

    return target.textContent?.trim() || ''
}

/**
 * 智能内容提取
 * @param rssDescription RSS 源自带的 description 或 content 字段
 * @param articleUrl 文章 URL（用于降级抓取全文）
 * @param fetchFullContent 抓取全文的函数
 */
export async function extractContentForSummary(
    rssDescription: string | undefined,
    articleUrl: string,
    fetchFullContent: (url: string) => Promise<string>
): Promise<ContentExtractionResult> {
    // 策略 1: 优先使用 RSS 自带内容
    if (rssDescription && rssDescription.length >= AI_CONSTANTS.MIN_RSS_CONTENT_LENGTH) {
        const cleanContent = extractTextFromHtml(rssDescription)
        if (cleanContent.length >= AI_CONSTANTS.MIN_RSS_CONTENT_LENGTH) {
            console.log('[ContentExtractor] 使用 RSS 自带内容，长度:', cleanContent.length)
            return {
                content: cleanContent.slice(0, AI_CONSTANTS.MAX_CONTENT_LENGTH),
                source: 'rss',
                length: cleanContent.length
            }
        }
    }

    // 策略 2: 抓取全文，提取子标题
    console.log('[ContentExtractor] RSS 内容不足，尝试抓取全文提取子标题')
    try {
        const html = await fetchFullContent(articleUrl)

        // 先尝试提取子标题
        const headings = extractHeadingsFromHtml(html)
        if (headings.length >= AI_CONSTANTS.MIN_RSS_CONTENT_LENGTH) {
            console.log('[ContentExtractor] 使用子标题提取，长度:', headings.length)
            return {
                content: headings.slice(0, AI_CONSTANTS.MAX_CONTENT_LENGTH),
                source: 'headings',
                length: headings.length
            }
        }

        // 策略 3: 降级到全文前N字
        console.log('[ContentExtractor] 子标题不足，使用全文前', AI_CONSTANTS.MAX_CONTENT_LENGTH, '字')
        const fullText = extractTextFromHtml(html)
        return {
            content: fullText.slice(0, AI_CONSTANTS.MAX_CONTENT_LENGTH),
            source: 'fulltext',
            length: fullText.length
        }
    } catch (err) {
        console.error('[ContentExtractor] 抓取全文失败:', err)
        // 失败时使用 RSS description（即使很短）
        const fallbackContent = rssDescription ? extractTextFromHtml(rssDescription) : ''
        return {
            content: fallbackContent.slice(0, AI_CONSTANTS.MAX_CONTENT_LENGTH),
            source: 'rss',
            length: fallbackContent.length
        }
    }
}
