# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start development server on localhost:3000
- `pnpm build` - Build production-ready app and generate RSS feed (runs both build-next and build-rss in parallel)
- `pnpm start` - Run production server
- `pnpm lint` - Run ESLint and Prettier to format code
- `pnpm analyze` - Analyze bundle size with webpack-bundle-analyzer

### Content Management
- RSS feed generation: `npx ts-node scripts/rss` (uses node.tsconfig.json)
- Blog posts: Add markdown/MDX files to `/posts/` directory
- Notes: Add markdown/MDX files to `/notes/` directory
- External posts are configured in `app/lib/external-posts.ts`

## Architecture

### Next.js App Router Structure
This is a Next.js 16 app using the App Router pattern with TypeScript and React 19. The site features a unique desktop-themed UI with windowed components.

- **Route Groups**: Main content pages are under `app/(subpages)/` to share layout
- **Dynamic Routes**: Blog posts (`blog/[slug]`), notes (`notes/[slug]`), and books (`books/[slug]`) use dynamic segments
- **Desktop Theme**: Custom window components in `app/components/desktop/` create a macOS-like interface
- **Path Aliases**: `@*` maps to `./app/*` for clean imports

### Content Strategy
- **Local Content**: Markdown/MDX files in `/posts/` and `/notes/` directories, processed with gray-matter and remark/rehype plugins
- **External Content**: Integrated via RSS feeds and APIs, configured in `app/lib/external-posts.ts`
- **Static Generation**: All pages use `export const dynamic = "force-static"` for performance

### Key Libraries
- **Styling**: Tailwind CSS 4 with custom theme configuration, CSS custom properties for theming
- **MDX Processing**: @next/mdx with remark-gfm, rehype plugins for syntax highlighting (bright)
- **UI Components**: Radix UI for accessible components, custom desktop-style window system
- **Theme**: next-themes for dark/light mode switching (default: dark)

### Environment Variables
Required for full functionality:
- `GITHUB_TOKEN` - Fetch GitHub project stars
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Analytics
- `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` - Display git commit info

## Code Conventions

- **TypeScript**: Strict mode enabled, avoid `any` types
- **Formatting**: No semicolons, single quotes, 2-space indentation (Prettier config)
- **Components**: React functional components with TypeScript interfaces
- **Imports**: Use path aliases (`@components`, `@lib`, etc.) instead of relative paths
- **CSS**: Prefer Tailwind utility classes, use CSS modules for complex component styles
- **Content Files**: Use YAML frontmatter in markdown files with `title`, `date`, `description` fields