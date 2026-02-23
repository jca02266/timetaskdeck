"use client";

import { useState, useEffect, useRef } from 'react';
import { GripHorizontal, Maximize2 } from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';

interface Position {
    x: number;
    y: number;
}

interface Size {
    width: number;
    height: number;
}

interface DraggablePanelProps {
    id: string;
    defaultPosition: { top?: number; bottom?: number; left?: number; right?: number };
    defaultSize: { width: number; height: number };
    children: React.ReactNode;
    title?: React.ReactNode;
    className?: string;
    resizable?: boolean;
    headerControls?: React.ReactNode;
    minSize?: { width: number; height: number };
}

export function DraggablePanel({ id, defaultPosition, defaultSize, children, title, className, resizable = true, headerControls, minSize = { width: 200, height: 150 } }: DraggablePanelProps) {
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [size, setSize] = useState<Size>(defaultSize);
    const [isLoaded, setIsLoaded] = useState(false);

    const panelRef = useRef<HTMLDivElement>(null);
    const frontPanelId = useTaskStore((state) => state.frontPanelId);
    const bringToFront = useTaskStore((state) => state.bringToFront);

    const isDragging = useRef(false);
    const isResizing = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

    const isFront = frontPanelId === id;
    const zIndex = isFront ? 60 : 50;

    useEffect(() => {
        const clampPosition = (x: number, y: number, w: number, h: number) => {
            if (typeof window === 'undefined') return { x, y };
            const maxX = window.innerWidth - 40;
            const minX = -w + 40;
            const maxY = window.innerHeight - 40;
            const minY = 0;
            return {
                x: Math.max(minX, Math.min(x, maxX)),
                y: Math.max(minY, Math.min(y, maxY))
            };
        };

        const currentKey = `panel-${id}`;
        let saved = localStorage.getItem(currentKey);

        // One-time migration for keys with extra spaces (e.g., "backlog - panel - ...")
        if (!saved) {
            const oldId = id.includes('-') ? id.split('-').join(' - ') : id;
            const oldKey = `panel-${oldId} `; // Note the space at the end from the previous bug
            const oldSaved = localStorage.getItem(oldKey) || localStorage.getItem(`panel-${oldId}`);

            if (oldSaved) {
                saved = oldSaved;
                // Clean up old keys if migration found
                localStorage.removeItem(oldKey);
                localStorage.removeItem(`panel-${oldId}`);
                console.log(`Migrated panel settings from ${oldKey} to ${currentKey}`);
            }
        }

        if (saved) {
            try {
                const { pos, size: savedSize } = JSON.parse(saved);
                const clamped = clampPosition(pos.x, pos.y, savedSize.width, savedSize.height);
                setPosition(clamped);
                setSize(savedSize);
            } catch (err) { }
        } else {
            // Calculate initial position based on defaultPosition props (css-like to absolute pixels)
            let x = 0;
            let y = 0;

            if (defaultPosition.left !== undefined) x = defaultPosition.left;
            else if (defaultPosition.right !== undefined) x = window.innerWidth - defaultSize.width - defaultPosition.right;

            if (defaultPosition.top !== undefined) y = defaultPosition.top;
            else if (defaultPosition.bottom !== undefined) y = window.innerHeight - defaultSize.height - defaultPosition.bottom;

            const clamped = clampPosition(x, y, defaultSize.width, defaultSize.height);
            setPosition(clamped);
            setSize(defaultSize);
        }
        setIsLoaded(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(`panel-${id}`, JSON.stringify({ pos: position, size }));
    }, [position, size, id, isLoaded]);

    const handleDragStart = (e: React.MouseEvent) => {
        bringToFront(id);
        isDragging.current = true;
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        bringToFront(id);
        e.stopPropagation();
        isResizing.current = true;
        resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        let newX = e.clientX - dragStart.current.x;
        let newY = e.clientY - dragStart.current.y;

        // Snapping Threshold
        const SNAP = 20;

        // Snap to edges
        if (Math.abs(newX) < SNAP) newX = 0;
        if (Math.abs(window.innerWidth - (newX + size.width)) < SNAP) newX = window.innerWidth - size.width;

        if (Math.abs(newY) < SNAP) newY = 0;
        if (Math.abs(window.innerHeight - (newY + size.height)) < SNAP) newY = window.innerHeight - size.height;

        // Constrain to window bounds
        const maxX = window.innerWidth - 40; // Keep at least 40px visible on left/right
        const minX = -size.width + 40;
        const maxY = window.innerHeight - 40; // Keep at least 40px visible on bottom
        const minY = 0; // Header must not go above top edge

        const clampedX = Math.max(minX, Math.min(newX, maxX));
        const clampedY = Math.max(minY, Math.min(newY, maxY));

        setPosition({ x: clampedX, y: clampedY });
    }


    const handleResizeMove = (e: MouseEvent) => {
        if (isResizing.current) {
            const deltaX = e.clientX - resizeStart.current.x;
            const deltaY = e.clientY - resizeStart.current.y;

            let newWidth = Math.max(minSize.width, resizeStart.current.width + deltaX);
            let newHeight = Math.max(minSize.height, resizeStart.current.height + deltaY);

            // Snapping for resize
            const SNAP = 20;

            if (Math.abs(window.innerWidth - (position.x + newWidth)) < SNAP) {
                newWidth = window.innerWidth - position.x;
            }
            if (Math.abs(window.innerHeight - (position.y + newHeight)) < SNAP) {
                newHeight = window.innerHeight - position.y;
            }

            setSize({
                width: newWidth,
                height: newHeight
            });
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    if (!isLoaded) return null; // Avoid hydration mismatch or flash of wrong position

    return (
        <div
            ref={panelRef}
            onMouseDown={() => bringToFront(id)}
            className={`fixed glass-panel flex flex-col shadow-2xl overflow-hidden ${className || ''}`}
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex
            }}
        >
            {/* Header / Drag Handle */}
            <div
                onMouseDown={handleDragStart}
                className="relative z-50 flex items-center justify-between p-2 border-b border-slate-700/50 cursor-grab active:cursor-grabbing bg-slate-800/90 backdrop-blur-sm rounded-t-xl select-none"
            >
                <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold pointer-events-none">
                    <GripHorizontal size={14} />
                    {title}
                </div>
                {/* Header Controls (Right side) */}
                {headerControls && (
                    <div onMouseDown={(e) => e.stopPropagation()} className="pointer-events-auto">
                        {headerControls}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col relative rounded-b-xl min-h-0">
                {children}
            </div>

            {/* Resize Handle */}
            {resizable && (
                <div
                    onMouseDown={handleResizeStart}
                    className="absolute bottom-0 right-0 p-1 cursor-se-resize text-slate-500 hover:text-slate-300 z-10"
                >
                    <Maximize2 size={12} className="rotate-90" />
                </div>
            )}
        </div>
    );
}
