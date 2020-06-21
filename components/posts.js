import Link from "next/link";
import theme from "../themes/dark";
import Page from '../components/page';

const Posts = ({ posts }) => {
    return (
            <ul>
                {posts.map(post => (
                    <li key={post.id}>
                        <span>{post.date}</span>
                        <Link href={post.url}>
                            <a>{post.title}</a>
                        </Link>
                    </li>
                ))}
            <style jsx>{`
                ul {
                    width: 100%;
                    list-style: none;
                    font-size: 18px;
                }

                ul li {
                    padding: 0px 0px;
                    transition: .5s;
                }

                ul li a {
                    margin-left: 5%;
                }
            `}</style>
            </ul>
    )
}

export default Posts