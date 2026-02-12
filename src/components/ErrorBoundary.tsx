/**
 * React 错误边界组件
 * 防止单个组件崩溃导致整个应用白屏
 */
import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
    children: ReactNode
    fallbackTitle?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <AlertTriangle size={48} className="text-orange-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">
                        {this.props.fallbackTitle || '该模块出现了问题'}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4 max-w-md">
                        {this.state.error?.message || '发生了未知错误'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                        <RefreshCw size={16} />
                        重试
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
