import Link from "next/link";

const Posts = ({ posts }) => {
    return (
            <table>
                {posts.map(post => (
                    <tr key={post.id}>
                        <td className="title">{post.date}</td>
                        <td className="url"><Link href={post.url}>
                            <a>{post.title}</a>
                        </Link>
                        </td>
                    </tr>
                ))}
            <style jsx>{`
                    .title {
                        width: 25%;
                    }
            `}</style>

            <style jsx global>{`
                p {
                    font-size: 18px;
                }
            `}</style>
            </table>
    )
}

export default Posts