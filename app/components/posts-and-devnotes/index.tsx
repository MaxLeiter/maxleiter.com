"use client"

import * as Tabs from '@radix-ui/react-tabs';
import styles from './index.module.css'
import { ReactNode } from 'react';

export function PostsAndDevNotes({ PostList, NoteList }: {
    PostList: ReactNode
    NoteList: ReactNode
}) {
    return (
        <>
            <Tabs.Root defaultValue="1" className={styles.tabs}>
                <Tabs.List className={styles.tabsList}>
                    <h2>
                        <Tabs.Trigger value="1" className={styles.tabsTrigger}>
                            Posts
                        </Tabs.Trigger>
                    </h2>
                    <h2>
                        <Tabs.Trigger value="2" className={styles.tabsTrigger}>
                            Dev Notes & Snippets
                        </Tabs.Trigger>
                    </h2>
                </Tabs.List>
                <Tabs.Content value="1" className={styles.tabsContent}>
                    {PostList}
                </Tabs.Content>
                <Tabs.Content value="2" className={styles.tabsContent}>
                    {NoteList}
                </Tabs.Content>
            </Tabs.Root>
        </>)
}
