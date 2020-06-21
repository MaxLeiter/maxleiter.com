import Project from "./project";

const Projects = () => {
  const data = [
    {
      url: "/X11",
      name: "X11 on iOS",
      badge: "Creator",
      desc: "Patched, compiled, and packaged X11 for jailbroken iOS devices.",
    },
    {
      url: "https://maxleiter.github.io/jsonTree/",
      name: "jsonTree",
      badge: "Creator",
      desc: "A 2kb JavaScript library for generating HTML trees from JSON.",
    },
    {
      url: "https://www.uscannenbergmedia.com",
      name: "Annie",
      badge: "Developer",
      desc:
        "Annie is the official app for the University of Southern California's Annenberg Media Center.",
    },
    {
      url: "https://hacksc.com",
      name: "HackSC",
      badge: "Organizer",
      desc:
        "HackSC is Southern California's largest hackathon with over 800+ attendees.",
    },
    {
      url: "https://knightos.org",
      name: "KnightOS",
      badge: "Maintainer",
      desc:
        "Open-source unix-like operating system for z80-based calculators written entirely in z80 asm.",
    },
    {
      url: "https://thelounge.chat",
      name: "The Lounge",
      badge: "Maintainer",
      desc:
        "Self-hosted, always-on IRC client built with Node.js, Vue, and other web technologies.",
    },
  ];

  return (
    <div className="grid section">
      {data.map((e) => (
        <Project url={e.url} name={e.name} badge={e.badge} desc={e.desc} />
      ))}
      <style jsx>
        {`
				.grid {
				  display: flex;
				  align-items: center;
				  justify-content: center;
				  flex-wrap: wrap;
				  max-width: 800px;
				  // margin: ${theme.spacing.qtrGap} 0;
				}

				@media (max-width: 700px) {
				  .grid {
				    width: 80%;
            flex-direction: column;
            margin: 0 auto;
				  }
				}
			`}
      </style>
    </div>
  );
};

export default Projects;
