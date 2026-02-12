/**
 * AI 设置模态框组件
 * 支持配置 baseUrl、apiKey、model
 */
import { useState, useEffect } from 'react'
import { X, Save, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { getAIConfig, saveAIConfig, resetAIConfig, type AIConfigData } from '@/services/ai'

interface AISettingsProps {
    isOpen: boolean
    onClose: () => void
}

const DEFAULT_VALUES = {
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
}

export function AISettings({ isOpen, onClose }: AISettingsProps) {
    const [model, setModel] = useState<string>(DEFAULT_VALUES.model)
    const [config, setConfig] = useState<AIConfigData>({
        baseUrl: '',
        apiKey: '',
    })
    const [showApiKey, setShowApiKey] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // 加载配置
    useEffect(() => {
        if (isOpen) {
            const currentConfig = getAIConfig()
            setConfig(currentConfig)
            setMessage(null)
        }
    }, [isOpen])

    // 保存配置
    const handleSave = () => {
        setIsSaving(true)
        try {
            saveAIConfig(config)
            setMessage({ type: 'success', text: '设置已保存！' })
            setTimeout(() => {
                onClose()
            }, 1000)
        } catch (err) {
            setMessage({ type: 'error', text: '保存失败，请重试' })
        } finally {
            setIsSaving(false)
        }
    }

    // 重置为默认值
    const handleReset = () => {
        resetAIConfig()
        setConfig(getAIConfig())
        setMessage({ type: 'success', text: '已重置为默认配置' })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* 头部 */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">AI 设置</h2>
                    <button
                        onClick={onClose}
                        className="btn-ghost p-2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 表单 */}
                <div className="p-4 space-y-4">
                    {/* Base URL */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            API Base URL
                        </label>
                        <input
                            type="url"
                            value={config.baseUrl}
                            onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                            placeholder={DEFAULT_VALUES.baseUrl}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            兼容 OpenAI 格式的 API 地址
                        </p>
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            API Key
                        </label>
                        <div className="relative">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={config.apiKey}
                                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                placeholder="sk-xxxxxx"
                                className="w-full px-3 py-2 pr-10 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                            >
                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Model */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            模型名称
                        </label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder={DEFAULT_VALUES.model}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            例如：Pro/deepseek-ai/DeepSeek-V3.2, Qwen/Qwen3-VL-32B-Instruct
                        </p>
                    </div>

                    {/* 消息提示 */}
                    {message && (
                        <div
                            className={`text-sm px-3 py-2 rounded-lg ${message.type === 'success'
                                ? 'bg-green-50 text-green-600'
                                : 'bg-red-50 text-red-600'
                                }`}
                        >
                            {message.text}
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-b-xl">
                    <button
                        onClick={handleReset}
                        className="btn-ghost flex items-center gap-1 text-slate-500"
                    >
                        <RotateCcw size={16} />
                        重置
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="btn-ghost px-4 py-2">
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Save size={16} />
                            {isSaving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
