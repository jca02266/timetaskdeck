"use client";

import { Clock, X } from 'lucide-react';
import { DatePicker } from './DatePicker';

interface TaskScheduleInputProps {
    date?: string;
    time?: string;
    onUpdate: (date?: string, time?: string) => void;
    className?: string;
}

export function TaskScheduleInput({ date, time, onUpdate, className }: TaskScheduleInputProps) {
    const dateDisplay = date ? date.split('-').slice(1).join('/') : '--/--';
    const timeDisplay = time || '--:--';

    return (
        <div
            onPointerDown={(e) => e.stopPropagation()}
            className={`relative flex flex-col items-center justify-center bg-slate-950/30 px-2 py-1 rounded border border-slate-800 text-[9px] leading-tight transition-colors group/schedule ${className || ''}`}
        >
            <div className="flex items-center gap-1">
                <DatePicker
                    value={date}
                    onChange={(newDate) => onUpdate(newDate, time)}
                />
            </div>

            {/* Divider (Horizontal) */}
            <div className="w-full h-[1px] bg-slate-800 my-0.5" />

            <div className="relative w-full flex items-center justify-center gap-1 group/time text-slate-500 hover:text-slate-300 py-0.5 cursor-pointer">
                <Clock size={8} className={time ? 'text-blue-400' : 'text-slate-500'} />
                <span className={time ? 'text-blue-400' : ''}>{timeDisplay}</span>
                <input
                    type="time"
                    value={time || ''}
                    onChange={(e) => onUpdate(date, e.target.value || undefined)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
            </div>

            {/* Clear Button - Absolute positioned to not break layout */}
            {(date || time) && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onUpdate('', ''); // Explicitly clear
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-slate-800 text-slate-400 hover:text-red-400 p-0.5 rounded-full border border-slate-700 opacity-0 group-hover/schedule:opacity-100 transition-opacity z-20"
                    title="Clear Schedule"
                >
                    <X size={8} />
                </button>
            )}
        </div>
    );
}
