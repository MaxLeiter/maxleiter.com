import Head from "next/head";
import theme from "../../themes/dark";
import Link from "next/link";

const Home = () => (
  <div className="container">
    <Head>
      <title>X11 on iOS</title>
      <link rel="icon" href="/favicon.ico" />
      <meta
        name="description"
        content="Instructions for building X11 and Xorg on jailbroken iOS. "
      />
      <meta
        name="keywords"
        content="Max,Leiter,Max Leiter, X11, iOS, Linux, Xorg, Cydia, jailbreak, X11 on iOS"
      />
    </Head>

    <main>
      <h1 className="title">X11 on iOS</h1>

      <h2 className="section"> Introduction </h2>
      <p className="section">
        I'm excited to announce that X11 is coming soon to iOS. Most (see below)
        packages and dependencies for a fully functioning X11 desktop system
        have been compiled and are available on Cydia for iOS 11+. All packages
        have been compiled for arm64 and have been tested on iOS 12.4 and iOS
        13.1. <b>This requires a jailbroken device.</b>
      </p>
      <p className="section">
        This site will serve largely as documentation for building yourself. You
        can add the Cydia repo below for the deb packages. Please let me know if
        you run across any issues with the debs; it's likely I messed up
        including a library or something like that. (These aren't done just
        yet.)
      </p>

      <a
        className="buttonLink section"
        href="cydia://url/https://cydia.saurik.com/api/share#?source=https://maxleiter.com/cydia"
      >
        <button className="cydia">Add to Cydia</button>
      </a>

      <img
        className="image section"
        src="https://maxleiter.com/X11/front.png"
        alt="running on device"
        async="on"
      />
      <i>
        Above: adie (text editor), glxgears (GL demo), xterm (terminal
        emulator), fluxbox (window manager), compton (compositor), PathFinder
        (files).
      </i>

      <a href="./onipad.jpg" className="section">
        Image of programs running on device
      </a>
      <h2 className="section"> How it works </h2>
      <p className="section">
        At the moment, a virtual screen is accessed via a VNC client to an Xvnc
        instance running on the iDevice. If you're unfamiliar, Xvnc is an X
        server with a virtual screen that can be accessed via VNC. The best part
        of this is no drivers are required: it's all handled by Xvnc.
      </p>

      <h2 className="section"> Why </h2>
      <p className="section">
        Because I can. Also, I want to turn my iPad into a proper development
        environment, and a windowing system helps with that. It's a powerful
        machine with a Unix-like OS, so X11 seemed like a reasonable project.
        X11 allows running arbirtary applications like browsers and IDEs,
        assuming you can make them compile.
      </p>

      <h2 className="section"> Current features </h2>
      <p className="section">
        <ul>
          <li>X11 on iOS via Xvnc </li>
          <li>
            Working window managers (
            <a href="https://joewing.net/projects/jwm/">jwm</a> /{" "}
            <a href="https://github.com/freedesktop/twm">twm</a> /{" "}
            <a href="http://fluxbox.org/">fluxbox</a>){" "}
          </li>
          <li>
            Text editor (<a href="http://www.fox-toolkit.org/adie.html">adie</a>
            )
          </li>
          <li>
            Image editor (
            <a href="https://github.com/Symbian9/azpainter">azpainter</a>)
          </li>
          <li>OpenGL (via Mesa)</li>
          <li>
            {" "}
            <a href="https://github.com/MaxLeiter/cydia/tree/master/debs">
              Loads
            </a>{" "}
            of other libraries, tools, and applications.{" "}
          </li>
          <li>
            {" "}
            All available in a{" "}
            <a href="https://maxleiter.com/cydia">Cydia repo</a>
          </li>
        </ul>
      </p>

      <h2 className="section"> Want to help contribute?</h2>
      <p className="section">
        If you're interested in using X11 now, or helping make it available
        sooner, feel free to or find me on IRC as MaxLeiter in #X11iOS on
        Freenode. More information on contributing is in the works.
      </p>

      <h2 className="section"> Building instructions </h2>
      <p className="section">
        <Link href="/X11/instructions">
          <a>On a separate page</a>
        </Link>
      </p>
    </main>
    <footer>
      <span>
        By{" "}
        <Link href="/">
          <a>Max Leiter</a>
        </Link>
      </span>
      <a href="https://github.com/MaxLeiter" alt="Source for this page">
        This site on GitHub
      </a>
    </footer>
    <style jsx>{`
      .container {
        min-height: 100vh;
        padding: 0 0.5rem;
        display: flex;
        flex-direction: column;
        margin: 0 auto;
        width: 50%;
      }

      main {
        padding: ${theme.spacing.gap} 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        font-style: normal;
      }

      a {
        color: ${theme.colors.link};
        text-decoraton: underline;
        cursor: pointer;
      }

      .title {
        margin: 0;
        line-height: 1.15;
        font-size: 2.5rem;
        color: ${theme.colors.header};
        border-bottom: 1px solid ${theme.colors.text};
      }

      .description {
        width: 600px;
      }

      .section {
        line-height: 140%;
        margin: ${theme.spacing.qtrGap} 0;
      }

      .buttonLink {
        width: max-content;
        display: inline-block;
        text-decoration: none;
        transition: 0.5s;
        color: #0660ad;
      }

      .image {
        display: block;
        margin: 0 auto;
        max-width: 100%;
      }

      .cydia {
        padding: 0.8rem 1.5em;
        border: none;
        border-radius: 0.12em;
        box-sizing: border-box;
        text-decoration: none;
        font-weight: 300;
        font-size: 15px;
        text-align: center;
        transition: all 0.2s;
        background-color: #457397;
        cursor: pointer;
      }

      .cydia:hover {
        color: ${theme.colors.linkHover};
        border-color: ${theme.colors.linkHover};
      }

      footer {
        width: 100%;
        height: 50px;
        border-top: 1px solid ${theme.colors.text};
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      @media (max-width: 700px) {
        .container {
          width: 90%;
        }
      }
    `}</style>

    <style jsx global>{`
      html,
      body {
        padding: 0;
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
          Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
        color: ${theme.colors.text};
        background-color: ${theme.colors.background};
      }

      * {
        box-sizing: border-box;
      }
    `}</style>
  </div>
);

export default Home;
