import type { BlogPost, Project } from '@lib/portfolio-data'

export interface CommandContext {
  blogPosts: BlogPost[]
  projects: Project[]
  aboutContent: any
  onClose?: () => void
  toggleJuice: () => void
  toggleCrt: () => void
}

export interface CommandResult {
  output: string[]
  clearScreen?: boolean
  closeTerminal?: boolean
}

export interface Command {
  name: string
  description: string
  usage: string
  aliases?: string[]
  execute: (args: string[], context: CommandContext) => CommandResult
}

// Command registry
export const commands: Command[] = [
  {
    name: 'help',
    description: 'Show available commands',
    usage: 'help',
    execute: () => {
      return {
        output: [
          'Available commands:',
          ...commands.map((cmd) => {
            const aliases = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : ''
            return `  ${cmd.usage.padEnd(20)} - ${cmd.description}${aliases}`
          }),
        ],
      }
    },
  },
  {
    name: 'ls',
    description: 'List directory contents',
    usage: 'ls [directory]',
    execute: (args, context) => {
      if (args.length === 0) {
        return {
          output: ['blog       projects   about'],
        }
      }

      const dir = args[0].replace(/\/$/, '')
      if (dir === 'blog') {
        const files = context.blogPosts.map((p) => `${p.slug}.md`).join('  ')
        return { output: [files] }
      } else if (dir === 'projects') {
        const files = context.projects.map((p) => `${p.id}.md`).join('  ')
        return { output: [files] }
      } else if (dir === 'about') {
        return { output: ['bio.md'] }
      } else {
        return {
          output: [`ls: cannot access '${dir}': No such file or directory`],
        }
      }
    },
  },
  {
    name: 'pwd',
    description: 'Print working directory',
    usage: 'pwd',
    execute: () => {
      return {
        output: ['/home/user/portfolio'],
      }
    },
  },
  {
    name: 'cat',
    description: 'Display file contents',
    usage: 'cat <file>',
    execute: (args, context) => {
      if (args.length === 0) {
        return {
          output: ['cat: missing file operand', 'Usage: cat <file>'],
        }
      }

      const path = args[0]
      const parts = path.split('/').filter(Boolean)

      if (parts.length === 1) {
        // Check if it's a directory
        if (['blog', 'projects', 'about'].includes(parts[0])) {
          return { output: [`cat: ${path}: Is a directory`] }
        } else {
          return { output: [`cat: ${path}: No such file or directory`] }
        }
      } else if (parts.length === 2) {
        const [dir, filename] = parts
        const cleanFilename = filename.replace(/\.md$/, '')

        if (dir === 'blog') {
          const post = context.blogPosts.find((p) => p.slug === cleanFilename)
          if (post) {
            return { output: [post.content] }
          }
        } else if (dir === 'projects') {
          const project = context.projects.find((p) => p.id === cleanFilename)
          if (project) {
            return { output: [project.content] }
          }
        } else if (dir === 'about') {
          const aboutItem = context.aboutContent[cleanFilename]
          if (aboutItem) {
            return { output: [aboutItem.content] }
          }
        }
      }

      return { output: [`cat: ${path}: No such file or directory`] }
    },
  },
  {
    name: 'echo',
    description: 'Display a line of text',
    usage: 'echo <text>',
    execute: (args) => {
      return {
        output: [args.join(' ')],
      }
    },
  },
  {
    name: 'lolcat',
    description: 'Make text colorful',
    usage: 'lolcat <text>',
    execute: (args) => {
      if (args.length === 0) {
        return {
          output: ['lolcat: missing text operand', 'Usage: lolcat <text>'],
        }
      }

      const text = args.join(' ')
      const colors = [
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1',
        '#FFA07A',
        '#98D8C8',
        '#F7DC6F',
        '#BB8FCE',
        '#85C1E2',
      ]
      const coloredText = text
        .split('')
        .map((char, i) => {
          const color = colors[i % colors.length]
          return `<span style="color: ${color}">${char}</span>`
        })
        .join('')
      return { output: [coloredText] }
    },
  },
  {
    name: 'clear',
    description: 'Clear terminal',
    usage: 'clear',
    aliases: ['cls'],
    execute: () => {
      return {
        output: [],
        clearScreen: true,
      }
    },
  },
  {
    name: 'exit',
    description: 'Close terminal',
    usage: 'exit',
    aliases: ['quit'],
    execute: (_, context) => {
      if (context.onClose) {
        return {
          output: [],
          closeTerminal: true,
        }
      }
      return {
        output: ['exit: cannot close terminal from this context'],
      }
    },
  },
  {
    name: 'crt',
    description: 'Toggle CRT filter',
    usage: 'crt',
    execute: (_, context) => {
      const wasEnabled = document.body.classList.contains('crt')
      context.toggleCrt()
      return {
        output: [wasEnabled ? 'CRT filter disabled' : 'CRT filter enabled'],
      }
    },
  },
  {
    name: 'juice',
    description: 'JUICE IT',
    usage: 'juice',
    execute: (_, context) => {
      const wasEnabled = document.body.classList.contains('juice-mode')
      context.toggleJuice()
      return {
        output: [wasEnabled ? 'UNJUICED' : 'JUICED'],
      }
    },
  },
]

// Helper to find command by name or alias
export function findCommand(name: string): Command | undefined {
  const lowerName = name.toLowerCase()
  return commands.find(
    (cmd) =>
      cmd.name === lowerName ||
      cmd.aliases?.some((alias) => alias === lowerName)
  )
}

// Get all command names and aliases for autocompletion
export function getCommandNames(): string[] {
  return commands.flatMap((cmd) => [cmd.name, ...(cmd.aliases || [])])
}

// Get autocompletions for a partial command
export function getCompletions(
  partial: string,
  context: CommandContext
): string[] {
  const trimmed = partial.trim()
  const parts = trimmed.split(' ')

  // Command completion
  if (parts.length === 1) {
    return getCommandNames().filter((c) => c.startsWith(parts[0].toLowerCase()))
  }

  // Argument completion
  const commandName = parts[0].toLowerCase()
  const command = findCommand(commandName)

  if (command?.name === 'ls') {
    const dirs = ['blog', 'projects', 'about']
    return dirs.filter((d) => d.startsWith(parts[1]?.toLowerCase() || ''))
  }

  if (command?.name === 'cat') {
    const allFiles = [
      ...context.blogPosts.map((p) => `blog/${p.slug}.md`),
      ...context.projects.map((p) => `projects/${p.id}.md`),
      'about/bio.md',
    ]
    const partial = parts.slice(1).join('/')
    return allFiles.filter((f) => f.startsWith(partial))
  }

  return []
}
