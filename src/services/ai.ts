/**
 * AI 服务 - 支持用户自定义配置
 * 配置优先级：用户设置 > 环境变量 > 默认值
 */
import OpenAI from 'openai'
import { DEFAULT_AI_CONFIG } from '@/types'

// 配置存储 key
const AI_CONFIG_KEY = 'folo_ai_config'

// 配置数据类型
export interface AIConfigData {
    baseUrl: string
    apiKey: string
    model: string
}

// 默认配置
const DEFAULT_CONFIG: AIConfigData = {
    baseUrl: DEFAULT_AI_CONFIG.baseUrl,
    apiKey: import.meta.env.VITE_SILICONFLOW_API_KEY || '',
    model: DEFAULT_AI_CONFIG.model,
}

/**
 * 获取 AI 配置
 */
export function getAIConfig(): AIConfigData {
    try {
        const stored = localStorage.getItem(AI_CONFIG_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            return {
                baseUrl: parsed.baseUrl || DEFAULT_CONFIG.baseUrl,
                apiKey: parsed.apiKey || DEFAULT_CONFIG.apiKey,
                model: parsed.model || DEFAULT_CONFIG.model,
            }
        }
    } catch (e) {
        console.error('Failed to load AI config:', e)
    }
    return { ...DEFAULT_CONFIG }
}

/**
 * 保存 AI 配置
 */
export function saveAIConfig(config: Partial<AIConfigData>): void {
    const current = getAIConfig()
    const newConfig = { ...current, ...config }
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(newConfig))
}

/**
 * 重置 AI 配置
 */
export function resetAIConfig(): void {
    localStorage.removeItem(AI_CONFIG_KEY)
}

/**
 * 获取当前模型名称
 */
export function getCurrentModel(): string {
    return getAIConfig().model
}

// 获取 OpenAI 客户端
function getAIClient() {
    const config = getAIConfig()

    if (!config.apiKey || config.apiKey === 'your_api_key_here') {
        throw new Error('请先在设置中配置 API Key')
    }

    return new OpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true,
    })
}


/**
 * 生成文章摘要
 */
export async function generateSummary(content: string): Promise<string> {
    const client = getAIClient()

    // 限制内容长度，避免 token 超限
    const truncatedContent = content.slice(0, 6000)

    const response = await client.chat.completions.create({
        model: getCurrentModel(),
        messages: [
            {
                role: 'system',
                content: `你是一个专业的内容摘要助手。请用简洁的中文总结以下文章的核心观点，要求：
1. 摘要不超过 150 字
2. 提取 2-3 个关键要点
3. 如果是技术文章，突出技术亮点
4. 如果是新闻，突出关键信息（时间、人物、事件）
5. 使用 Markdown 格式输出`,
            },
            {
                role: 'user',
                content: truncatedContent,
            },
        ],
        max_tokens: 500,
        temperature: 0.3,
    })

    return response.choices[0]?.message?.content || '摘要生成失败'
}

/**
 * 翻译文本
 */
export async function translateText(
    content: string,
    targetLang: string = '中文'
): Promise<string> {
    const client = getAIClient()

    const truncatedContent = content.slice(0, 6000)

    const response = await client.chat.completions.create({
        model: getCurrentModel(),
        messages: [
            {
                role: 'system',
                content: `你是一个专业的翻译助手。请将以下内容翻译为${targetLang}。要求：
1. 保持原文的语义和风格
2. 对于专业术语，可保留英文原词并在括号中注释
3. 翻译要自然流畅`,
            },
            {
                role: 'user',
                content: truncatedContent,
            },
        ],
        max_tokens: 2000,
        temperature: 0.3,
    })

    return response.choices[0]?.message?.content || '翻译失败'
}

/**
 * 检查 AI 服务是否可用
 */
export function isAIConfigured(): boolean {
    const config = getAIConfig()
    return !!config.apiKey && config.apiKey !== 'your_api_key_here'
}

