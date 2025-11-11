'use client'

import { useState, useRef, useEffect } from 'react'
import type { BlogPost, Project } from '@lib/portfolio-data'

interface TerminalContentProps {
  blogPosts: BlogPost[]
  projects: Project[]
  aboutContent: any
  onClose?: () => void
}

export function TerminalContent({
  blogPosts,
  projects,
  aboutContent,
  onClose,
}: TerminalContentProps) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<string[]>([
    "$ Welcome to Max's Useless Terminal",
    "$ Type 'help' for available commands",
  ])
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }, 300)
    }

    const input = inputRef.current
    input?.addEventListener('focus', handleFocus)
    return () => input?.removeEventListener('focus', handleFocus)
  }, [])

  const getCompletions = (partial: string): string[] => {
    const trimmed = partial.trim()
    const parts = trimmed.split(' ')

    if (parts.length === 1) {
      const commands = [
        'help',
        'ls',
        'pwd',
        'echo',
        'cat',
        'lolcat',
        'crt',
        'konami',
        'clear',
        'exit',
      ]
      return commands.filter((c) => c.startsWith(parts[0].toLowerCase()))
    }

    if (parts[0].toLowerCase() === 'ls') {
      const dirs = ['blog', 'projects', 'about']
      return dirs.filter((d) => d.startsWith(parts[1]?.toLowerCase() || ''))
    }

    if (parts[0].toLowerCase() === 'cat') {
      const allFiles = [
        ...blogPosts.map((p) => `blog/${p.slug}.md`),
        ...projects.map((p) => `projects/${p.id}.md`),
        'about/bio.md',
      ]
      const partial = parts.slice(1).join('/')
      return allFiles.filter((f) => f.startsWith(partial))
    }

    return []
  }

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim()
    const lowerCmd = trimmedCmd.toLowerCase()
    const newOutput = [...output, `$ ${trimmedCmd}`]

    if (lowerCmd === 'clear') {
      setOutput([])
      setInput('')
      return
    } else if (lowerCmd === 'exit') {
      if (onClose) {
        onClose()
      } else {
        newOutput.push('exit: cannot close terminal from this context')
      }
      setOutput(newOutput)
      setInput('')
      return
    } else if (lowerCmd === 'help') {
      newOutput.push('Available commands:')
      newOutput.push('  help              - Show available commands')
      newOutput.push('  ls [directory]    - List directory contents')
      newOutput.push('  pwd               - Print working directory')
      newOutput.push('  cat <file>        - Display file contents')
      newOutput.push('  lolcat <text>     - Make text colorful')
      newOutput.push('  clear             - Clear terminal')
      newOutput.push('  exit              - Close terminal')
      newOutput.push('')
      newOutput.push('Easter eggs:')
      newOutput.push('  crt               - Toggle CRT filter')
      newOutput.push('  konami            - ???')
    } else if (lowerCmd === 'ls') {
      newOutput.push('blog       projects   about')
    } else if (lowerCmd.startsWith('ls ')) {
      const dir = trimmedCmd.substring(3).trim().replace(/\/$/, '')
      if (dir === 'blog') {
        const files = blogPosts.map((p) => `${p.slug}.md`).join('  ')
        newOutput.push(files)
      } else if (dir === 'projects') {
        const files = projects.map((p) => `${p.id}.md`).join('  ')
        newOutput.push(files)
      } else if (dir === 'about') {
        newOutput.push('bio.md')
      } else {
        newOutput.push(`ls: cannot access '${dir}': No such file or directory`)
      }
    } else if (lowerCmd === 'pwd') {
      newOutput.push('/home/user/portfolio')
    } else if (lowerCmd === 'crt') {
      const html = document.documentElement
      if (html.classList.contains('crt-mode')) {
        html.classList.remove('crt-mode')
        newOutput.push('CRT filter disabled')
      } else {
        html.classList.add('crt-mode')
        newOutput.push('CRT filter enabled')
        // Add the CRT styles if not already present
        if (!document.getElementById('crt-style')) {
          const style = document.createElement('style')
          style.id = 'crt-style'
          style.textContent = `
            .crt-mode body {
              animation: flicker 0.15s infinite;
            }

            .crt-mode body::before {
              content: " ";
              display: block;
              position: fixed;
              top: 0;
              left: 0;
              bottom: 0;
              right: 0;
              background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
              z-index: 2;
              background-size: 100% 2px, 3px 100%;
              pointer-events: none;
            }

            .crt-mode body::after {
              content: " ";
              display: block;
              position: fixed;
              top: 0;
              left: 0;
              bottom: 0;
              right: 0;
              background: rgba(18, 16, 16, 0.1);
              opacity: 0;
              z-index: 2;
              pointer-events: none;
              animation: flicker 0.15s infinite;
            }

            @keyframes flicker {
              0% {
                opacity: 0.27861;
              }
              5% {
                opacity: 0.34769;
              }
              10% {
                opacity: 0.23604;
              }
              15% {
                opacity: 0.90626;
              }
              20% {
                opacity: 0.18128;
              }
              25% {
                opacity: 0.83891;
              }
              30% {
                opacity: 0.65583;
              }
              35% {
                opacity: 0.67807;
              }
              40% {
                opacity: 0.26559;
              }
              45% {
                opacity: 0.84693;
              }
              50% {
                opacity: 0.96019;
              }
              55% {
                opacity: 0.08594;
              }
              60% {
                opacity: 0.20313;
              }
              65% {
                opacity: 0.71988;
              }
              70% {
                opacity: 0.53455;
              }
              75% {
                opacity: 0.37288;
              }
              80% {
                opacity: 0.71428;
              }
              85% {
                opacity: 0.70419;
              }
              90% {
                opacity: 0.7003;
              }
              95% {
                opacity: 0.36108;
              }
              100% {
                opacity: 0.24387;
              }
            }
          `
          document.head.appendChild(style)
        }
      }
    } else if (lowerCmd === 'konami') {
      newOutput.push('⬆️ ⬆️ ⬇️ ⬇️ ⬅️ ➡️ ⬅️ ➡️ 🅱️ 🅰️')
      newOutput.push('<span style="color: #ff6b6b; font-weight: bold;">✨ You found the secret! ✨</span>')
      newOutput.push('<span style="color: #4ecdc4;">30 extra lives granted!</span>')
      newOutput.push('<span style="color: #ffd700;">(Just kidding, this does nothing)</span>')
    } else if (lowerCmd.startsWith('echo ')) {
      newOutput.push(trimmedCmd.substring(5))
    } else if (lowerCmd.startsWith('lolcat ')) {
      const text = trimmedCmd.substring(7)
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
      newOutput.push(coloredText)
    } else if (lowerCmd.startsWith('cat ')) {
      const path = trimmedCmd.substring(4).trim()
      const parts = path.split('/').filter(Boolean)

      if (parts.length === 1) {
        // Check if it's a directory
        if (['blog', 'projects', 'about'].includes(parts[0])) {
          newOutput.push(`cat: ${path}: Is a directory`)
        } else {
          newOutput.push(`cat: ${path}: No such file or directory`)
        }
      } else if (parts.length === 2) {
        const [dir, filename] = parts
        const cleanFilename = filename.replace(/\.md$/, '')

        if (dir === 'blog') {
          const post = blogPosts.find((p) => p.slug === cleanFilename)
          if (post) {
            newOutput.push(post.content)
          } else {
            newOutput.push(`cat: ${path}: No such file or directory`)
          }
        } else if (dir === 'projects') {
          const project = projects.find((p) => p.id === cleanFilename)
          if (project) {
            newOutput.push(project.content)
          } else {
            newOutput.push(`cat: ${path}: No such file or directory`)
          }
        } else if (dir === 'about') {
          const aboutItem = aboutContent[cleanFilename]
          if (aboutItem) {
            newOutput.push(aboutItem.content)
          } else {
            newOutput.push(`cat: ${path}: No such file or directory`)
          }
        } else {
          newOutput.push(`cat: ${path}: No such file or directory`)
        }
      } else {
        newOutput.push(`cat: ${path}: No such file or directory`)
      }
    } else if (trimmedCmd) {
      newOutput.push(`command not found: ${trimmedCmd}`)
    }

    setOutput(newOutput)
    setInput('')
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const completions = getCompletions(input)
        if (completions.length === 1) {
          const currentParts = input.trim().split(' ')
          if (currentParts.length === 1) {
            setInput(completions[0] + ' ')
          } else {
            currentParts[currentParts.length - 1] = completions[0]
            setInput(currentParts.join(' '))
          }
        }
      }
    }

    const inputElement = inputRef.current
    inputElement?.addEventListener('keydown', handleKeyDown)
    return () => inputElement?.removeEventListener('keydown', handleKeyDown)
  }, [input])

  return (
    <div className="h-full flex flex-col">
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 text-white/90 space-y-1"
      >
        {output.map((line, i) => (
          <div
            key={i}
            className="text-sm break-words font-mono"
            dangerouslySetInnerHTML={{ __html: line }}
          />
        ))}
      </div>

      <div className="h-12 border-t border-white/10 px-3 flex items-center bg-white/5">
        <span className="text-white/80 mr-2 text-base font-mono">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCommand(input)
            }
          }}
          autoFocus
          className="flex-1 bg-transparent outline-none text-white/90 text-base font-mono"
          placeholder="Type command..."
          style={{ fontSize: '16px' }}
        />
      </div>
    </div>
  )
}
