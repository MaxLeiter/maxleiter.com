'use client'

import { PropsWithChildren, Suspense, useCallback } from "react"

export function ContentList({ children }: PropsWithChildren) {
    return <div>
        <div
            className="mb-8 text-muted-foreground"
        >
            <h2 className="text-2xl font-semibold tracking-tight">Posts and other half-baked thoughts</h2>
        </div>
        {children}
    </div>
}
