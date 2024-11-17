'use client'

import Tooltip from '@components/tooltip'
import { Button } from '@components/ui/button'
import { useTheme } from 'next-themes'
import { PropsWithChildren, useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@lib/utils'
import { Skeleton } from '@components/ui/skeleton'

const ThemeSwitcher = ({
  className = '',
  iconSize = 24,
  hideTooltip = false,
  strokeWidth,
}: {
  className?: string
  iconSize?: number
  hideTooltip?: boolean
  strokeWidth?: number
}) => {
  const { theme: activeTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const Wrapper = ({ children }: PropsWithChildren) =>
    hideTooltip ? (
      <>{children}</>
    ) : (
      <Tooltip text={activeTheme === 'light' ? 'Dark mode' : 'Light mode'}>
        {children}
      </Tooltip>
    )

  if (!mounted) {
    return (
      <Skeleton className={cn('w-6 h-6', className)} />
    )
  }

  return (
    <Wrapper>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(activeTheme === "light" ? "dark" : "light")}
        className={cn("w-6 h-6 text-muted-foreground hover:text-foreground", className)}
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </Wrapper >
  )
}

export default ThemeSwitcher
