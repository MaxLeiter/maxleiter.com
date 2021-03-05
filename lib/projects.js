const Projects = [
        {
            title: "X11 on iOS",
            description: "Patched, compiled, and packaged X11 for iOS devices.",
            href: "/blog/X11",
            role: "Creator",
        },
        {
            title: "The Lounge",
            description: "Self-hosted, always-on IRC client built with Node.js, Vue, and other web technologies.",
            href: "https://github.com/thelounge/thelounge",
            role: "Maintainer",
        },
        {
            title: "KnightOS",
            description: "Open-source unix-like operating system for z80-based calculators written entirely in z80 asm.",
            href: "https://github.com/knightos/knightos",
            role: "Maintainer",
        },
        {
            title: "HackSC",
            description: "HackSC is Southern California's largest hackathon with over 800+ attendees.",
            href: "https://hacksc.com",
            role: "Organizer, Vice President",
        },
        {
          title: "thelounge-bot",
          description: "A helper IRC bot for The Lounge's IRC channel on freenode.",
          href: "https://github.com/thelounge/thelounge-bot",
          role: "Creator"
        },
        {
          title: "MSHW018 driver for Linux kernel",
          description: "Support for the MSHW018 device (used in Microsoft Surfaces) in the Linux kernel.",
          href: "blog/MSHW018",
          role: "Creator",
        },
        {
            title: "jsonTree",
            description: "A 2kb JavaScript library for generating HTML trees from JSON",
            href: "https://github.com/maxleiter/jsontree",
            role: "Creator",
        },
        {
            title: "Annie",
            description: "Annie is the official app for the University of Southern California's Annenberg Media Center.",
            href: "https://www.uscannenbergmedia.com",
            role: "Past developer",
        },
        {
            title: "BASIC visualizer",
            description: "A React tool for running and visualizing a fictional BASIC language for a class",
            href: "https://maxleiter.github.io/cs109-interpreter/",
            role: "Creator",
        }
];

export default async function getProjects() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("No GITHUB_TOKEN provided. Generate a personal use token on GitHub.")
  }

  return await Promise.all(
      Projects.map(async (proj) => {
        const split = proj.href.split("/")
        //[ 'https:', '', 'github.com', 'maxleiter', 'jsontree' ]
        if (split[2] === "github.com") {
          const user = split[3]
          const repo = split[4]
          const { stargazers_count, message } = await (await fetch(`https://api.github.com/repos/${user}/${repo}`,
          {
            headers: {
              Authorization: process.env.GITHUB_TOKEN
            }
          })).json()

          // rate limited
          if (!stargazers_count && message) {
            return {
              ...proj,
              stars: -1
            }
          }

          return {
            ...proj,
            stars: stargazers_count
          }
        } else {
          return {...proj, stars: -1}
        }
      })
    )
}
