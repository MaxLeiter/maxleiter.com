import fs from 'fs'
import path from 'path'
import { MinecraftItem } from './MinecraftInventory'
import MinecraftInventory from './MinecraftInventory'

// Statically scoped so Turbopack traces only this directory into the server
// output instead of the whole project.
const IMAGES_DIR = path.join(process.cwd(), 'app/components/mc/images')

interface InventoryFromDirProps {
  /** Grid columns (default 9) */
  columns?: number
  /** Slot size (default 36) */
  slotSize?: number
}

/**
 * Server component that walks a directory (and its sub-directories) looking for
 * image files and feeds them into the client-side `MinecraftInventory`.
 *
 * The directory structure determines metadata:
 *   ─ The immediate subdirectory under `dir` becomes the mod name.
 *   ─ The file name (without extension) becomes the block/item display name.
 */
export default function MinecraftInventoryFromDir({
  columns,
  slotSize,
}: InventoryFromDirProps) {
  const items: MinecraftItem[] = []

  function walk(current: string, relModPath = '') {
    const entries = fs.readdirSync(current, { withFileTypes: true })
    entries.forEach((entry) => {
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        const nextRelMod = path.join(relModPath, entry.name)
        walk(entryPath, nextRelMod)
      } else if (
        entry.isFile() &&
        /\.(png|jpe?g|gif|webp)$/i.test(entry.name)
      ) {
        const fileBuf = fs.readFileSync(entryPath)
        const base64 = fileBuf.toString('base64')
        const ext = path.extname(entry.name).slice(1)
        const dataUri = `data:image/${ext};base64,${base64}`
        const displayName = path.parse(entry.name).name.replace(/_/g, ' ')
        const modName = relModPath.split(path.sep).pop() || 'Unknown Mod'
        items.push({ name: displayName, mod: modName, src: dataUri })
      }
    })
  }

  walk(IMAGES_DIR)

  return (
    <MinecraftInventory items={items} columns={columns} slotSize={slotSize} />
  )
}
