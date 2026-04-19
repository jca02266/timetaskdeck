"use client";

import { Clock } from 'lucide-react';

interface TimeInputProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    /** "dialog": 大きい中央配置（AdvancedScheduleDialog用）, "inline": コンパクト（TaskLogModal用） */
    variant?: 'dialog' | 'inline';
    isInvalid?: boolean;
    autoFocus?: boolean;
}

export function TimeInput({
    id,
    value,
    onChange,
    onBlur,
    onKeyDown,
    variant = 'dialog',
    isInvalid = false,
    autoFocus,
}: TimeInputProps) {
    if (variant === 'inline') {
        return (
            <input
                id={id}
                type="time"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                autoFocus={autoFocus}
                className={`bg-transparent border-b border-transparent focus:outline-none w-24 [color-scheme:dark] ${
                    isInvalid
                        ? 'border-red-500/50 focus:border-red-500'
                        : 'hover:border-slate-700 focus:border-blue-500'
                }`}
            />
        );
    }

    return (
        <div className="relative group">
            <Clock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10 pointer-events-none"
            />
            <input
                id={id}
                type="time"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                autoFocus={autoFocus}
                className="w-full bg-slate-950/30 border border-slate-800 focus:border-blue-500/50 focus:outline-none rounded-lg py-3 pl-10 pr-4 text-center text-2xl font-mono tracking-widest text-white shadow-inner transition-all [color-scheme:dark] appearance-none"
            />
        </div>
    );
}
