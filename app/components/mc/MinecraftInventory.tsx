'use client'
import { useState, useRef } from 'react'
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
  /** Number of columns in the grid (default: 9 like a chest row) */
  columns?: number
  /** Size of each slot, in pixels (default: 36) */
  slotSize?: number
}

/**
 * MinecraftInventory renders a grid reminiscent of the Minecraft inventory / JEI UI.
 * Hovering over an item shows a tooltip with its name and mod.
 */
export default function MinecraftInventory({
  items,
  columns = 9,
  slotSize = 36,
}: MinecraftInventoryProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{ gridTemplateColumns: `repeat(${columns}, ${slotSize}px)` }}
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
