import Link from "next/link";

const Heading = ({ title, date }) => (
    <div className="container">
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

            @media (max-width: 700px) {
				div .heading {
                   display: flex;
                   flex-direction: column;
                }
			}

        `}</style>
    </div>
);

export default Heading;