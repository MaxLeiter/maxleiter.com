import Link from "next/link";

const Heading = ({ title, date }) => (
    <div>
        <p>
            <Link href="/">
                <a>Back to Home</a>
            </Link>
        </p>
        <span className="heading">
            <h1> {title} </h1>
            <strong>{date}</strong>
        </span>
        <style jsx>{`
            div p a {
                display: block;
            }

            div span h1 {
                display: inline;
            }

            div .heading {
                display: flex;
                justify-content: space-between;
                align-items: center;
                text-align: center;
            } 
        `}</style>
    </div>
);

export default Heading;