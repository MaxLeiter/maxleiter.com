"use client";

import React from "react";
import styles from './terminal.module.css';

export function TerminalWindow({ children }: { children: React.ReactNode }) {
    const editableRef = React.useRef<HTMLDivElement>(null);
    const [mode, setMode] = React.useState<'normal' | 'insert'>('normal');
    const [cursorPosition, setCursorPosition] = React.useState<number>(0);

    // autofocus the editor on desktops
    React.useEffect(() => {
        if (window.innerWidth > 768 && editableRef.current) {
            editableRef.current.focus();
        }
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const { key } = event;

        if (mode === 'normal') {
            event.preventDefault(); // Prevent default behavior of keys in normal mode

            if (key === 'i') {
                setMode('insert');
            } else if (key === 'h' || key === 'ArrowLeft') {
                // Move cursor left
                moveCursor(-1);
            } else if (key === 'l' || key === 'ArrowRight') {
                // Move cursor right
                moveCursor(1);
            }
        } else if (mode === 'insert') {
            if (key === 'Escape') {
                event.preventDefault(); // Prevent default behavior of Escape key
                setMode('normal');
            }
        }
    };

    const moveCursor = (delta: number) => {
        const newPosition = cursorPosition + delta;
        setCursorPosition(newPosition);
        setPosition(newPosition);
    };

    const getCursorPosition = () => {
        if (editableRef.current) {
            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);
            const clonedRange = range?.cloneRange();
            clonedRange?.selectNodeContents(editableRef.current);
            clonedRange?.setEnd(range?.endContainer || editableRef.current, range?.endOffset || 0);
            return clonedRange?.toString().length || 0;
        }
        return 0;
    };

    const createRange = (node: Node, targetPosition: number) => {
        const range = document.createRange();
        range.selectNode(node);
        range.setStart(node, 0);

        let pos = 0;
        const stack = [node];
        while (stack.length > 0) {
            const current = stack.pop();

            if (current?.nodeType === Node.TEXT_NODE) {
                const len = current.textContent?.length || 0;
                if (pos + len >= targetPosition) {
                    range.setEnd(current, targetPosition - pos);
                    return range;
                }
                pos += len;
            } else if (current?.childNodes && current.childNodes.length > 0) {
                for (let i = current.childNodes.length - 1; i >= 0; i--) {
                    stack.push(current.childNodes[i]);
                }
            }
        }

        range.setEnd(node, node.childNodes.length);
        return range;
    };

    const setPosition = (targetPosition: number) => {
        if (editableRef.current) {
            const range = createRange(editableRef.current, targetPosition);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    };

    React.useEffect(() => {
        const handleSelectionChange = () => {
            const position = getCursorPosition();
            setCursorPosition(position);
        };

        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);
    return (
        <div className={styles.terminalWindow}>
            <div className={styles.terminalHeader}>
                <div className={styles.trafficLights}>
                    <div className={styles.redLight}></div>
                    <div className={styles.yellowLight}></div>
                    <div className={styles.greenLight}></div>
                </div>
                <p className={styles.terminalTitle}>mdx</p>
            </div>
            <div
                className={styles.terminalContent}
                contentEditable
                suppressContentEditableWarning
                ref={editableRef}
                onKeyDown={handleKeyDown}
            >
                {children}
                <div
                    className={`${styles.cursor} ${mode === 'normal' ? styles.normalCursor : styles.insertCursor}`}
                    style={{
                        left: `calc(1ch * ${cursorPosition})`,
                        position: 'relative'
                    }}
                ></div>
            </div>
            <div className={styles.statusBar}>
                {mode === 'normal' ? '-- NORMAL --' : '-- INSERT --'}
            </div>
        </div>
    );
}