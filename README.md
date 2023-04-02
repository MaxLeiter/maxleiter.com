## My personal site

### Getting started
1. Install the `pnpm` package manager: https://pnpm.io/
2. Run `pnpm` in the project directory
3. Run `pnpm dev` to start a local developer server


### Environment variables
- `GITHUB_TOKEN`: necessary if you want to fetch github stars for projects
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: required for analytics. See https://maxleiter.com/blog/supabase-next-analytics for more info
- If you want the git commit hash in the bottom of the home page, you need to host with vercel or provide a `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` env var
 

### Usage:
- `pnpm <command>`:
    - `lint`: automatically lints files
    - `dev`: start a local instance with live reloading
    - `rss`: generate an RSS feed 
    - `build`: generate an RSS feed and production site
    - `analyze`: generate a bundle you can inspect via @next/bundle-analyzer
    - `start`: start a production instance built via `yarn build`

### Directory structure:
- app
 - `components/`: react components
 - `data/`: static data that can eventually be moved to a DB or something
 - `lib/`: hooks, 3rd party API stuff, utils functions
 - `pages/`: next.js pages (the actual routes that are rendered)
 - `styles/`: contains the global styles
- `pages/api`: nextjs API routes
- `posts/`: markdown files rendered at build time 
- `public/`: images for blog, favicon, built files
- `scripts/`: contain the scripts for building the sitemap and RSS feed
