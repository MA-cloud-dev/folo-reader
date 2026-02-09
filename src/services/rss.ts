/**
 * RSS 服务 - 使用原生 DOMParser 解析 RSS
 * 替换 rss-parser，避免 Node.js 依赖问题
 */

// CORS 代理列表
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
]

export interface FeedData {
    title: string
    link?: string
    description?: string
    image?: { url?: string }
    items: FeedItem[]
}

export interface FeedItem {
    guid?: string
    title?: string
    link?: string
    pubDate?: string
    creator?: string
    author?: string
    content?: string
    description?: string
}

/**
 * 使用 CORS 代理获取 RSS 内容
 */
async function fetchWithProxy(url: string): Promise<string> {
    let lastError: Error | null = null
    const errors: string[] = []

    // 首先尝试直接访问（某些RSS源支持CORS）
    try {
        console.log(`[RSS] 尝试直接访问: ${url}`)
        const response = await fetch(url, {
            headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' }
        })
        if (response.ok) {
            const text = await response.text()
            if (text && text.trim().length > 0) {
                console.log(`[RSS] 直接访问成功`)
                return text
            }
            errors.push(`直接访问返回空内容`)
        } else {
            errors.push(`直接访问失败: ${response.status} ${response.statusText}`)
        }
    } catch (err) {
        errors.push(`直接访问异常: ${(err as Error).message}`)
    }

    // 尝试使用代理
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        const proxy = CORS_PROXIES[i]
        try {
            const proxyUrl = proxy + encodeURIComponent(url)
            console.log(`[RSS] 尝试代理 ${i + 1}/${CORS_PROXIES.length}: ${proxy}`)

            const response = await fetch(proxyUrl, {
                headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' }
            })

            if (response.ok) {
                const text = await response.text()

                // 验证响应内容不为空
                if (!text || text.trim().length === 0) {
                    errors.push(`代理 ${i + 1} 返回空内容`)
                    continue
                }

                // 验证响应内容看起来像XML
                if (!text.trim().startsWith('<')) {
                    errors.push(`代理 ${i + 1} 返回非XML内容: ${text.substring(0, 100)}`)
                    continue
                }

                console.log(`[RSS] 代理 ${i + 1} 成功`)
                return text
            } else {
                errors.push(`代理 ${i + 1} HTTP错误: ${response.status}`)
            }
        } catch (err) {
            lastError = err as Error
            errors.push(`代理 ${i + 1} 异常: ${lastError.message}`)
            continue
        }
    }

    // 所有尝试都失败，提供详细错误信息
    const errorDetails = errors.join('; ')
    throw new Error(`无法获取RSS内容：${errorDetails}`)
}

/**
 * 获取并解析 RSS Feed
 */
export async function fetchFeed(url: string): Promise<FeedData> {
    const xmlText = await fetchWithProxy(url)
    return parseRSS(xmlText)
}

/**
 * 解析 RSS/Atom XML
 */
function parseRSS(xmlText: string): FeedData {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, 'text/xml')

    // 检查解析错误
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
        throw new Error('RSS 解析失败: ' + parseError.textContent)
    }

    // Atom 格式
    const feedEl = doc.querySelector('feed')
    if (feedEl) {
        return parseAtom(feedEl)
    }

    // RSS 2.0 格式
    const channelEl = doc.querySelector('channel')
    if (channelEl) {
        return parseRSS2(channelEl)
    }

    throw new Error('无法识别的 Feed 格式')
}

/**
 * 解析 RSS 2.0
 */
function parseRSS2(channel: Element): FeedData {
    const getTextContent = (el: Element | null, selector: string): string | undefined => {
        const child = el?.querySelector(selector)
        return child?.textContent?.trim() || undefined
    }

    const items = Array.from(channel.querySelectorAll('item')).map((item): FeedItem => ({
        guid: getTextContent(item, 'guid') || getTextContent(item, 'link'),
        title: getTextContent(item, 'title'),
        link: getTextContent(item, 'link'),
        pubDate: getTextContent(item, 'pubDate'),
        creator: getTextContent(item, 'dc\\:creator') || getTextContent(item, 'creator'),
        author: getTextContent(item, 'author'),
        description: getTextContent(item, 'description'),
        content: getTextContent(item, 'content\\:encoded') || getTextContent(item, 'encoded'),
    }))

    const imageUrl = getTextContent(channel, 'image > url')

    return {
        title: getTextContent(channel, 'title') || 'Unknown Feed',
        link: getTextContent(channel, 'link'),
        description: getTextContent(channel, 'description'),
        image: imageUrl ? { url: imageUrl } : undefined,
        items,
    }
}

/**
 * 解析 Atom
 */
function parseAtom(feed: Element): FeedData {
    const getTextContent = (el: Element | null, selector: string): string | undefined => {
        const child = el?.querySelector(selector)
        return child?.textContent?.trim() || undefined
    }

    const getLinkHref = (el: Element | null, rel?: string): string | undefined => {
        const links = el?.querySelectorAll('link')
        if (!links) return undefined

        for (const link of links) {
            if (!rel || link.getAttribute('rel') === rel || (!link.getAttribute('rel') && rel === 'alternate')) {
                return link.getAttribute('href') || undefined
            }
        }
        return undefined
    }

    const items = Array.from(feed.querySelectorAll('entry')).map((entry): FeedItem => ({
        guid: getTextContent(entry, 'id'),
        title: getTextContent(entry, 'title'),
        link: getLinkHref(entry, 'alternate') || getLinkHref(entry),
        pubDate: getTextContent(entry, 'published') || getTextContent(entry, 'updated'),
        author: getTextContent(entry, 'author > name'),
        content: getTextContent(entry, 'content') || getTextContent(entry, 'summary'),
    }))

    return {
        title: getTextContent(feed, 'title') || 'Unknown Feed',
        link: getLinkHref(feed, 'alternate') || getLinkHref(feed),
        description: getTextContent(feed, 'subtitle'),
        items,
    }
}

/**
 * 获取文章全文内容（用于阅读视图）
 */
export async function fetchArticleContent(url: string): Promise<string> {
    const html = await fetchWithProxy(url)
    return html
}

/**
 * 从 HTML 中提取纯文本（用于 AI 摘要）
 */
export function extractTextFromHtml(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html

    // 移除脚本和样式
    div.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove())

    // 尝试找主内容区
    const article = div.querySelector('article, main, .content, .post-content, .entry-content')
    const target = article || div

    return target.textContent?.trim() || ''
}