/**
 * 基于文章内容的对话
 */
export async function chatWithAI(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    articleTitle: string,
    articleContent: string
): Promise<string> {
    const client = getAIClient()

    // 构建系统提示
    const systemPrompt = articleContent
        ? `你是一个智能阅读助手。用户正在阅读一篇文章，你需要基于文章内容回答用户的问题。

文章标题：${articleTitle}

文章内容：
${articleContent.slice(0, 6000)}

请根据文章内容回答用户的问题。如果问题与文章无关，可以友好地引导用户询问与文章相关的问题。回答要简洁、准确、有帮助。使用中文回答。`
        : `你是一个智能阅读助手。请用中文回答用户的问题，回答要简洁、准确、有帮助。`

    // 构建消息列表
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10), // 保留最近 10 条对话历史
        { role: 'user', content: userMessage },
    ]

    const response = await client.chat.completions.create({
        model: getCurrentModel(),
        messages,
        max_tokens: 1000,
        temperature: 0.7,
    })

    return response.choices[0]?.message?.content || '抱歉，我无法生成回复。'
}

/**
 * AI 筛选文章 - 根据规则判断文章是否符合用户兴趣
 * @param articleTitle 文章标题
 * @param filterRule 筛选规则（自然语言描述）
 * @returns true = 保留，false = 过滤掉
 */
export async function filterArticleByAI(
    articleTitle: string,
    filterRule: string
): Promise<boolean> {
    if (!isAIConfigured() || !filterRule) {
        return true // 未配置则默认保留
    }

    try {
        const client = getAIClient()

        const response = await client.chat.completions.create({
            model: getCurrentModel(),
            messages: [
                {
                    role: 'system',
                    content: `你是一个内容筛选助手。根据用户的筛选规则，判断文章标题是否符合用户的兴趣。
只回复 "是" 或 "否"，不要解释。

筛选规则：${filterRule}`,
                },
                {
                    role: 'user',
                    content: `文章标题：${articleTitle}`,
                },
            ],
            max_tokens: 10,
            temperature: 0,
        })

        const answer = response.choices[0]?.message?.content?.trim() || ''
        return answer.includes('是') || answer.toLowerCase().includes('yes')
    } catch (err) {
        console.error('AI filter error:', err)
        return true // 出错时默认保留
    }
}

/**
 * 批量筛选文章
 */
export async function filterArticlesBatch(
    articles: Array<{ id: string; title: string }>,
    filterRule: string
): Promise<Set<string>> {
    if (!isAIConfigured() || !filterRule) {
        return new Set(articles.map(a => a.id)) // 全部保留
    }

    try {
        const client = getAIClient()

        const titlesText = articles.map((a, i) => `${i + 1}. ${a.title}`).join('\n')

        const response = await client.chat.completions.create({
            model: getCurrentModel(),
            messages: [
                {
                    role: 'system',
                    content: `你是一个内容筛选助手。根据用户的筛选规则，判断每篇文章是否符合用户的兴趣。
只回复符合条件的文章编号，用逗号分隔。如果都不符合，回复"无"。

筛选规则：${filterRule}`,
                },
                {
                    role: 'user',
                    content: `请判断以下文章：\n${titlesText}`,
                },
            ],
            max_tokens: 200,
            temperature: 0,
        })

        const answer = response.choices[0]?.message?.content?.trim() || ''

        if (answer === '无' || !answer) {
            return new Set()
        }

        // 解析返回的编号
        const matchedIds = new Set<string>()
        const numbers = answer.match(/\d+/g)
        if (numbers) {
            numbers.forEach(numStr => {
                const idx = parseInt(numStr, 10) - 1
                if (idx >= 0 && idx < articles.length) {
                    matchedIds.add(articles[idx].id)
                }
            })
        }

        return matchedIds
    } catch (err) {
        console.error('AI batch filter error:', err)
        return new Set(articles.map(a => a.id)) // 出错时全部保留
    }
}


