"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Repeat, Clock, X, Check } from 'lucide-react';
import { DatePicker, DatePickerRef } from './DatePicker';

interface AdvancedScheduleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentDate?: string;
    currentTime?: string;
    currentDaysOfWeek?: number[];
    onSave: (date?: string, time?: string, daysOfWeek?: number[]) => void;
}

const DAYS = [
    { label: 'S', value: 0, full: 'Sun' },
    { label: 'M', value: 1, full: 'Mon' },
    { label: 'T', value: 2, full: 'Tue' },
    { label: 'W', value: 3, full: 'Wed' },
    { label: 'T', value: 4, full: 'Thu' },
    { label: 'F', value: 5, full: 'Fri' },
    { label: 'S', value: 6, full: 'Sat' },
];

export function AdvancedScheduleDialog({
    isOpen,
    onClose,
    currentDate,
    currentTime,
    currentDaysOfWeek,
    onSave
}: AdvancedScheduleDialogProps) {
    const [mode, setMode] = useState<'one-time' | 'weekly'>(currentDaysOfWeek && currentDaysOfWeek.length > 0 ? 'weekly' : 'one-time');
    const [date, setDate] = useState(currentDate || '');
    const [time, setTime] = useState(currentTime || '');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>(currentDaysOfWeek || []);
    const datePickerRef = useRef<DatePickerRef>(null);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            setMode(currentDaysOfWeek && currentDaysOfWeek.length > 0 ? 'weekly' : 'one-time');
            setDate(currentDate || '');
            setTime(currentTime || '');
            setDaysOfWeek(currentDaysOfWeek || []);
        }
    }, [isOpen, currentDate, currentTime, currentDaysOfWeek]);

    if (!isOpen || !mounted) return null;

    const toggleDay = (day: number) => {
        setDaysOfWeek(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
        );
    };

    const formatTimeValue = (val: string) => {
        // Remove all non-numeric characters
        const digits = val.replace(/\D/g, '');
        if (digits.length === 0) return '';

        let h = '00';
        let m = '00';

        if (digits.length <= 2) {
            h = digits.padStart(2, '0');
        } else {
            const splitPos = digits.length - 2;
            h = digits.slice(0, splitPos).padStart(2, '0');
            m = digits.slice(splitPos);
        }

        // Clamp values
        const hourNum = Math.min(23, parseInt(h));
        const minNum = Math.min(59, parseInt(m));

        return `${hourNum.toString().padStart(2, '0')}:${minNum.toString().padStart(2, '0')}`;
    };

    const handleSave = () => {
        // Ensure format is HH:mm even if native input behavior varies
        const formattedTime = time ? (time.includes(':') ? time : `${time.slice(0, 2)}:${time.slice(2)}`) : undefined;

        if (mode === 'one-time') {
            onSave(date || undefined, formattedTime, undefined);
        } else {
            onSave(undefined, formattedTime, daysOfWeek.length > 0 ? daysOfWeek : undefined);
        }
        onClose();
    };

    const handleClear = () => {
        onSave(null as any, null as any, null as any);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-[320px] overflow-hidden flex flex-col text-slate-200 animate-in zoom-in-95 duration-200"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase">Task Schedule</h3>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-950/50 m-2 rounded-lg border border-slate-800">
                    <button
                        onClick={() => setMode('one-time')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs rounded transition-all ${mode === 'one-time' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Calendar size={12} />
                        <span>One-time</span>
                    </button>
                    <button
                        onClick={() => setMode('weekly')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs rounded transition-all ${mode === 'weekly' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Repeat size={12} />
                        <span>Weekly</span>
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Date/Days Input */}
                    {mode === 'one-time' ? (
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 uppercase tracking-tighter">Date</label>
                            <div
                                className="flex items-center gap-3 bg-slate-950/30 p-3 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors cursor-pointer group/date"
                                onClick={() => datePickerRef.current?.open()}
                            >
                                <DatePicker
                                    ref={datePickerRef}
                                    value={date || ''}
                                    onChange={(newDate) => setDate(newDate || '')}
                                />
                                <span className="text-sm text-slate-300 flex-1 group-hover/date:text-white transition-colors">{date || 'Select date'}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 uppercase tracking-tighter">Repeat on</label>
                            <div className="flex justify-between items-center gap-1">
                                {DAYS.map(day => (
                                    <button
                                        key={day.value}
                                        onClick={() => toggleDay(day.value)}
                                        className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center border ${daysOfWeek.includes(day.value)
                                            ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                                            : 'bg-slate-950/30 text-slate-500 border-slate-800 hover:border-slate-600'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Time Input */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 uppercase tracking-tighter">Time</label>
                        <div className="relative group">
                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10 pointer-events-none" />
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                                    if (e.key === 'Enter') {
                                        handleSave();
                                    }
                                    // Let Tab and Arrow keys work normally for type="time"
                                }}
                                className="w-full bg-slate-950/30 border border-slate-800 focus:border-blue-500/50 focus:outline-none rounded-lg py-3 pl-10 pr-4 text-center text-2xl font-mono tracking-widest text-white shadow-inner transition-all [color-scheme:dark] appearance-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-3 bg-slate-950/50 border-t border-slate-800 flex items-center gap-1 justify-between">
                    <button
                        onClick={handleClear}
                        className="px-3 py-2 text-[10px] font-bold text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all uppercase tracking-tight"
                    >
                        Clear Schedule
                    </button>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Check size={14} />
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
