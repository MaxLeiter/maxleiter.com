export *  from './2020/welcome';
import { posts } from "../../lib/data/posts";
import PostList from "../../components/posts/posts";

export function getStaticProps() {
    return {
        props: {
            posts: posts.map(post => ({
                ...post,
                url: `posts/${new Date(post.date).getFullYear()}/${post.id}`,
            })),
        },
    };
}

const Posts = ({ posts }) => {
    return <PostList title={posts} posts={posts} />
}

export default Posts;