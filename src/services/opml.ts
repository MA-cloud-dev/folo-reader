/**
 * OPML (Outline Processor Markup Language) 服务
 * 用于导入和导出 RSS 订阅源
 */
import { Feed } from '@/types'

export interface OpmlFeed {
    title: string
    xmlUrl: string
    htmlUrl?: string
    category?: string
}

/**
 * 解析 OPML XML 内容
 */
export function parseOpml(xmlContent: string): OpmlFeed[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlContent, 'text/xml')

    const feeds: OpmlFeed[] = []

    // 递归查找 outline 节点
    function traverse(node: Element, category?: string) {
        const children = Array.from(node.children)

        for (const child of children) {
            if (child.tagName.toLowerCase() === 'outline') {
                const xmlUrl = child.getAttribute('xmlUrl')
                const text = child.getAttribute('text') || child.getAttribute('title') || ''

                // 如果是 RSS 节点
                if (xmlUrl) {
                    feeds.push({
                        title: text,
                        xmlUrl: xmlUrl,
                        htmlUrl: child.getAttribute('htmlUrl') || undefined,
                        category: category // 使用父级目录作为分类
                    })
                }
                // 如果是目录节点（没有 xmlUrl 但有 text/title）
                else if (text && !xmlUrl) {
                    // 继续遍历子节点，将当前 text 作为分类传递
                    traverse(child, text)
                }
                // 某些 OPML 结构可能在顶层
                else {
                    traverse(child, category)
                }
            } else {
                traverse(child, category)
            }
        }
    }

    const body = doc.querySelector('body')
    if (body) {
        traverse(body)
    }

    return feeds
}

/**
 * 生成 OPML XML 内容
 */
export function generateOpml(feeds: Feed[]): string {
    // 按分类分组
    const grouped: Record<string, Feed[]> = {}
    const uncategorized: Feed[] = []

    feeds.forEach(feed => {
        if (feed.category) {
            if (!grouped[feed.category]) grouped[feed.category] = []
            grouped[feed.category].push(feed)
        } else {
            uncategorized.push(feed)
        }
    })

    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<opml version="1.0">',
        '<head>',
        '    <title>Folo Feeds Export</title>',
        `    <dateCreated>${new Date().toUTCString()}</dateCreated>`,
        '</head>',
        '<body>'
    ]

    // 处理分类组
    Object.entries(grouped).forEach(([category, categoryFeeds]) => {
        lines.push(`    <outline text="${escapeXml(category)}" title="${escapeXml(category)}">`)
        categoryFeeds.forEach(feed => {
            lines.push(generateOutlineItem(feed, 8))
        })
        lines.push('    </outline>')
    })

    // 处理未分类
    uncategorized.forEach(feed => {
        lines.push(generateOutlineItem(feed, 4))
    })

    lines.push('</body>')
    lines.push('</opml>')

    return lines.join('\n')
}

function generateOutlineItem(feed: Feed, indentSpaces: number): string {
    const indent = ' '.repeat(indentSpaces)
    const title = escapeXml(feed.title)
    const xmlUrl = escapeXml(feed.url)
    const htmlUrl = feed.siteUrl ? ` htmlUrl="${escapeXml(feed.siteUrl)}"` : ''

    return `${indent}<outline type="rss" text="${title}" title="${title}" xmlUrl="${xmlUrl}"${htmlUrl} />`
}

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;'
            case '>': return '&gt;'
            case '&': return '&amp;'
            case '\'': return '&apos;'
            case '"': return '&quot;'
            default: return c
        }
    })
}
