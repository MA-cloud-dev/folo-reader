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
    // 🤖 AI 前沿
    {
        url: 'https://hnrss.org/frontpage',
        title: 'Hacker News',
        category: 'AI 前沿',
        description: '技术社区热点，配合 AI 筛选获取 AI 相关内容',
        aiFilter: '只保留与 AI、机器学习、LLM、GPT、深度学习、OpenAI、Anthropic、Google AI 相关的内容',
    },
    {
        url: 'https://www.technologyreview.com/feed/',
        title: 'MIT 科技评论',
        category: 'AI 前沿',
        description: '麻省理工科技评论，深度技术分析',
    },
    {
        url: 'https://deepmind.google/blog/rss.xml',
        title: 'DeepMind Blog',
        category: 'AI 前沿',
        description: 'Google DeepMind 研究博客',
    },
    {
        url: 'https://aiweekly.co/feed.xml',
        title: 'AI Weekly',
        category: 'AI 前沿',
        description: 'AI 行业周报精选',
    },
    {
        url: 'https://aigc-weekly.agi.li/rss.xml',
        title: 'AIGC Weekly',
        category: 'AI 前沿',
        description: 'AIGC 技术周刊',
    },

    // 📱 科技资讯
    {
        url: 'https://sspai.com/feed',
        title: '少数派',
        category: '科技资讯',
        description: '数字生活、效率工具、应用推荐',
    },
    {
        url: 'https://www.ruanyifeng.com/blog/atom.xml',
        title: '阮一峰的网络日志',
        category: '科技资讯',
        description: '技术博客、编程、科技评论',
    },
    {
        url: 'https://www.solidot.org/index.rss',
        title: 'Solidot',
        category: '科技资讯',
        description: '奇客资讯、开源新闻、科技动态',
    },
    {
        url: 'https://rsshub.app/juejin/category/frontend',
        title: '掘金前端',
        category: '科技资讯',
        description: '掘金前端技术文章（RSSHub）',
    },
    {
        url: 'https://rsshub.app/v2ex/topics/latest',
        title: 'V2EX 最新',
        category: '科技资讯',
        description: 'V2EX 最新主题讨论（RSSHub）',
    },

    // ⚽ 足球资讯
    {
        url: 'https://rsshub.app/dongqiudi/daily',
        title: '懂球帝',
        category: '足球资讯',
        description: '中文足球资讯（RSSHub）',
    },
    {
        url: 'https://rsshub.app/hupu/bbs/topic/international',
        title: '虎扑足球',
        category: '足球资讯',
        description: '虎扑国际足球话题（RSSHub）',
    },

    // 💰 财经经济
    {
        url: 'https://rsshub.app/caixin/finance/article',
        title: '财新网',
        category: '财经经济',
        description: '国内权威财经深度报道（RSSHub）',
    },
    {
        url: 'https://rsshub.app/yicai/news',
        title: '第一财经',
        category: '财经经济',
        description: '第一财经资讯（RSSHub）',
    },

    // 🧠 心理学
    {
        url: 'https://rsshub.app/xinli001/selection',
        title: '壹心理',
        category: '心理学',
        description: '中文心理学科普和自我成长（RSSHub）',
    },
    {
        url: 'https://rsshub.app/psychspace/viewnews',
        title: '心理学空间',
        category: '心理学',
        description: '专业心理学资讯和研究（RSSHub）',
    },

    // 📚 书籍推荐
    {
        url: 'https://rsshub.app/douban/book/latest',
        title: '豆瓣读书',
        category: '书籍推荐',
        description: '豆瓣最新热门书籍（RSSHub）',
    },
    {
        url: 'https://rsshub.app/imaginist/newest',
        title: '理想国图书',
        category: '书籍推荐',
        description: '理想国出版社新书（RSSHub）',
    },

    // 🔓 开源项目
    {
        url: 'https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml',
        title: 'GitHub Trending',
        category: '开源项目',
        description: 'GitHub 每日热门开源项目',
    },
    {
        url: 'https://hellogithub.com/rss',
        title: 'HelloGitHub',
        category: '开源项目',
        description: '中文开源项目月刊',
    },

    // 📰 综合新闻
    {
        url: 'https://rsshub.app/zhihu/hotlist',
        title: '知乎热榜',
        category: '综合新闻',
        description: '知乎热门话题（RSSHub）',
    },
    {
        url: 'https://rsshub.app/36kr/newsflashes',
        title: '36氪快讯',
        category: '综合新闻',
        description: '36氪科技快讯（RSSHub）',
    },
]


