import Head from "next/head";
import theme from "../../themes/dark";
import Link from "next/link";

const Instructions = () => (
  <div className="container">
    <Head>
      <title>Building Instructions</title>
      <link rel="icon" href="/favicon.ico" />
      <meta
        name="description"
        content="Instructions for building X11 and Xorg on iOS. "
      />
      <meta
        name="keywords"
        content="Max,Leiter,Max Leiter, X11, iOS, Linux, Xorg, Cydia, jailbreak, X11 on iOS"
      />
    </Head>

    <main>
      <h1 className="title section">Building Instructions</h1>
      <Link href="/X11">
        <a>Back to Index</a>
      </Link>
      <h2 className="section"> Instructions </h2>
      <div className="info">
        <i> Note: This section is unfinished. Here be dragons. </i>
      </div>
      <p className="section">
        Before you start, be sure to have an iOS SDK located at{" "}
        <code>/usr/share/iPhoneOS.sdk</code> for sbingner's llvm-10 to function.
        You can get the SDKs from{" "}
        <a href="https://github.com/theos/sdks/">theos</a>.{" "}
      </p>
      <p className="section">
        The following tools/libraries are required to build the packages (unless
        you choose to build these yourself):{" "}
      </p>
      <p className="section">
        From <a href="https://mcapollo.github.io">MCApollo's repository</a>:
        <ul>
          <li>Gettext</li>
          <li>Glib</li>
          <li>libffi</li>
          <li>libxml2</li>
          <li>m4</li>
          <li>OpenSSL</li>
          <li>perl</li>
          <li>PkgConfig</li>
          <li>libiconv</li>
          <li>Python@3.7</li>
          <ul>
            <li>
              Run <code>python3 -m ensurepip</code> and{" "}
              <code>pip3 install meson</code> after installing
            </li>
          </ul>
          <li>readline</li>
          <li>zlib</li>
        </ul>
      </p>
      <p className="section">
        From <a href="https://apt.binger.com">Sam Bingner's</a>:
        <ul>
          <li>clang-10</li>
          <li>Darwin CC Tools</li>
          <li>Bison</li>
          <li>Flex</li>
          <li>libstdc++ (C++ Standard Library symlink)</li>
        </ul>
      </p>
      <p className="section">
        From mine:
        <ul>
          <li>automake</li>
          <li>autoconf</li>
          <li>ninja</li>
          <li>libpng</li>
          <li>gperf</li>
        </ul>
      </p>
      <p className="section">
        In general, you can follow the instructions from{" "}
        <a href="http://www.linuxfromscratch.org/blfs/">
          Beyond LinuxFromScratch
        </a>
        . This project is based on 9.0, with version differences or code
        modications marked with ⚠️ below. Applications and libs marked with ❗️
        means unavailable on iOS or I was unable to build them. Empty notes
        means compiles and works as-is from BLFS. Additionally, all of the
        packages are available (generally as dylibs) on the Cydia repo linked
        above.
      </p>
      <div className="section">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>util-macros</td>
              <td>1.19.2</td>
              <td></td>
            </tr>
            <tr>
              <td>xorgproto</td>
              <td>2019.2</td>
              <td></td>
            </tr>
            <tr>
              <td>libXau</td>
              <td>1.0.9</td>
              <td></td>
            </tr>
            <tr>
              <td>libXdmcp</td>
              <td>1.1.3</td>
              <td></td>
            </tr>
            <tr>
              <td>xcb-proto</td>
              <td>1.13</td>
              <td></td>
            </tr>
            <tr>
              <td>libxcb</td>
              <td>1.13.1 </td>
              <td></td>
            </tr>
            <tr>
              <td>Freetype</td>
              <td>2.10.1 </td>
              <td></td>
            </tr>
            <tr>
              <td>Fontconfig</td>
              <td>2.13.1 ⚠️</td>
              <td>
                Requires modifying{" "}
                <code>
                  <abbr title="For me, /usr/share/SDKs/iPhoneOS.sdk/usr/include/stdlib.h:195:6">
                    stdlib.h
                  </abbr>
                </code>{" "}
                in SDK to allow <code>system</code> calls. Bug with patch
                available{" "}
                <a href="https://gitlab.freedesktop.org/fontconfig/fontconfig/issues/210">
                  here
                </a>
                .
              </td>
            </tr>
            <tr>
              <td>xtrans</td>
              <td>1.4.0</td>
              <td></td>
            </tr>
            <tr>
              <td>libX11</td>
              <td>1.6.9</td>
              <td></td>
            </tr>
            <tr>
              <td>libFS</td>
              <td>1.0.8 ⚠️</td>
              <td>
                Need to remove some code from the <code>libtool</code> file. The
                enviroment variables aren't populated on iOS so a generated bash
                command is wrong. Check the output of <code>./configure</code>{" "}
                to pinpoint the line number.
              </td>
            </tr>
            <tr>
              <td>libICE</td>
              <td>1.0.1</td>
              <td></td>
            </tr>
            <tr>
              <td>libSM</td>
              <td>1.2.3</td>
              <td></td>
            </tr>
            <tr>
              <td>libXScrnSaver</td>
              <td>1.2.3</td>
              <td></td>
            </tr>
            <tr>
              <td>libXt</td>
              <td>1.2.0</td>
              <td></td>
            </tr>
            <tr>
              <td>libXmu</td>
              <td>1.1.3</td>
              <td></td>
            </tr>
            <tr>
              <td>libXpm</td>
              <td>3.5.13</td>
              <td></td>
            </tr>
            <tr>
              <td>libXaw</td>
              <td>1.0.13</td>
              <td></td>
            </tr>
            <tr>
              <td>libXfixes</td>
              <td>5.0.3</td>
              <td></td>
            </tr>
            <tr>
              <td>libXcomposite</td>
              <td>0.4.5</td>
              <td></td>
            </tr>
            <tr>
              <td>libXrender</td>
              <td>0.9.10</td>
              <td></td>
            </tr>
            <tr>
              <td>libXcursor</td>
              <td>1.2.0</td>
              <td></td>
            </tr>
            <tr>
              <td>libXdamage</td>
              <td>1.1.5</td>
              <td></td>
            </tr>
            <tr>
              <td>libfontenc</td>
              <td>1.1.4</td>
              <td></td>
            </tr>
            <tr>
              <td>libXfont2</td>
              <td>2.0.4</td>
              <td></td>
            </tr>
            <tr>
              <td>libXft</td>
              <td>2.3.3</td>
              <td></td>
            </tr>
            <tr>
              <td>libXi</td>
              <td>1.7.10</td>
              <td></td>
            </tr>
            <tr>
              <td>libXinerama</td>
              <td>1.1.4</td>
              <td></td>
            </tr>
            <tr>
              <td>libXrandr</td>
              <td>1.5.2</td>
              <td></td>
            </tr>
            <tr>
              <td>libXres</td>
              <td>1.2.0</td>
              <td></td>
            </tr>
            <tr>
              <td>libXtst</td>
              <td>1.2.3</td>
              <td></td>
            </tr>
            <tr>
              <td>libXv</td>
              <td>1.0.11</td>
              <td></td>
            </tr>
            <tr>
              <td>libXvMC</td>
              <td>1.0.12</td>
              <td></td>
            </tr>
            <tr>
              <td>libXxf86dga</td>
              <td>1.1.5</td>
              <td></td>
            </tr>
            <tr>
              <td>libXxf86vm</td>
              <td>1.1.4</td>
              <td></td>
            </tr>
            <tr>
              <td>libpciaccess</td>
              <td>1.0.12 ❗️</td>
              <td>Unsupported OS</td>
            </tr>
            <tr>
              <td>libdmx</td>
              <td>1.1.4</td>
              <td></td>
            </tr>
            <tr>
              <td>libxkbfile</td>
              <td>1.1.0</td>
              <td></td>
            </tr>
            <tr>
              <td>xcb-util</td>
              <td>0.4.0</td>
              <td></td>
            </tr>
            <tr>
              <td>xcb-util-image</td>
              <td>0.4.0</td>
              <td></td>
            </tr>
            <tr>
              <td>xcb-util-keysyms</td>
              <td>0.4.0</td>
              <td></td>
            </tr>
            <tr>
              <td>xcb-util-keysyms</td>
              <td>0.4.0</td>
              <td></td>
            </tr>
            <tr>
              <td>xcb-util-renderutil</td>
              <td>0.3.9</td>
              <td></td>
            </tr>
            <tr>
              <td>xcb-util-wm</td>
              <td>0.4.1</td>
              <td></td>
            </tr>
            <tr>
              <td>xcb-util-cursor</td>
              <td>0.1.3</td>
              <td></td>
            </tr>
            <tr>
              <td>Mako</td>
              <td>1.1.0</td>
              <td>If you can't build yourself, try using pip</td>
            </tr>
            <tr>
              <td>Mesa</td>
              <td>0.52.1 ⚠️</td>
              <td>
                Set DRI drivers to swrast and set gallium drivers to empty. I
                manually modifed meson_options.txt. Also symlink m4 to{" "}
                <code>/opt/local/bin/gm4</code>. I had to remove an __APPLE__
                check in <code>/src/mesa/main/texcompress_s3tc_tmp.h</code> so
                it used the <code>GL</code> library instead of the macOS{" "}
                <code>OpenGL</code> one. Also, be sure to specify a minimum iOS
                version so thread-local support works with something like{" "}
                <code>-miphoneos-version-min=11.2</code>.
              </td>
            </tr>
            <tr>
              <td>xbitmaps</td>
              <td>1.1.2</td>
              <td></td>
            </tr>
            <tr>
              <td>iceauth</td>
              <td>1.0.8</td>
              <td></td>
            </tr>
            <tr>
              <td>luit</td>
              <td>1.1.1</td>
              <td>
                Run <code>sed -i -e "/D_XOPEN/s/5/6/" configure</code>
              </td>
            </tr>
            <tr>
              <td>mkfontdir</td>
              <td>1.0.7</td>
              <td></td>
            </tr>
            <tr>
              <td>mkfontscale</td>
              <td>1.2.1</td>
              <td></td>
            </tr>
            <tr>
              <td>sessreg</td>
              <td>1.1.2</td>
              <td></td>
            </tr>
            <tr>
              <td>setxkbmap</td>
              <td>1.3.2</td>
              <td></td>
            </tr>
            <tr>
              <td>smproxy</td>
              <td>1.0.6</td>
              <td></td>
            </tr>
            <tr>
              <td>x11perf</td>
              <td>1.6.1</td>
              <td></td>
            </tr>
            <tr>
              <td>xcursorgen</td>
              <td>1.0.7</td>
              <td></td>
            </tr>
            <tr>
              <td>xdpyinfo</td>
              <td>1.3.2</td>
              <td></td>
            </tr>
            <tr>
              <td>xev</td>
              <td>1.2.3</td>
              <td></td>
            </tr>
            <tr>
              <td>xhost</td>
              <td>1.0.8</td>
              <td></td>
            </tr>
            <tr>
              <td>xinput</td>
              <td>1.6.3</td>
              <td></td>
            </tr>
            <tr>
              <td>xkbcomp</td>
              <td>1.4.2</td>
              <td></td>
            </tr>
            <tr>
              <td>xkbevd</td>
              <td>1.1.4</td>
              <td></td>
            </tr>
            <tr>
              <td>xkbutils</td>
              <td>1.0.4</td>
              <td></td>
            </tr>
            <tr>
              <td>xkill</td>
              <td>1.0.5</td>
              <td></td>
            </tr>
            <tr>
              <td>xlsatoms</td>
              <td>1.1.3</td>
              <td></td>
            </tr>
            <tr>
              <td>xlsclients</td>
              <td>1.1.4</td>
              <td></td>
            </tr>
            <tr>
              <td>xmessage</td>
              <td>1.0.5</td>
              <td></td>
            </tr>
            <tr>
              <td>xmodmap</td>
              <td>1.0.10</td>
              <td></td>
            </tr>
            <tr>
              <td>xpr</td>
              <td>1.0.5</td>
              <td></td>
            </tr>
            <tr>
              <td>xprop</td>
              <td>1.2.4</td>
              <td></td>
            </tr>
            <tr>
              <td>xrandr</td>
              <td>1.5.1</td>
              <td></td>
            </tr>
            <tr>
              <td>xrdb</td>
              <td>1.2.0</td>
              <td></td>
            </tr>
            <tr>
              <td>xrefresh</td>
              <td>1.0.6</td>
              <td></td>
            </tr>
            <tr>
              <td>xset</td>
              <td>1.2.4</td>
              <td></td>
            </tr>
            <tr>
              <td>xsetroot</td>
              <td>1.1.2</td>
              <td></td>
            </tr>
            <tr>
              <td>xvinfo</td>
              <td>1.1.4</td>
              <td></td>
            </tr>
            <tr>
              <td>xwd</td>
              <td>1.0.7</td>
              <td></td>
            </tr>
            <tr>
              <td>xwininfo</td>
              <td>1.1.5</td>
              <td></td>
            </tr>
            <tr>
              <td>xwud</td>
              <td>1.0.5</td>
              <td></td>
            </tr>
            <tr>
              <td>startup-notifcation</td>
              <td>.12</td>
              <td></td>
            </tr>
            <tr>
              <td>xterm</td>
              <td>351</td>
              <td></td>
            </tr>
            <tr>
              <td>FLTK</td>
              <td>1.3.5 ⚠️</td>
              <td>
                Need to remove some <code>-U__APPLE__</code> calls. Disable
                tests in Makefile.
              </td>
            </tr>
            <tr>
              <td>tigervnc</td>
              <td>1.10.1 ⚠️</td>
              <td>
                No vncviewer. Disable it via CMake. Remove the{" "}
                <code>if(NOT APPLE)</code> check above the{" "}
                <code>add_subdirectory(unix)</code>. Also remove the{" "}
                <code>find_package(FLTK)</code> check and remove the line{" "}
                <code>add_subdirectory(tests)</code> (as some tests require
                FLTK). It's important to build tigervnc before building Xvnc.
              </td>
            </tr>
            <tr>
              <td>Xvnc</td>
              <td>1.10.1 ⚠️</td>
              <td>
                Add a{" "}
                <a href="https://raw.githubusercontent.com/phracker/MacOSX-SDKs/master/MacOSX10.3.9.sdk/usr/include/Xplugin.h">
                  fake Xplugin.h
                </a>{" "}
                to fool <code>/unix/xserver/miext/rootless</code>. Modify{" "}
                <code>rootlessWindow.c</code> to check for{" "}
                <code>"Xplugin.h"</code> instead of{" "}
                <code>&lt;Xplugin.h&gt;</code>. Also, remove the{" "}
                <code>-z, now</code> characters from{" "}
                <code>/unix/xserver/hw/vnc/Makefile.in</code>, where it's
                assigning <code>libvnc_la_LDFLAGS</code>.{" "}
              </td>
            </tr>
            <tr>
              <td>Glib</td>
              <td>2.62.4 ⚠️</td>
              <td>
                Disable cocoa and carbon support in build.meson. Had to fake{" "}
                <a href="https://opensource.apple.com/source/Libc/Libc-320/include/crt_externs.h.auto.html">
                  <code>crt_externs.h</code>
                </a>
                . Remove the <code>if host_system == 'darwin'</code> check in{" "}
                <code>glib/meson.build</code>.
              </td>
            </tr>
            <tr>
              <td>LuaJIT</td>
              <td>2.1.0</td>
              <td>https://github.com/rweichler/luajit-ios</td>
            </tr>
            <tr>
              <td>OpenJPG</td>
              <td>2.3.1</td>
              <td></td>
            </tr>
            <tr>
              <td>poppler</td>
              <td>0.84.0</td>
              <td></td>
            </tr>
            <tr>
              <td>check</td>
              <td>0.11.0</td>
              <td></td>
            </tr>
            <tr>
              <td>pango</td>
              <td></td>
              <td>working on it</td>
            </tr>
            <tr>
              <td>EFL</td>
              <td>1.23.3</td>
              <td>working on it</td>
            </tr>
            <tr>
              <td>compton</td>
              <td>git v0.1 beta g316eac0</td>
              <td></td>
            </tr>
            <tr>
              <td>FOX toolkit</td>
              <td>1.7.67</td>
              <td>
                Contains Adie (text editor), a calculator, and Shutterbug
                (screenshots)
              </td>
            </tr>
            <tr>
              <td>azpainter</td>
              <td>4bf18c8</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
    <footer>
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

      .table {
        overflow-x: auto;
        white-space: nowrap;
      }

      td:last-child {
        padding: 2px;
        white-space: normal;
      }

      table,
      th,
      td {
        border: 1px solid gray;
      }

      td {
        padding: 3px;
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

      .info {
        color: ${theme.colors.background}du;
        background: ${theme.colors.header};
        width: 100%;
        margin-top: 5px;
        margin-bottom: 5px;
        background: #483d8b;
        padding: 2px;
      }

      footer {
        max-width: 750px;
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

export default Instructions;
