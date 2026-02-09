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
