import React from 'react'
import App from 'next/app'
import { init } from "@socialgouv/matomo-next";

import '@styles/global.css'

const MATOMO_URL = process.env.MATOMO_URL;
const MATOMO_SITE_ID = process.env.MATOMO_SITE_ID;

class MyApp extends App {
  componentDidMount() {
    if (MATOMO_SITE_ID && MATOMO_URL) {
      init({ url: MATOMO_URL, siteId: MATOMO_SITE_ID });
    }
  }

  render() {
    const { Component, pageProps } = this.props
    return (
        <Component {...pageProps} />
    )
  }
}

export default MyApp
