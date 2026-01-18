'use client'

import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('amoled')
    if (theme === 'amoled') {
      root.classList.add('amoled')
    }
  }, [theme])

  return <>{children}</>
}
