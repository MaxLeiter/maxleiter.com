import Page from "../../../components/page";
import Heading from "../../../components/posts/heading";

import Link from "next/link";

const title = "Welcome to my first post";
const FirstPost = () => {
    return (<Page title={title}>
        <Heading title={title} date="June 20, 2020"/>
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