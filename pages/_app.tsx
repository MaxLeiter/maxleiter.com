import React from 'react'
import App from 'next/app'
import Router from 'next/router'
import '@styles/global.css'

Router.events.on("routeChangeStart", url => {
  console.log("yeah")
  //@ts-ignore
  if (window && window._paq) {
    window._paq.push(["setCustomUrl", url]);
    window._paq.push(["setDocumentTitle", document.title]);
    window._paq.push(["trackPageView"]);
  }
});

class MyApp extends App {
  componentDidMount() {
    if (window && window._paq) {
      window._paq.push(["setCustomUrl", window.location.href]);
      window._paq.push(["setDocumentTitle", document.title]);
      window._paq.push(["trackPageView"]);
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
