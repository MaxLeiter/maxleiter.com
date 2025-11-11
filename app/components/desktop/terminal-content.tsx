'use client'

import { useState, useRef, useEffect } from 'react'
import type { BlogPost, Project } from '@lib/portfolio-data'
import { useEffects } from '@components/desktop/effects-context'

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
  const { toggleJuice, toggleCrt } = useEffects()
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

  // Restore juice mode and CRT from localStorage or URL params on mount
  useEffect(() => {
    // Check URL params first
    const urlParams = new URLSearchParams(window.location.search)
    const juiceParam = urlParams.has('juice')
    const crtParam = urlParams.has('crt')

    // Use URL params if present, otherwise fall back to localStorage
    const juiceEnabled =
      juiceParam || localStorage.getItem('juice-mode') === 'true'
    const crtEnabled = crtParam || localStorage.getItem('crt-mode') === 'true'

    if (juiceEnabled) {
      document.body.classList.add('juice-mode')
      localStorage.setItem('juice-mode', 'true')
      // Re-initialize juice mode effects
      initJuiceMode()
    }

    if (crtEnabled) {
      document.body.classList.add('crt')
      localStorage.setItem('crt-mode', 'true')
      initCrtStyles()
    }

    return () => {
      if (juiceEnabled) {
        cleanupJuiceMode()
      }
    }
  }, [])

  const initCrtStyles = () => {
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

  const cleanupJuiceMode = () => {
    const mouseHandler = (window as any).__juiceMouseHandler
    if (mouseHandler) {
      document.removeEventListener('mousemove', mouseHandler)
      delete (window as any).__juiceMouseHandler
    }
    const clickHandler = (window as any).__juiceClickHandler
    if (clickHandler) {
      document.removeEventListener('click', clickHandler, true) // Remove with capture flag
      delete (window as any).__juiceClickHandler
    }
    const typingHandler = (window as any).__juiceTypingHandler
    if (typingHandler) {
      document.removeEventListener('keydown', typingHandler)
      delete (window as any).__juiceTypingHandler
    }
    document.querySelectorAll('.mouse-trail').forEach((el) => el.remove())
  }

  const initJuiceMode = () => {
    // Add juice styles if not already present
    if (!document.getElementById('juice-style')) {
      const style = document.createElement('style')
      style.id = 'juice-style'
      style.textContent = `
        /* Mouse trail dots */
        .mouse-trail {
          position: fixed;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9998;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0));
          animation: trail-fade 0.6s ease-out forwards;
        }

        @keyframes trail-fade {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(0.3);
            opacity: 0;
          }
        }

        /* Bouncy animations on interactive elements */
        body.juice-mode button,
        body.juice-mode a,
        body.juice-mode [role="button"] {
          transition: transform 0.15s cubic-bezier(0.68, -0.55, 0.265, 1.55) !important;
        }

        body.juice-mode button:hover,
        body.juice-mode a:hover,
        body.juice-mode [role="button"]:hover {
          transform: scale(1.05);
        }

        body.juice-mode button:active,
        body.juice-mode a:active,
        body.juice-mode [role="button"]:active {
          transform: scale(0.95);
        }

        /* Window bounce effect on open */
        body.juice-mode [role="dialog"]:not(.window-closing) {
          animation: window-bounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes window-bounce {
          0% {
            transform: scale(0.8) translateY(-20px);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        /* Window explosion effect on close */
        body.juice-mode .window-closing {
          animation: window-explode 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }

        @keyframes window-explode {
          0% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: blur(0px);
          }
          50% {
            transform: scale(1.2) rotate(5deg);
            filter: blur(2px);
          }
          100% {
            transform: scale(0.3) rotate(180deg) translateY(-100px);
            opacity: 0;
            filter: blur(10px);
          }
        }

        /* Enhanced hover effects */
        body.juice-mode .desktop-icon:hover {
          transform: translateY(-4px) scale(1.05);
        }
      `
      document.head.appendChild(style)
    }

    let lastTrailTime = 0
    const trailThrottle = 30 // ms between trails

    const mouseHandler = (e: MouseEvent) => {
      const now = Date.now()
      if (now - lastTrailTime < trailThrottle) return
      lastTrailTime = now

      const trail = document.createElement('div')
      trail.className = 'mouse-trail'
      trail.style.left = e.pageX + 'px'
      trail.style.top = e.pageY + 'px'

      const colors = [
        'rgba(255, 107, 107, 0.8)',
        'rgba(78, 205, 196, 0.8)',
        'rgba(69, 183, 209, 0.8)',
        'rgba(255, 160, 122, 0.8)',
        'rgba(152, 216, 200, 0.8)',
        'rgba(247, 220, 111, 0.8)',
        'rgba(187, 143, 206, 0.8)',
      ]
      const color = colors[Math.floor(Math.random() * colors.length)]
      trail.style.background = `radial-gradient(circle, ${color}, transparent)`

      document.body.appendChild(trail)

      // Remove after animation
      setTimeout(() => {
        trail.remove()
      }, 600)
    }

    ;(window as any).__juiceMouseHandler = mouseHandler
    document.addEventListener('mousemove', mouseHandler)

    const clickSound = new Audio('/mouse-click.mp3')
    let lastClickTime = 0
    const clickThrottle = 100 // ms between sounds
    clickSound.volume = 0.8

    const clickHandler = () => {
      const now = Date.now()
      if (now - lastClickTime < clickThrottle) return
      lastClickTime = now

      const sound = clickSound.cloneNode() as HTMLAudioElement
      sound.volume = 0.8
      sound.play().catch(() => {})
    }

    ;(window as any).__juiceClickHandler = clickHandler
    document.addEventListener('click', clickHandler, true) // Use capture phase to fire before link navigation

    const typingSounds = [
      new Audio('/typing-1.mp3'),
      new Audio('/typing-2.mp3'),
      new Audio('/typing-3.mp3'),
      new Audio('/typing-4.mp3'),
    ]

    let lastTypingTime = 0
    const typingThrottle = 50 // ms between sounds

    const typingHandler = (e: KeyboardEvent) => {
      // Only play for actual character keys, not modifiers
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
        const now = Date.now()
        if (now - lastTypingTime < typingThrottle) return
        lastTypingTime = now

        // Randomly pick a typing sound
        const randomSound =
          typingSounds[Math.floor(Math.random() * typingSounds.length)]
        const sound = randomSound.cloneNode() as HTMLAudioElement
        sound.play().catch(() => {
          // Ignore autoplay policy errors
        })
      }
    }

    ;(window as any).__juiceTypingHandler = typingHandler
    document.addEventListener('keydown', typingHandler)
  }

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
        'juice',
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
      newOutput.push('  juice             - JUICE IT')
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
      const wasEnabled = document.body.classList.contains('crt')
      toggleCrt()
      newOutput.push(wasEnabled ? 'CRT filter disabled' : 'CRT filter enabled')
    } else if (lowerCmd === 'juice') {
      const wasEnabled = document.body.classList.contains('juice-mode')
      toggleJuice()
      newOutput.push(wasEnabled ? 'UNJUICED' : 'JUICED')
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
