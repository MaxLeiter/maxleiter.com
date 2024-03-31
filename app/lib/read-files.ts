import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

export function readFiles<T extends {
    date: string
}>(dirPath: string) {
  const files = fs.readdirSync(dirPath)

   const parsed = files
      .filter(
        (file) => path.extname(file) === '.md' || path.extname(file) === '.mdx',
      )
      .map((file) => {
        const filePath = `./${dirPath}/${file}`
        const postContent = fs.readFileSync(filePath, 'utf8')
        const { data, content } = matter(postContent)

        if (data.published === false) {
          return null
        }

        return { ...data, body: content }
      }) as (T | null)[]

    const filtered = parsed
        .filter((post) => post !== null)
        .sort((a, b) =>
            a && b ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0,
        ) as T[]
    return filtered
}
