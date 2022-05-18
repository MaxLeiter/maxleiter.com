import Link from '@components/link'

import styles from './socials.module.css'
import { GitHub, Twitter, LinkedIn, Mail, RSS } from '@components/icons'
import Tooltip from '@components/tooltip'
import ThemeSwitcher from '@components/theme-switcher'
import { useTheme } from 'next-themes'

type SocialButtonProps = {
  href: string
  icon: React.ReactNode
  tooltip: string
}
const SocialButton = ({ tooltip, href, icon }: SocialButtonProps) => {
  return (
    <Tooltip text={tooltip}>
      <Link href={href} className={styles.icon}>
        {icon}
        <span className={styles['sr-only']}>{tooltip}</span>
      </Link>
    </Tooltip>
  )
}
const Socials = () => {
  return (
    <div className={styles.socials}>
      <SocialButton
        href="https://github.com/maxleiter"
        icon={<GitHub />}
        tooltip="GitHub"
      />
      <SocialButton
        href="https://twitter.com/max_leiter"
        icon={<Twitter />}
        tooltip="Twitter"
      />
      <SocialButton
        href="https://www.linkedin.com/in/maxleiter/"
        icon={<LinkedIn />}
        tooltip="LinkedIn"
      />
      <SocialButton
        href="mailto:maxwell.leiter@gmail.com"
        icon={<Mail />}
        tooltip="Email"
      />
      <SocialButton
        href="/feed.xml"
        icon={<RSS />}
        tooltip="RSS"
      />
      <ThemeSwitcher />
    </div>
  )
}

export default Socials
