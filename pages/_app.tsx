import React from 'react'
import App from 'next/app'
import '@styles/global.css'

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
