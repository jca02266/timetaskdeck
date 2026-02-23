"use client";

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from './Calendar';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
    value?: string; // YYYY-MM-DD
    onChange: (date: string | undefined) => void;
    placeholder?: string;
    className?: string; // Add className prop for flexibility
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const handleSelect = (date: Date) => {
        onChange(format(date, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const toggleOpen = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Check if there is enough space below
            const spaceBelow = window.innerHeight - rect.bottom;
            const top = spaceBelow > 300 ? rect.bottom + 5 : rect.top - 300; // Simplified flip logic

            setCoords({
                top: top,
                left: Math.max(10, rect.left - 100) // Slight adjustment for alignment
            });
        }
        setIsOpen(!isOpen);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node) &&
                popupRef.current &&
                !popupRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const displayValue = value ? format(parseISO(value), 'MM/dd') : '';

    return (
        <div className={`relative inline-block ${className || ''}`} ref={triggerRef}>
            <div
                onClick={toggleOpen}
                className={`flex items-center gap-1 cursor-pointer hover:text-slate-200 transition-colors ${value ? 'text-blue-400' : 'text-slate-500'}`}
                title={value || placeholder}
            >
                <CalendarIcon size={14} />
                {value && (
                    <span className="text-[10px] font-mono">{displayValue}</span>
                )}
            </div>

            {isOpen && createPortal(
                <div
                    ref={popupRef}
                    className="fixed z-[9999]"
                    style={{
                        top: coords.top,
                        left: coords.left,
                    }}
                >
                    <Calendar
                        selectedDate={value ? parseISO(value) : undefined}
                        onSelect={handleSelect}
                    />
                </div>,
                document.body
            )}
        </div>
    );
}
