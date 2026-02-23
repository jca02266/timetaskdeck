"use client";

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    className?: string;
}

export function Tooltip({ text, children, className = "truncate" }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 5, // Position below the element
                left: rect.left
            });
        }
    };

    const handleMouseEnter = () => {
        updatePosition();
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    const handleFocus = () => {
        updatePosition();
        setIsVisible(true);
    };

    const handleBlur = () => {
        setIsVisible(false);
    };

    return (
        <div
            ref={triggerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={className}
            tabIndex={0} // Make focusable
        >
            {children}
            {isVisible && createPortal(
                <div
                    className="fixed z-[9999] px-2 py-1 bg-slate-900 border border-slate-700 text-white text-xs rounded shadow-lg max-w-xs break-words pointer-events-none"
                    style={{
                        top: coords.top,
                        left: coords.left,
                    }}
                >
                    {text}
                </div>,
                document.body
            )}
        </div>
    );
}
