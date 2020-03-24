import Document, { Html, Head, Main, NextScript } from "next/document";
import React from "react";

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta name="description" content="Max Leiter - projects and work" />
          <meta
            name="keywords"
            content="Max,Leiter,Max Leiter,projects,resume,the lounge,thelounge,knightos,sotware, x11, ios, "
          />
          <meta charSet="utf-8" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
