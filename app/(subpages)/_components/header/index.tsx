import { PropsWithChildren } from 'react'

import ThemeSwitcher from '@components/theme-switcher'

const Header = ({ children }: PropsWithChildren) => {
  return (
    <div className='flex items-center justify-between my-4'>
      {children}
      <div>
        <ThemeSwitcher hideTooltip />
      </div>
    </div>
  )
}

export default (Header)
