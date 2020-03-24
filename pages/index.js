import theme from "../themes/dark";
import Icons from "../components/icons";
import Visit from "./external-link.svg";
import Projects from "../components/projects";

import Head from "next/head";
import Link from "next/link";

const Home = () => (
  <div className="container">
    <Head>
      <title>Max Leiter</title>
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <main>
      <h1 className="title section">Max Leiter</h1>

      <p className="description section">Full-stack developer and student</p>

      <p className="work section">
        Currently building at{" "}
        <a target="_blank" href="https://zeit.co">
          ZEIT
        </a>{" "}
        and{" "}
        <a target="_blank" href="https://www.uscannenbergmedia.com/">
          Annenberg Media
        </a>
      </p>

      <Icons />

      <Projects />
    </main>
    <footer>
      <a href="https://github.com/MaxLeiter" alt="Source for this page">
        This site on GitHub
      </a>
    </footer>
    <style jsx>{`
      .container {
        min-height: 100vh;
        padding: 0 0.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }

      main {
        padding: ${theme.spacing.gap} 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }

      a {
        color: ${theme.colors.link};
        text-decoraton: underline;
        transition: 0.5s;
      }

      a:hover,
      a:focus,
      a:active {
        color: ${theme.colors.linkHover};
      }

      .title {
        margin: 0;
        line-height: 1.15;
        font-size: 2.5rem;
        color: ${theme.colors.header};
      }

      .description,
      .work {
        width: 80%;
        font-size: 18px;
      }

      .work,
      .title,
      .description {
        text-align: center;
      }

      .section {
        margin: ${theme.spacing.qtrGap} 0;
      }

      footer {
        max-width: 750px;
        width: 100%;
        height: 50px;
        border-top: 1px solid ${theme.colors.text};
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      @media (max-width: 700px) {
        footer {
          width: 80%;
        }

        .description {
          width: 60%;
        }
      }
    `}</style>

    <style jsx global>{`
      html,
      body {
        padding: 0;
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, Roboto, Helvetica Neue,
          sans-serif;
        color: ${theme.colors.text};
        background-color: ${theme.colors.background};
      }

      * {
        box-sizing: border-box;
      }
    `}</style>
  </div>
);

export default Home;
