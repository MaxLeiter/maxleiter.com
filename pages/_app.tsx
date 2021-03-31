import React from 'react'
import App from 'next/app'
import Router from 'next/router'
import '@styles/global.css'

const MATOMO_URL = process.env.NEXT_PUBLIC_MATOMO_URL;
const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID;

Router.events.on("routeChangeStart", url => {
  //@ts-ignore
  if (window && window._paq) {
    window._paq.push(["setCustomUrl", url]);
    window._paq.push(["setDocumentTitle", document.title]);
    window._paq.push(["trackPageView"]);
  }
});

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props
    return (
      <Component {...pageProps} />
    )
  }
}

export default MyApp
