'use client'

import FilterableList from "@components/filterable-list"
import { motion } from "framer-motion"
import { PropsWithChildren, Suspense, useCallback } from "react"
import { getTag, RenderItem } from "./render-item"
import { Post, Note } from "@lib/types"

export function ContentList({ children }: PropsWithChildren) {
    return <div>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1 }}
            className="mb-8 text-muted-foreground"
        >
            <h2 className="text-2xl font-semibold tracking-tight">Posts and other half-baked thoughts</h2>
        </motion.div>
        {children}
    </div>
}
