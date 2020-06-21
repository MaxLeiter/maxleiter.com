import Post from "../../../components/posts/post";

import Link from "next/link";

export const meta = {
    published: true,
    publishedAt: "June 20, 2020",
    summary: "My first blog post",
    // image: "/images/1.jpg",
    title: "Welcome to my blog",
    id: "welcome"
};

const FirstPost = () => {
    return (
        <Post title={meta.title} date={meta.date}>
            <p> Welcome to my first post! I mostly set this blog up for when I plan to start writing frequently. It was also a good excuse to dive into Next.js and SSG. Expect to see some <a href="https://knightos.org">KnightOS</a> and <Link href="/X11"><a>X11</a></Link> related posts in the near future. </p>
            <img alt="Straight A lighthouse web performance results" src="/images/perf.png" width="100%" height="auto"/>
            <style jsx>{`
                p {
                    line-height: 1.3;
                    font-size: 16px;
                }
            `}</style>
        </Post>)
}

export default FirstPost;