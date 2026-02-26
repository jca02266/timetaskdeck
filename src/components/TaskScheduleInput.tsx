"use client";

import { useState } from 'react';
import { Clock, Calendar, Repeat } from 'lucide-react';
import { AdvancedScheduleDialog } from './AdvancedScheduleDialog';

interface TaskScheduleInputProps {
    date?: string;
    time?: string;
    daysOfWeek?: number[];
    onUpdate: (date?: string, time?: string, daysOfWeek?: number[]) => void;
    className?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TaskScheduleInput({ date, time, daysOfWeek, onUpdate, className }: TaskScheduleInputProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const hasDays = daysOfWeek && daysOfWeek.length > 0;
    const isDaily = hasDays && daysOfWeek.length === 7;

    let displayLabel = '--:--';
    if (time) {
        if (date) {
            const dateParts = date.split('-');
            displayLabel = `${dateParts[1]}/${dateParts[2]} ${time}`;
        } else if (isDaily) {
            displayLabel = `Daily ${time}`;
        } else if (hasDays) {
            const dayLabels = daysOfWeek.map(d => WEEKDAYS[d].slice(0, 3)).join(',');
            displayLabel = `${dayLabels} ${time}`;
        } else {
            displayLabel = `${time}`;
        }
    }

    const hasSchedule = !!(date || time || hasDays);

    return (
        <>
            <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsDialogOpen(true);
                }}
                className={`relative flex items-center justify-center bg-slate-950/30 px-2 py-1.5 rounded border border-slate-800 text-[10px] leading-tight transition-all cursor-pointer hover:bg-slate-800/50 hover:border-slate-600 group/schedule min-w-[60px] ${className || ''}`}
            >
                <div className="flex items-center gap-1.5">
                    {date ? (
                        <Calendar size={10} className="text-blue-400" />
                    ) : hasDays ? (
                        <Repeat size={10} className="text-blue-400" />
                    ) : (
                        <Clock size={10} className={time ? 'text-blue-400' : 'text-slate-500'} />
                    )}
                    <span className={`font-medium ${hasSchedule ? 'text-blue-400' : 'text-slate-500'}`}>
                        {displayLabel}
                    </span>
                </div>
            </div>

            <AdvancedScheduleDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                currentDate={date}
                currentTime={time}
                currentDaysOfWeek={daysOfWeek}
                onSave={onUpdate}
            />
        </>
    );
}
