import { Moon, Sun } from '@components/icons'
import { useTheme } from 'next-themes'
import socialStyles from '@components/socials/socials.module.css'
import Tooltip from '@components/tooltip'
import { useEffect, useState } from 'react'

const ThemeSwitcher = ({ className = '', iconSize = 24 }: { className?: string, iconSize?: number }) => {
  const { theme: activeTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Tooltip text={activeTheme === 'light' ? 'Dark mode' : 'Light mode'}>
      <button
        onClick={() => setTheme(activeTheme === 'light' ? 'dark' : 'light')}
        aria-label="Change the theme"
        className={`${socialStyles.icon} ${className}`}
      >
        {mounted && activeTheme === 'light' ? <Moon size={iconSize} /> : <Sun size={iconSize} />}
      </button>
    </Tooltip>
  )
}

export default ThemeSwitcher
