import Head from "next/head";
import theme from "../themes/dark";

const Page = ({ children, title }) => (
    <main>
        <Head>
            <title>Max Leiter {title ? `- ${title}` : ''}</title>
            <link rel="icon" href="/favicon.ico" />
        </Head>
        <div>
            {children}
        </div>
        <footer>
            <a href="https://github.com/MaxLeiter/maxleiter.com" alt="Source for this page">
                This site on GitHub
            </a>
        </footer>
        <style jsx>{`
        main {
            min-height: 100vh;
            padding: 0 0.5rem;
            display: flex;
            flex-direction: column;
        }

        div {
            padding: ${theme.spacing.gap} 0;
            flex: 1;
            display: flex;
            flex-direction: column;
            max-width: 800px;
            align-self: center;
        }

        footer {
            max-width: 800px;
            width: 100%;
            height: 50px;
            border-top: 1px solid ${theme.colors.text};
            display: flex;
            flex-direction: row;
            align-self: center;
            align-items: center;
        }

        @media (max-width: 700px) {
            main {
                width: 95%;
                margin: 0 auto;
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

        `}</style>
    </main>

);

export default Page;