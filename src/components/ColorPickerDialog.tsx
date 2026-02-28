"use client";

import { useTaskStore, ColorDefinition } from '@/store/useTaskStore';
import { X, Check } from 'lucide-react';
import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface ColorPickerDialogProps {
    onClose: () => void;
    onSelect: (colorId: string | undefined) => void;
    currentColorId?: string;
    triggerRect?: DOMRect;
}

export function ColorPickerDialog({ onClose, onSelect, currentColorId, triggerRect }: ColorPickerDialogProps) {
    const colors = useTaskStore((state) => state.colors);
    const dialogRef = useRef<HTMLDivElement>(null);

    // Initial naive position to avoid jumper from 0,0
    const [position, setPosition] = useState<{ top: number; left: number } | null>(() => {
        if (triggerRect) {
            return { top: triggerRect.bottom + 8, left: triggerRect.left };
        }
        return null;
    });

    const [isPositioned, setIsPositioned] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    useLayoutEffect(() => {
        if (!triggerRect || !dialogRef.current) return;

        const dialogWidth = dialogRef.current.offsetWidth;
        const dialogHeight = dialogRef.current.offsetHeight;
        const padding = 12;

        let left = triggerRect.left;
        let top = triggerRect.bottom + 8;

        // Horizonal boundary check
        if (left + dialogWidth > window.innerWidth - padding) {
            left = window.innerWidth - dialogWidth - padding;
        }
        if (left < padding) left = padding;

        // Vertical boundary check
        if (top + dialogHeight > window.innerHeight - padding) {
            const topAbove = triggerRect.top - dialogHeight - 8;
            if (topAbove > padding) {
                top = topAbove;
            } else {
                top = window.innerHeight - dialogHeight - padding;
            }
        }
        if (top < padding) top = padding;

        setPosition({ top, left });
        setIsPositioned(true);
    }, [triggerRect]);

    const dialog = (
        <div
            ref={dialogRef}
            style={{
                position: 'fixed',
                zIndex: 9999,
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                visibility: isPositioned ? 'visible' : 'hidden',
                pointerEvents: isPositioned ? 'auto' : 'none',
            }}
            className={`w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col p-3 overflow-hidden ${isPositioned ? 'animate-in fade-in zoom-in duration-200' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Tag</span>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                    <X size={14} />
                </button>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <button
                    onClick={() => {
                        onSelect(undefined);
                        onClose();
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${!currentColorId ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                    <div className="w-3 h-3 rounded-full border border-slate-700 bg-slate-800" />
                    <span className="flex-1">NONE</span>
                    {!currentColorId && <Check size={12} />}
                </button>

                {colors.map((color) => {
                    const isSelected = currentColorId === color.id;
                    return (
                        <button
                            key={color.id}
                            onClick={() => {
                                onSelect(color.id);
                                onClose();
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <div className={`w-3 h-3 rounded-full border border-white/10 ${color.colorCode}`} />
                            <span className="flex-1 truncate">{color.name}</span>
                            {isSelected && <Check size={12} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return createPortal(dialog, document.body);
}
