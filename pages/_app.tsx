import React from 'react'
import type { AppProps } from 'next/app'

import '@styles/global.css'
import { ThemeProvider, useTheme } from 'next-themes'

export default function MyApp({ Component, pageProps }: AppProps) {
  const { systemTheme } = useTheme()
  return (<ThemeProvider disableTransitionOnChange defaultTheme={systemTheme}>
      <Component {...pageProps} />
    </ThemeProvider>)
}
