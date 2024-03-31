"use client";

import React from "react";
import styles from './terminal.module.css';

export function TerminalWindow({ children }: { children: React.ReactNode }) {
    const editableRef = React.useRef<HTMLDivElement>(null);
    const [mode, setMode] = React.useState<'normal' | 'insert' | 'command'>('normal');
    const [command, setCommand] = React.useState('');

    // autofocus the editor on desktops
    React.useEffect(() => {
        if (window.innerWidth > 768 && editableRef.current) {
            editableRef.current.focus();
        }
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (mode === 'normal') {
            switch (event.key) {
                case 'ArrowUp':
                    console.log('ArrowUp');
                    break;
                case 'k':
                    // Move cursor up
                    event.preventDefault();
                    // fire an ArrowUp event
                    break;
                case 'ArrowDown':
                case 'j':
                    // Move cursor down
                    event.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'h':
                    // Move cursor left
                    event.preventDefault();
                    break;
                case 'ArrowRight':
                case 'l':
                    // Move cursor right
                    event.preventDefault();
                    break;

                case 'Escape':
                    // Do nothing
                    break;
                case 'i':
                    // Enter insert mode
                    event.preventDefault();
                    setMode('insert');
                    break;
                case ':':
                    // Enter command mode
                    event.preventDefault();
                    setMode('command');
                    break;
                default:
                    // Prevent default behavior in normal mode
                    event.preventDefault();
                    event.stopPropagation();
                    break;
            }
        } else if (mode === 'insert') {
            if (event.key === 'Escape') {
                // Exit insert mode
                event.preventDefault();
                setMode('normal');
            }
        } else if (mode === 'command') {
            if (event.key === 'Enter') {
                // Execute command
                event.preventDefault();
                executeCommand(command);
                setCommand('');
                setMode('normal');
            } else if (event.key === 'Escape') {
                // Cancel command
                event.preventDefault();
                setCommand('');
                setMode('normal');
            } else {
                // Update command
                setCommand(command + event.key);
            }
        }
    };

    const executeCommand = (command: string) => {
        switch (command) {
            case 'q':
                // Quit the editor
                console.log('Quitting the editor...');
                break;
            case 'w':
                // Save the content
                console.log('Saving the content...');
                break;
            default:
                console.log('Unknown command:', command);
                break;
        }
    };

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
                style={{ cursor: mode === 'normal' ? 'default' : 'text' }}
            >
                {children}
            </div>
            <div className={styles.statusBar}>
                {mode === 'normal' ? '-- NORMAL --' : mode === 'insert' ? '-- INSERT --' : `:`}
                {mode === 'command' && <span>{command}</span>}
            </div>
        </div>
    );
}