import Page from "../../../components/page";
import Link from "next/link";

const FirstPost = () => {
    return (<Page title="Welcome to my first post">
        <Link href="/">
            <a>Back to Home</a>
        </Link>
        <h1> A First Post </h1>
        <h4>June 20, 2020</h4>
        <p> Welcome to my first post! I mostly set this blog up for when I plan to start writing frequently. It was also a good excuse to dive into Next.js and SSG. Expect to see some <a href="https://knightos.org">KnightOS</a> and <Link href="/X11"><a>X11</a></Link> related posts in the near future. </p>
        <p> </p>
    <style jsx>{`
        p {
            line-height: 1.3;
            font-size: 16px;
        }
    `}</style>
    </Page>)
}

export default FirstPost;