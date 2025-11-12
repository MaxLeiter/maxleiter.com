'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'

interface EffectsContextType {
  juiceMode: boolean
  crtMode: boolean
  toggleJuice: () => void
  toggleCrt: () => void
}

const EffectsContext = createContext<EffectsContextType | null>(null)

export function useEffects() {
  const context = useContext(EffectsContext)
  if (!context) {
    throw new Error('useEffects must be used within EffectsProvider')
  }
  return context
}

export function EffectsProvider({ children }: { children: React.ReactNode }) {
  const [juiceMode, setJuiceMode] = useState(false)
  const [crtMode, setCrtMode] = useState(false)

  // Initialize from localStorage and URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const juiceParam = urlParams.has('juice')
    const crtParam = urlParams.has('crt')

    const juiceEnabled =
      juiceParam || localStorage.getItem('juice-mode') === 'true'
    const crtEnabled = crtParam || localStorage.getItem('crt-mode') === 'true'

    if (juiceEnabled) {
      setJuiceMode(true)
    }
    if (crtEnabled) {
      setCrtMode(true)
    }
  }, [])

  // Handle juice mode effects
  useEffect(() => {
    if (juiceMode) {
      document.body.classList.add('juice-mode')
      localStorage.setItem('juice-mode', 'true')
      initJuiceMode()
    } else {
      document.body.classList.remove('juice-mode')
      localStorage.setItem('juice-mode', 'false')
      cleanupJuiceMode()
    }
  }, [juiceMode])

  // Handle CRT mode effects
  useEffect(() => {
    if (crtMode) {
      document.body.classList.add('crt')
      localStorage.setItem('crt-mode', 'true')
      initCrtStyles()
    } else {
      document.body.classList.remove('crt')
      localStorage.setItem('crt-mode', 'false')
    }
  }, [crtMode])

  const toggleJuice = useCallback(() => {
    setJuiceMode((prev) => !prev)
  }, [])

  const toggleCrt = useCallback(() => {
    setCrtMode((prev) => !prev)
  }, [])

  return (
    <EffectsContext.Provider
      value={{ juiceMode, crtMode, toggleJuice, toggleCrt }}
    >
      {children}
    </EffectsContext.Provider>
  )
}

function initCrtStyles() {
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

function cleanupJuiceMode() {
  const mouseHandler = (window as any).__juiceMouseHandler
  if (mouseHandler) {
    document.removeEventListener('mousemove', mouseHandler)
    delete (window as any).__juiceMouseHandler
  }
  const clickHandler = (window as any).__juiceClickHandler
  if (clickHandler) {
    document.removeEventListener('click', clickHandler, true)
    delete (window as any).__juiceClickHandler
  }
  const typingHandler = (window as any).__juiceTypingHandler
  if (typingHandler) {
    document.removeEventListener('keydown', typingHandler)
    delete (window as any).__juiceTypingHandler
  }
  document.querySelectorAll('.mouse-trail').forEach((el) => el.remove())
  delete (window as any).__juiceInitialized
}

function initJuiceMode() {
  // Prevent duplicate initialization
  if ((window as any).__juiceInitialized) return
  ;(window as any).__juiceInitialized = true

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
        transform: scale(1.025);
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

  // Mouse trail effect
  let lastTrailTime = 0
  const trailThrottle = 30

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
    setTimeout(() => trail.remove(), 600)
  }

  ;(window as any).__juiceMouseHandler = mouseHandler
  document.addEventListener('mousemove', mouseHandler)

  // Click sound
  const clickSound = new Audio('/mouse-click.mp3')
  clickSound.volume = 0.8
  let lastClickTime = 0
  const clickThrottle = 100

  const clickHandler = () => {
    const now = Date.now()
    if (now - lastClickTime < clickThrottle) return
    lastClickTime = now

    const sound = clickSound.cloneNode() as HTMLAudioElement
    sound.volume = 0.8
    sound.play().catch(() => {})
  }

  ;(window as any).__juiceClickHandler = clickHandler
  document.addEventListener('click', clickHandler, true)

  // Typing sounds
  const typingSounds = [
    new Audio('/typing-1.mp3'),
    new Audio('/typing-2.mp3'),
    new Audio('/typing-3.mp3'),
    new Audio('/typing-4.mp3'),
  ]

  let lastTypingTime = 0
  const typingThrottle = 50

  const typingHandler = (e: KeyboardEvent) => {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      const now = Date.now()
      if (now - lastTypingTime < typingThrottle) return
      lastTypingTime = now

      const randomSound =
        typingSounds[Math.floor(Math.random() * typingSounds.length)]
      const sound = randomSound.cloneNode() as HTMLAudioElement
      sound.play().catch(() => {})
    }
  }

  ;(window as any).__juiceTypingHandler = typingHandler
  document.addEventListener('keydown', typingHandler)
}
