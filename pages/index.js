import theme from "../themes/dark";
import Icons from "../components/icons";
import Projects from "../components/projects";
import PostsList from '../components/posts/posts';
import Page from "../components/page";

import { posts } from "../lib/data/posts";

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

const Home = (props) => (
  <Page>
      <h1 className="title section">Max Leiter</h1>

      <p className="description section">Full-stack developer and student</p>

      <p className="work section">
        Currently building at{" "}
        <a target="_blank" rel="noreferrer" href="https://vercel.com">
          Vercel
        </a>
        <Icons />
      </p>

      <div style={{alignSelf: 'center'}}>
        <Projects />
      </div>
      <h2 style={{alignSelf: 'center'}}> Posts and Ramblings </h2>
      <PostsList posts={props.posts} />
    <style jsx>{`
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
        align-self: center;
        text-align: center;
      }

      .section {
        margin: ${theme.spacing.qtrGap} 0;
      }

      @media (max-width: 700px) {
        .description {
          width: 60%;
        }
      }
    `}</style>
  </Page>
);

export default Home;
