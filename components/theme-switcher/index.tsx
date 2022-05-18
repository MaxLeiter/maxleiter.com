import { Moon, Sun } from "@components/icons"
import { useTheme } from "next-themes"
import socialStyles from '@components/socials/socials.module.css'
import Tooltip from "@components/tooltip"

const ThemeSwitcher = ({ className = '' }: {
    className?: string
}) => {
    const { theme: activeTheme, setTheme } = useTheme()
    
    return (
        <Tooltip text={activeTheme === 'light' ? 'Dark mode' : 'Light mode'}><button
            onClick={() => setTheme(activeTheme === "light" ? "dark" : "light")}
            aria-label="Change the theme"
            className={`${socialStyles.icon} ${className}`}
        >
            {activeTheme === "light" ? <Moon /> : <Sun />}
        </button></Tooltip>
    )
}

export default ThemeSwitcher