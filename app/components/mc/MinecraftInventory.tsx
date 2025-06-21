'use client'
import { useState, useRef, useEffect } from 'react'
import Image, { StaticImageData } from 'next/image'
import styles from './inventory.module.css'

export interface MinecraftItem {
  /** Display name of the item/block */
  name: string
  /** Name of the mod providing the item, e.g. "Thaumic Augmentation" */
  mod: string
  /** Path or imported image for the item icon */
  src: string | StaticImageData
}

export interface MinecraftInventoryProps {
  /** Items to display */
  items: MinecraftItem[]
  /** Dynamically calculated column count will be clamped between these values. */
  minColumns?: number
  maxColumns?: number
  /** Force a specific number of columns (overrides dynamic behaviour) */
  columns?: number
  /** Size of each slot, in pixels (default: 36) */
  slotSize?: number
}

/**
 * MinecraftInventory renders a grid reminiscent of the Minecraft inventory / JEI UI.
 * Hovering over an item shows a tooltip with its name and mod.
 *
 * By default the inventory is responsive:
 *   ▸ On larger screens it uses `--columns` (defaults to 9) with fixed pixel slots.
 *   ▸ On small screens (<640px) it automatically wraps using `auto-fill` so you
 *     don't have to manually tweak column counts.
 */
export default function MinecraftInventory({
  items,
  /* dynamic options */
  minColumns = 1,
  maxColumns = 9,
  columns,
  slotSize = 36,
}: MinecraftInventoryProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dynamicCols, setDynamicCols] = useState<number>(columns ?? maxColumns)

  // Re-compute columns on mount and whenever the viewport resizes.
  useEffect(() => {
    if (columns != null) {
      setDynamicCols(columns)
      return
    }

    const updateColumns = () => {
      const containerWidth =
        containerRef.current?.clientWidth || window.innerWidth
      // account for 5px gap & 2px slot border -> approximated by gap = 5
      const gap = 5
      const possible = Math.floor((containerWidth + gap) / (slotSize + gap))
      const clamped = Math.max(minColumns, Math.min(maxColumns, possible))
      setDynamicCols(clamped || minColumns)
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [columns, slotSize, minColumns, maxColumns])

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{
        ['--slot-size' as any]: `${slotSize}px`,
        ['--columns' as any]: dynamicCols,
      }}
    >
      {items.map((item, idx) => (
        <div
          key={`${item.name}-${idx}`}
          className={styles.slot}
          onMouseEnter={() => setHovered(idx)}
          onMouseLeave={() => setHovered(null)}
        >
          <Image
            src={item.src}
            alt={item.name}
            width={slotSize - 4}
            height={slotSize - 4}
            unoptimized
            style={{ imageRendering: 'pixelated' }}
          />
          {hovered === idx && (
            <div className={styles.tooltip}>
              <div>{item.name}</div>
              <div className={styles.mod}>{item.mod}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
