import { storeGet, storeSet } from "@classy/lib"
import { useEffect } from "react"
import { create } from 'zustand'

type ThemeMode = 'dark' | 'light'

const cacheKey = 'config_theme';

const matchDarkColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches

interface ThemeState {
    theme: ThemeMode
    toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
    theme: storeGet(cacheKey, matchDarkColorScheme ? 'dark' : 'light'),
    toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' }))
}))

export const useThemeMode = () => {

    const theme = useThemeStore((state) => state.theme)
    const toggleTheme = useThemeStore((state) => state.toggleTheme)

    useEffect(() => {
        storeSet(cacheKey, theme)

        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [theme])

    return { theme, toggleTheme }
}