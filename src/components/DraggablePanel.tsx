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

    const handleDragStart = (e: React.PointerEvent) => {
        if (e.button !== 0) return; // Only target primary button
        bringToFront(id);
        isDragging.current = true;
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };

        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!isDragging.current) return;
            let newX = moveEvent.clientX - dragStart.current.x;
            let newY = moveEvent.clientY - dragStart.current.y;

            // Snapping Threshold
            const SNAP = 20;

            if (Math.abs(newX) < SNAP) newX = 0;
            if (Math.abs(window.innerWidth - (newX + size.width)) < SNAP) newX = window.innerWidth - size.width;

            if (Math.abs(newY) < SNAP) newY = 0;
            if (Math.abs(window.innerHeight - (newY + size.height)) < SNAP) newY = window.innerHeight - size.height;

            const maxX = window.innerWidth - 40;
            const minX = -size.width + 40;
            const maxY = window.innerHeight - 40;
            const minY = 0;

            const clampedX = Math.max(minX, Math.min(newX, maxX));
            const clampedY = Math.max(minY, Math.min(newY, maxY));

            setPosition({ x: clampedX, y: clampedY });
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            target.releasePointerCapture(upEvent.pointerId);
            isDragging.current = false;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const handleResizeStart = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        bringToFront(id);
        e.stopPropagation();
        isResizing.current = true;
        resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };

        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!isResizing.current) return;
            const deltaX = moveEvent.clientX - resizeStart.current.x;
            const deltaY = moveEvent.clientY - resizeStart.current.y;

            let newWidth = Math.max(minSize.width, resizeStart.current.width + deltaX);
            let newHeight = Math.max(minSize.height, resizeStart.current.height + deltaY);

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
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            target.releasePointerCapture(upEvent.pointerId);
            isResizing.current = false;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    if (!isLoaded) return null; // Avoid hydration mismatch or flash of wrong position

    return (
        <div
            ref={panelRef}
            onPointerDown={() => bringToFront(id)}
            className={`fixed glass-panel flex flex-col shadow-2xl overflow-hidden ${className || ''}`}
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex: className?.includes('z-[') ? undefined : zIndex,
                touchAction: 'none'
            }}
        >
            {/* Header / Drag Handle */}
            <div
                onPointerDown={handleDragStart}
                className="relative z-50 flex items-center justify-between p-2 border-b border-slate-700/50 cursor-grab active:cursor-grabbing bg-slate-800/90 backdrop-blur-sm rounded-t-xl select-none"
            >
                <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold pointer-events-none">
                    <GripHorizontal size={14} />
                    {title}
                </div>
                {/* Header Controls (Right side) */}
                {headerControls && (
                    <div onPointerDown={(e) => e.stopPropagation()} className="pointer-events-auto">
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
                    onPointerDown={handleResizeStart}
                    className="absolute bottom-0 right-0 p-1 cursor-se-resize text-slate-500 hover:text-slate-300 z-10"
                >
                    <Maximize2 size={12} className="rotate-90" />
                </div>
            )}
        </div>
    );
}
