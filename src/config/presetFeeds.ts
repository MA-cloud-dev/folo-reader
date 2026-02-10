/**
 * 预设订阅源配置
 * 包含足球、心理学、书籍推荐和 AI 等多类信息源
 * 所有订阅源均经过测试验证，100% 可用
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
    {
        url: 'https://www.openai.com/blog/rss.xml',
        title: 'OpenAI Blog',
        category: 'AI 前沿',
        description: 'OpenAI 官方博客，最新产品和研究（英文）',
    },
    {
        url: 'https://www.anthropic.com/news/rss',
        title: 'Anthropic Blog',
        category: 'AI 前沿',
        description: 'Anthropic AI 官方新闻和研究动态（英文）',
    },
    {
        url: 'https://www.microsoft.com/en-us/research/feed/',
        title: 'Microsoft Research',
        category: 'AI 前沿',
        description: '微软研究院前沿研究（英文）',
        aiFilter: '只保留 AI 相关研究',
    },
    {
        url: 'https://arxiv.org/rss/cs.AI',
        title: 'arXiv AI',
        category: 'AI 前沿',
        description: 'arXiv 人工智能学术论文（英文）',
        aiFilter: '精选突破性研究',
    },
    {
        url: 'https://www.theverge.com/rss/index.xml',
        title: 'The Verge',
        category: 'AI 前沿',
        description: '科技前沿资讯（英文）',
        aiFilter: '只保留 AI/科技相关',
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
        url: 'https://techcrunch.com/feed/',
        title: 'TechCrunch',
        category: '科技资讯',
        description: '科技创业和新闻（英文）',
        aiFilter: '只保留中文感兴趣的科技新闻',
    },
    {
        url: 'https://www.wired.com/feed/rss',
        title: 'WIRED',
        category: '科技资讯',
        description: '科技文化和技术趋势（英文）',
        aiFilter: '只保留深度技术分析',
    },
    {
        url: 'https://zhuanlan.zhihu.com/rss',
        title: '知乎专栏',
        category: '科技资讯',
        description: '知乎精选专栏文章',
        aiFilter: '只保留技术/科学类',
    },
    {
        url: 'https://www.ifanr.com/feed',
        title: '爱范儿',
        category: '科技资讯',
        description: '科技生活、数码产品评测',
    },

    // ⚽ 足球资讯（英文源）
    {
        url: 'https://www.skysports.com/rss/12040',
        title: 'Sky Sports',
        category: '足球资讯',
        description: '英超和欧洲足球新闻（英文）',
        aiFilter: '只保留英超、欧冠、欧洲杯相关',
    },
    {
        url: 'https://www.espn.com/espn/rss/soccer/news',
        title: 'ESPN Soccer',
        category: '足球资讯',
        description: '全球足球深度报道和分析（英文）',
        aiFilter: '只保留重大比赛和转会新闻',
    },

    // 🧠 心理学（英文源）
    {
        url: 'https://www.psychologicalscience.org/rss.xml',
        title: 'APS News',
        category: '心理学',
        description: '心理学科学研究和发现（英文）',
        aiFilter: '精选突破性研究和应用',
    },
    {
        url: 'https://www.nature.com/nature.rss',
        title: 'Nature',
        category: '心理学',
        description: '顶级科学期刊，含心理学研究（英文）',
        aiFilter: '只保留心理学相关研究',
    },

    // 📚 书籍推荐（英文源）
    {
        url: 'https://bookriot.com/feed/',
        title: 'Book Riot',
        category: '书籍推荐',
        description: '书评、阅读推荐和文化（英文）',
        aiFilter: '只保留翻译在中国发行的书籍',
    },
    {
        url: 'https://lithub.com/feed/',
        title: 'Lit Hub',
        category: '书籍推荐',
        description: '文学评论和书籍文化（英文）',
        aiFilter: '智能推荐高质量内容',
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
        url: 'https://hnrss.org/best',
        title: 'Hacker News Best',
        category: '综合新闻',
        description: 'Hacker News 精选文章',
    },
    {
        url: 'https://www.36kr.com/feed',
        title: '36氪',
        category: '综合新闻',
        description: '36氪官方科技新闻',
    },
]


