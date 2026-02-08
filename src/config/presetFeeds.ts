/**
 * 预设订阅源配置
 * 包含足球和 AI 两大类信息源
 */

export interface PresetFeed {
    url: string
    title: string
    category: string
    description: string
    aiFilter?: string // AI 筛选规则
}

export const PRESET_FEEDS: PresetFeed[] = [
    // ⚽ 足球相关
    {
        url: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml',
        title: 'BBC 英超',
        category: '足球',
        description: 'BBC 英超官方报道',
    },
    {
        url: 'https://www.espn.com/espn/rss/soccer/news',
        title: 'ESPN 足球',
        category: '足球',
        description: 'ESPN 国际足球新闻',
        aiFilter: '只保留与英超、梅西、C罗、曼城、皇马、巴萨、迈阿密国际相关的内容',
    },
    {
        url: 'https://rsshub.app/dongqiudi/top_news',
        title: '懂球帝热门',
        category: '足球',
        description: '懂球帝热门足球资讯',
        aiFilter: '只保留与英超、梅西、C罗相关的内容',
    },

    // 🤖 AI 应用
    {
        url: 'https://rsshub.app/github/trending/daily/all',
        title: 'GitHub 热门',
        category: 'AI 应用',
        description: 'GitHub 每日趋势项目',
        aiFilter: '只保留与 AI、机器学习、LLM、深度学习、GPT、开源工具相关的项目',
    },
    {
        url: 'https://hnrss.org/frontpage',
        title: 'Hacker News',
        category: 'AI 应用',
        description: 'Hacker News 头版热点',
        aiFilter: '只保留与 AI、机器学习、开源项目、编程工具相关的内容',
    },
    {
        url: 'https://huggingface.co/blog/feed.xml',
        title: 'Hugging Face',
        category: 'AI 应用',
        description: 'Hugging Face 开源 AI 社区博客',
    },

    // 🧠 AI 理论
    {
        url: 'https://openai.com/blog/rss.xml',
        title: 'OpenAI Blog',
        category: 'AI 理论',
        description: 'OpenAI 官方博客',
    },
    {
        url: 'https://blog.research.google/feeds/posts/default?alt=rss',
        title: 'Google AI',
        category: 'AI 理论',
        description: 'Google AI 研究博客',
    },
    {
        url: 'https://www.anthropic.com/news.rss',
        title: 'Anthropic',
        category: 'AI 理论',
        description: 'Claude 开发商官方动态',
    },
    {
        url: 'https://rsshub.app/jiqizhixin/daily',
        title: '机器之心',
        category: 'AI 理论',
        description: '中文 AI 前沿资讯',
    },
]

/**
 * 检查是否已初始化预设订阅源
 */
export function hasInitializedPresets(): boolean {
    return localStorage.getItem('folo_presets_initialized') === 'true'
}

/**
 * 标记已初始化预设订阅源
 */
export function markPresetsInitialized(): void {
    localStorage.setItem('folo_presets_initialized', 'true')
}

/**
 * 重置预设初始化状态（用于重新添加预设）
 */
export function resetPresetsInitialized(): void {
    localStorage.removeItem('folo_presets_initialized')
}
