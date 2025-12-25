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

// Flag definition for commands that support flags
export interface FlagDefinition {
  short?: string // e.g., 'l' for -l
  long?: string // e.g., 'long' for --long
  type: 'boolean' | 'string'
  description?: string
  default?: boolean | string
}

// Parsed arguments passed to execute()
export interface ParsedArgs {
  positional: string[] // Non-flag arguments
  flags: Record<string, boolean | string> // Parsed flag values
  raw: string[] // Original unparsed args
}

// Result from parseArgs - either success or error
export type ParseResult =
  | { success: true; args: ParsedArgs }
  | { success: false; error: string }

export interface Command {
  name: string
  description: string
  usage: string
  aliases?: string[]
  flags?: Record<string, FlagDefinition> // Optional flag definitions
  execute: (args: ParsedArgs, context: CommandContext) => CommandResult
}

// Tokenize input string, respecting quoted strings
export function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuote: '"' | "'" | null = null

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null
      } else {
        current += char
      }
    } else if (char === '"' || char === "'") {
      inQuote = char
    } else if (char === ' ') {
      if (current) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

// Parse arguments for a command, validating flags
export function parseArgs(tokens: string[], command: Command): ParseResult {
  const positional: string[] = []
  const flags: Record<string, boolean | string> = {}
  const raw = tokens

  // Initialize defaults from flag definitions
  if (command.flags) {
    for (const [key, def] of Object.entries(command.flags)) {
      if (def.default !== undefined) {
        flags[key] = def.default
      }
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.startsWith('--')) {
      // Long flag
      const flagName = token.slice(2)
      const [name, value] = flagName.split('=')

      if (!command.flags) {
        return { success: false, error: `${command.name}: unsupported argument '${token}'` }
      }

      const flagDef = Object.entries(command.flags).find(([_, def]) => def.long === name)
      if (!flagDef) {
        return { success: false, error: `${command.name}: unknown flag '${token}'` }
      }

      const [flagKey, def] = flagDef
      if (def.type === 'boolean') {
        flags[flagKey] = true
      } else if (value !== undefined) {
        flags[flagKey] = value
      } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
        flags[flagKey] = tokens[++i]
      } else {
        return { success: false, error: `${command.name}: flag '${token}' requires a value` }
      }
    } else if (token.startsWith('-') && token.length > 1) {
      // Short flag(s)
      const flagChars = token.slice(1)

      if (!command.flags) {
        return { success: false, error: `${command.name}: unsupported argument '${token}'` }
      }

      for (let j = 0; j < flagChars.length; j++) {
        const char = flagChars[j]
        const flagDef = Object.entries(command.flags).find(([_, def]) => def.short === char)

        if (!flagDef) {
          return { success: false, error: `${command.name}: unknown flag '-${char}'` }
        }

        const [flagKey, def] = flagDef
        if (def.type === 'boolean') {
          flags[flagKey] = true
        } else if (j === flagChars.length - 1) {
          // String flag must be last in combined flags
          if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
            flags[flagKey] = tokens[++i]
          } else {
            return { success: false, error: `${command.name}: flag '-${char}' requires a value` }
          }
        } else {
          return { success: false, error: `${command.name}: flag '-${char}' requires a value` }
        }
      }
    } else {
      positional.push(token)
    }
  }

  return { success: true, args: { positional, flags, raw } }
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
      if (args.positional.length === 0) {
        return {
          output: ['blog       projects   about'],
        }
      }

      const dir = args.positional[0].replace(/\/$/, '')
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
      if (args.positional.length === 0) {
        return {
          output: ['cat: missing file operand', 'Usage: cat <file>'],
        }
      }

      const path = args.positional[0]
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
        output: [args.positional.join(' ')],
      }
    },
  },
  {
    name: 'lolcat',
    description: 'Make text colorful',
    usage: 'lolcat <text>',
    execute: (args) => {
      if (args.positional.length === 0) {
        return {
          output: ['lolcat: missing text operand', 'Usage: lolcat <text>'],
        }
      }

      const text = args.positional.join(' ')
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
