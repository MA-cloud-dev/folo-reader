/**
 * 文章 HTML 清洗与结构化解析
 * 保留语义标签、移除噪声，确保子标题与正文有清晰的层级区分
 */

/** 允许保留的标签白名单 */
const ALLOWED_TAGS = new Set([
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'P', 'BR', 'HR',
    'UL', 'OL', 'LI',
    'BLOCKQUOTE', 'PRE', 'CODE',
    'A', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'SUB', 'SUP', 'MARK',
    'IMG', 'FIGURE', 'FIGCAPTION',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
    'DIV', 'SPAN', 'SECTION', 'ARTICLE', 'MAIN',
])

/** 需要完全移除的标签（含内容） */
const REMOVE_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'FORM',
    'NAV', 'HEADER', 'FOOTER', 'ASIDE',
    'SVG', 'CANVAS', 'VIDEO', 'AUDIO',
    'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON',
])

/** 需要清除的属性（保留 src/href/alt） */
const KEEP_ATTRS = new Set(['src', 'href', 'alt', 'title', 'colspan', 'rowspan'])

/**
 * 从 HTML 中提取主体内容区域
 */
function extractMainContent(doc: Document): Element {
    // 按优先级尝试选择主内容区域
    const selectors = [
        'article',
        'main',
        '[role="main"]',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.content',
        '.post-body',
        '#content',
    ]

    for (const selector of selectors) {
        const el = doc.querySelector(selector)
        if (el && el.textContent && el.textContent.trim().length > 200) {
            return el
        }
    }

    return doc.body || doc.documentElement
}

/**
 * 递归清洗 DOM 节点
 */
function sanitizeNode(node: Node, output: HTMLElement): void {
    for (const child of Array.from(node.childNodes)) {
        // 文本节点直接保留
        if (child.nodeType === Node.TEXT_NODE) {
            if (child.textContent && child.textContent.trim()) {
                output.appendChild(child.cloneNode(true))
            }
            continue
        }

        // 非元素节点跳过
        if (child.nodeType !== Node.ELEMENT_NODE) continue

        const el = child as Element
        const tag = el.tagName.toUpperCase()

        // 完全移除的标签
        if (REMOVE_TAGS.has(tag)) continue

        // 白名单标签：创建干净副本
        if (ALLOWED_TAGS.has(tag)) {
            const clean = document.createElement(tag.toLowerCase())

            // 只保留必要属性
            for (const attr of Array.from(el.attributes)) {
                if (KEEP_ATTRS.has(attr.name.toLowerCase())) {
                    // 安全检查 href/src
                    if (attr.name === 'href' || attr.name === 'src') {
                        const val = attr.value.trim()
                        if (val.startsWith('javascript:') || val.startsWith('data:text')) continue
                    }
                    clean.setAttribute(attr.name, attr.value)
                }
            }

            // 链接强制新标签页打开
            if (tag === 'A') {
                clean.setAttribute('target', '_blank')
                clean.setAttribute('rel', 'noopener noreferrer')
            }

            // 递归处理子节点
            sanitizeNode(el, clean)

            // 只添加非空节点
            if (clean.childNodes.length > 0 || ['BR', 'HR', 'IMG'].includes(tag)) {
                output.appendChild(clean)
            }
        } else {
            // 非白名单标签：展开其子节点（不保留外层标签）
            sanitizeNode(el, output)
        }
    }
}

/**
 * 清洗文章 HTML，保留语义结构
 * @param rawHtml 原始 HTML
 * @returns 清洗后的 HTML 字符串
 */
export function sanitizeArticleHtml(rawHtml: string): string {
    if (!rawHtml.trim()) return ''

    const parser = new DOMParser()
    const doc = parser.parseFromString(rawHtml, 'text/html')

    // 提取主内容区域
    const mainContent = extractMainContent(doc)

    // 创建输出容器
    const output = document.createElement('div')

    // 递归清洗
    sanitizeNode(mainContent, output)

    // 后处理：合并连续空白 div，移除空段落
    output.querySelectorAll('p, div, span').forEach(el => {
        if (!el.textContent?.trim() && !el.querySelector('img')) {
            el.remove()
        }
    })

    return output.innerHTML
}
