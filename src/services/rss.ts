/**
 * RSS 服务 - 使用原生 DOMParser 解析 RSS
 * 替换 rss-parser，避免 Node.js 依赖问题
 */

/**
 * 将自定义协议URL转换为实际URL
 * rsshub:// -> https://rsshub.app/
 */
function normalizeUrl(url: string): string {
    url = url.trim()

    if (url.startsWith('rsshub://')) {
        return url.replace('rsshub://', 'https://rsshub.app/')
    }

    return url
}

// CORS 代理列表（按稳定性排序）
const CORS_PROXIES = [
    'https://api.codetabs.com/v1/proxy?quest=', // 实测最稳定
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
]

// 代理缓存（记住上次成功的代理索引）
let lastSuccessfulProxyIndex: number | null = null
let proxyFailureCount: Map<number, number> = new Map() // 失败计数

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

    // 尝试使用代理（智能排序）
    const proxyIndices = Array.from({ length: CORS_PROXIES.length }, (_, i) => i)

    // 将上次成功的代理移到最前面
    if (lastSuccessfulProxyIndex !== null) {
        proxyIndices.sort((a, b) => {
            if (a === lastSuccessfulProxyIndex) return -1
            if (b === lastSuccessfulProxyIndex) return 1
            return (proxyFailureCount.get(a) || 0) - (proxyFailureCount.get(b) || 0)
        })
    }

    for (const i of proxyIndices) {
        const proxy = CORS_PROXIES[i]
        const failures = proxyFailureCount.get(i) || 0

        // 跳过连续失败超过 3 次的代理（除非是最后选择）
        if (failures >= 3 && proxyIndices.filter(idx => (proxyFailureCount.get(idx) || 0) < 3).length > 0) {
            console.log(`[RSS] 跳过代理 ${i + 1}（失败 ${failures} 次）`)
            continue
        }

        try {
            const proxyUrl = proxy + encodeURIComponent(url)
            console.log(`[RSS] 尝试代理 ${i + 1}/${CORS_PROXIES.length}: ${proxy}`)

            // 添加 3 秒超时
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000)

            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' }
            })
            clearTimeout(timeoutId)

            if (response.ok) {
                const text = await response.text()

                // 验证响应内容不为空
                if (!text || text.trim().length === 0) {
                    errors.push(`代理 ${i + 1} 返回空内容`)
                    proxyFailureCount.set(i, failures + 1)
                    continue
                }

                // 验证响应内容看起来像XML
                if (!text.trim().startsWith('<')) {
                    errors.push(`代理 ${i + 1} 返回非XML内容: ${text.substring(0, 100)}`)
                    proxyFailureCount.set(i, failures + 1)
                    continue
                }

                console.log(`[RSS] 代理 ${i + 1} 成功`)

                // 记住成功的代理
                lastSuccessfulProxyIndex = i
                proxyFailureCount.set(i, 0) // 重置失败计数

                return text
            } else {
                errors.push(`代理 ${i + 1} HTTP错误: ${response.status}`)
                proxyFailureCount.set(i, failures + 1)
            }
        } catch (err) {
            lastError = err as Error
            const errorMsg = err instanceof Error && err.name === 'AbortError' ? '超时(3s)' : lastError.message
            errors.push(`代理 ${i + 1}: ${errorMsg}`)
            proxyFailureCount.set(i, failures + 1)
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
    const normalizedUrl = normalizeUrl(url)
    const xmlText = await fetchWithProxy(normalizedUrl)
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


