import theme from "../../themes/dark.js";

const Project = ({ url, name, badge, desc }) => {
  return (
    <a href={url} className="card" aria-label={name}>
      <span className="header">
        {" "}
        <h3>{name}</h3> <h2 className="badge">{badge}</h2>{" "}
      </span>
      <p>{desc}</p>

      <style jsx>
        {`
          .badge {
            background: ${theme.colors.header};
            color: ${theme.colors.background};
            font-size: 14px;
            align-self: center;
            border-radius: 10px;
            margin: 0 0 1rem 0;
            padding: 4px 8px;
          }

          .card {
            margin: 1rem;
            flex-basis: 45%;
            padding: 20px;
            color: inherit;
            text-decoration: none;
            border: 1px solid #eaeaea;
            border-radius: 8px;
            transition: color 0.15s ease, border-color 0.15s ease;
          }

          .card:hover,
          .card:focus,
          .card:active {
            color: ${theme.colors.linkHover};
            border-color: ${theme.colors.linkHover};
          }

          .card h3 {
            margin: 0 0 1rem 0;
            font-size: 1.5rem;
          }

          .card p {
            margin: 0;
            font-size: 1.2rem;
            line-height: 1.25;
          }

          .card .header {
            color: ${theme.colors.header};
          }

          .card span {
            display: flex;
            width: 100%;
            justify-content: space-between;
          }
        `}
      </style>
    </a>
  );
};

export default Project;
