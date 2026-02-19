"use client";

import { useState, useEffect, useRef } from 'react';
import { GripHorizontal, Maximize2 } from 'lucide-react';

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
}

export function DraggablePanel({ id, defaultPosition, defaultSize, children, title, className, resizable = true }: DraggablePanelProps) {
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [size, setSize] = useState<Size>(defaultSize);
    const [isLoaded, setIsLoaded] = useState(false);

    const panelRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const isResizing = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

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

        const saved = localStorage.getItem(`panel-${id}`);
        if (saved) {
            const { pos, size: savedSize } = JSON.parse(saved);
            const clamped = clampPosition(pos.x, pos.y, savedSize.width, savedSize.height);
            setPosition(clamped);
            setSize(savedSize);
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
    }, [id, defaultSize, defaultPosition]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(`panel-${id}`, JSON.stringify({ pos: position, size }));
    }, [position, size, id, isLoaded]);

    const handleDragStart = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleResizeStart = (e: React.MouseEvent) => {
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

            let newWidth = Math.max(200, resizeStart.current.width + deltaX);
            let newHeight = Math.max(150, resizeStart.current.height + deltaY);

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
            className={`fixed glass-panel flex flex-col z-50 shadow-2xl ${className || ''}`}
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
            }}
        >
            {/* Header / Drag Handle */}
            <div
                onMouseDown={handleDragStart}
                className="flex items-center justify-between p-2 border-b border-slate-700/50 cursor-grab active:cursor-grabbing bg-slate-800/50 rounded-t-xl select-none"
            >
                <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold pointer-events-none">
                    <GripHorizontal size={14} />
                    {title}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
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
