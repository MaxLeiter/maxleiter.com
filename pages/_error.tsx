import { NextPageContext } from "next";

const Error = ({ statusCode }: { statusCode: number }) => {
  return (
    <Error statusCode={statusCode} />
  );
};

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
