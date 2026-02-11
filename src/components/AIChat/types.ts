export interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    model?: string // AI 模型名称
    status?: 'sending' | 'success' | 'error' | 'interrupted'
    error?: string
}
