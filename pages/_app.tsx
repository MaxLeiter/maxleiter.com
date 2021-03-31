import React from 'react'
import App from 'next/app'
import { MatomoProvider, createInstance } from '@datapunt/matomo-tracker-react'
import '@styles/global.css'

const MATOMO_URL = process.env.NEXT_PUBLIC_MATOMO_URL;
const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID;
const instance = createInstance({
  urlBase: `https://${MATOMO_URL}`,
  siteId: MATOMO_SITE_ID ? parseInt(MATOMO_SITE_ID) : 1,
  linkTracking: true
  // trackerUrl: 'https://LINK.TO.DOMAIN/tracking.php', // optional, default value: `${urlBase}matomo.php`
  // srcUrl: 'https://LINK.TO.DOMAIN/tracking.js', // optional, default value: `${urlBase}matomo.js`
})

class MyApp extends App {

  render() {
    const { Component, pageProps } = this.props
    return (
      <MatomoProvider value={instance}><Component {...pageProps} /></MatomoProvider>
    )
  }
}

export default MyApp
