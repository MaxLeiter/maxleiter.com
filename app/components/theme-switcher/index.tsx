'use client'

import FadeIn from '@components/fade-in'
import { Moon, Sun } from '@components/icons'
import socialStyles from '@components/socials/socials.module.css'
import Tooltip from '@components/tooltip'
import { useTheme } from 'next-themes'
import { PropsWithChildren, useEffect, useState } from 'react'

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

  return (
    <Wrapper>
      <button
        onClick={() => setTheme(activeTheme === 'light' ? 'dark' : 'light')}
        aria-label="Change the theme"
        className={`${socialStyles.icon} ${className}`}
      >
        {mounted ? <FadeIn>{
          activeTheme === 'light' ? (
            <Moon size={iconSize} strokeWidth={strokeWidth || 2} />
          ) : (
            <Sun size={iconSize} strokeWidth={strokeWidth || 1} />
          )
        } </FadeIn> : <span style={{ opacity: 0 }} aria-hidden><Moon size={iconSize} /></span>}
      </button>
    </Wrapper>
  )
}

export default ThemeSwitcher
