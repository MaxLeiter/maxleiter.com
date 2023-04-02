import { useState, useEffect } from 'react'

// Define general type for useDocumentSize hook, which includes width and height
interface Size {
  width: number | undefined
  height: number | undefined
}

// Hook
export default function useDocumentSize(): Size {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [documentSize, setDocumentSize] = useState<Size>({
    width: undefined,
    height: undefined,
  })

  useEffect(() => {
    // Handler to call on window resize
    // eslint-disable-next-line prefer-const
    let resize
    function handleResize() {
      // Set window width/height to state

      setDocumentSize({
        width: document.body.clientWidth,
        height: document.body.clientHeight,
      })
    }

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Call handler right away so state gets updated with initial size
    clearTimeout(resize)
    resize = setTimeout(handleResize, 1000)

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, []) // Empty array ensures that effect is only run on mount

  return documentSize
}
