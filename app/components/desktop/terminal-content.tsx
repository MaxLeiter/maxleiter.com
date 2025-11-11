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
      newOutput.push('  crt               - Toggle CRT filter')
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
      const body = document.body
      if (body.classList.contains('crt')) {
        body.classList.remove('crt')
        newOutput.push('CRT filter disabled')
      } else {
        body.classList.add('crt')
        newOutput.push('CRT filter enabled')
        // Add the CRT styles if not already present
        if (!document.getElementById('crt-style')) {
          const style = document.createElement('style')
          style.id = 'crt-style'
          style.textContent = `
            :root {
              --crt-red: rgb(218, 49, 49);
              --crt-green: rgb(112, 159, 115);
              --crt-blue: rgb(40, 129, 206);
            }

            body.crt {
              background-color: rgb(25, 25, 30);
              text-shadow: 0 0 0.2em currentColor, 1px 1px rgba(255, 0, 255, 0.5), -1px -1px rgba(0, 255, 255, 0.4);
              position: relative;
            }

            body.crt::before,
            body.crt::after {
              content: "";
              transform: translateZ(0);
              pointer-events: none;
              mix-blend-mode: overlay;
              position: fixed;
              height: 100%;
              width: 100%;
              left: 0;
              top: 0;
              z-index: 9999;
            }

            body.crt::before {
              background: repeating-linear-gradient(
                var(--crt-red) 0px,
                var(--crt-green) 2px,
                var(--crt-blue) 4px
              );
            }

            body.crt::after {
              background: repeating-linear-gradient(
                90deg,
                var(--crt-red) 1px,
                var(--crt-green) 2px,
                var(--crt-blue) 3px
              );
            }
          `
          document.head.appendChild(style)
        }
      }
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
