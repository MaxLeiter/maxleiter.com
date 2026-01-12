export const windowStyles = {
  translucentBg: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(12px)',
  },
  header: 'h-8 border-b border-[var(--border-color)] flex items-center justify-between px-3 rounded-t-lg select-none',
  toolbar: 'h-10 border-b border-[var(--border-color)] flex items-center justify-between px-4 select-none sticky top-0 z-10',
  button: 'text-[var(--gray)] hover:text-[var(--fg)] hover:bg-white/10 w-5 h-5 rounded flex items-center justify-center text-xs transition-colors',
  title: 'text-[var(--gray)] text-xs font-normal',
} as const

export const getHeaderClassName = (isFullscreen = false) => {
  return `window-header ${windowStyles.header} ${!isFullscreen ? 'cursor-move' : ''}`
}