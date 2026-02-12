/**
 * 主题管理 Store
 * 支持 light / dark / system 三种模式
 */
import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'folo_theme'

interface ThemeState {
    theme: Theme
    isDark: boolean
    setTheme: (theme: Theme) => void
}

function getSystemDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: Theme): boolean {
    const isDark = theme === 'dark' || (theme === 'system' && getSystemDark())
    document.documentElement.classList.toggle('dark', isDark)
    return isDark
}

function loadTheme(): Theme {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system'
}

export const useThemeStore = create<ThemeState>((set) => {
    const theme = loadTheme()
    const isDark = applyTheme(theme)

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const currentTheme = loadTheme()
        if (currentTheme === 'system') {
            const newIsDark = applyTheme('system')
            set({ isDark: newIsDark })
        }
    })

    return {
        theme,
        isDark,
        setTheme: (theme: Theme) => {
            localStorage.setItem(THEME_KEY, theme)
            const isDark = applyTheme(theme)
            set({ theme, isDark })
        },
    }
})
