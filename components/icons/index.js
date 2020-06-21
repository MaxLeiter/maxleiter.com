import Github from "./github.svg";
import Hash from "./hash.svg";
import LinkedIn from "./linkedin.svg";
import Send from "./send.svg";
import theme from "../../themes/dark.js";

const Icons = ({}) => {
  return (
    <span>
      <a
        target="_blank"
        rel="noreferrer"
        className="icon"
        href="https://github.com/MaxLeiter"
        aria-label="Github"
      >
        <Github />
      </a>
      <a
        target="_blank"
        rel="noreferrer"
        className="icon"
        href="mailto:maxwell.leiter@gmail.com"
        aria-label="Email"
      >
        <Send />
      </a>
      <a
        target="_blank"
        rel="noreferrer"
        className="icon"
        href="https://demo.thelounge.chat/?nick=Hello_Max&join=maxleiter"
        aria-label="IRC"
      >
        <Hash />
      </a>
      <a
        target="_blank"
        rel="noreferrer"
        className="icon"
        href="https://linkedin.com/in/MaxLeiter"
        aria-label="LinkedIn"
      >
        <LinkedIn />
      </a>

      <style jsx>{`
        span {
          margin: ${theme.spacing.gap} ${theme.spacing.halfGap}  0px 0px;
          display: block;
          width: 100%;
        }
        .icon {
          color: ${theme.colors.link};
          transition: 1s;
          text-decoration: none;
          padding: 0 5px;
        }

        a:hover {
          color: ${theme.colors.linkHover};
        }
      `}</style>
    </span>
  );
};

export default Icons;
