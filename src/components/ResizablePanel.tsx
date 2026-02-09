/**
 * 可拖动调整大小的面板组件
 */
import { useState, useRef, useEffect, ReactNode } from 'react'
import { clsx } from 'clsx'

interface ResizablePanelProps {
    children: ReactNode
    width: number
    minWidth: number
    maxWidth: number
    onResize: (newWidth: number) => void
    className?: string
    showHandle?: boolean // 是否显示拖动手柄
    handlePosition?: 'left' | 'right' // 拖动手柄位置
}

export function ResizablePanel({
    children,
    width,
    minWidth,
    maxWidth,
    onResize,
    className,
    showHandle = true,
    handlePosition = 'right',
}: ResizablePanelProps) {
    const [isResizing, setIsResizing] = useState(false)
    const [tempWidth, setTempWidth] = useState(width)
    const startXRef = useRef(0)
    const startWidthRef = useRef(0)

    // 同步外部 width 变化
    useEffect(() => {
        setTempWidth(width)
    }, [width])

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsResizing(true)
        startXRef.current = e.clientX
        startWidthRef.current = tempWidth

        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }

    useEffect(() => {
        if (!isResizing) return

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - startXRef.current
            // 左侧拖动时,向左移动应该增加宽度(delta为负),所以需要反向
            const adjustedDelta = handlePosition === 'left' ? -delta : delta
            const newWidth = Math.max(
                minWidth,
                Math.min(maxWidth, startWidthRef.current + adjustedDelta)
            )
            setTempWidth(newWidth)
        }

        const handleMouseUp = () => {
            setIsResizing(false)
            onResize(tempWidth)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isResizing, tempWidth, minWidth, maxWidth, onResize])

    return (
        <div
            className={clsx('relative flex-shrink-0', className)}
            style={{
                width: isResizing ? tempWidth : width,
                transition: isResizing ? 'none' : 'width 0.2s ease-out'
            }}
        >
            {children}

            {/* 拖动手柄 */}
            {showHandle && (
                <div
                    onMouseDown={handleMouseDown}
                    className={clsx(
                        'absolute top-0 bottom-0 w-1 cursor-col-resize z-50',
                        handlePosition === 'left' ? 'left-0' : 'right-0',
                        'hover:bg-orange-400 transition-colors',
                        isResizing && 'bg-orange-500'
                    )}
                    title="拖动调整宽度"
                />
            )}
        </div>
    )
}
