import Page from "../page";
import Heading from "./heading";

const Post = ({ title, date, children }) => {
    return (
        <Page title={title}>
            <Heading title={title} date={date} />
            {children}
        </Page>)
}

export default Post;