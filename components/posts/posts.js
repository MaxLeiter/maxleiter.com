import Link from "next/link";
import theme from "../../themes/dark";
import Page from '../page';

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
                    list-style-type: none;
                    font-size: 18px;
                    padding: 0;
                }

                ul li {
                    padding-left: 0px 1.4rem;
                    transition: .5s;
                }

                ul li a {
                    margin-left: 5%;
                }

                @media (max-width: 700px) {
				  ul {
				    width: 80%;
                    flex-direction: column;
                    margin: auto auto;
				  }
				}
            `}</style>
            </ul>
    )
}

export default Posts