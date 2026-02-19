"use client";

import { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
    selectedDate?: Date;
    onSelect: (date: Date) => void;
}

export function Calendar({ selectedDate, onSelect }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-64">
            <div className="flex items-center justify-between mb-2">
                <button onClick={prevMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                    <ChevronLeft size={16} />
                </button>
                <div className="text-sm font-semibold text-slate-200">
                    {format(currentMonth, 'MMMM yyyy')}
                </div>
                <button onClick={nextMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs text-slate-500 font-medium py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isDayToday = isToday(day);

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => onSelect(day)}
                            className={`
                                text-xs w-8 h-8 rounded flex items-center justify-center transition-colors
                                ${!isCurrentMonth ? 'text-slate-700' : ''}
                                ${isCurrentMonth && !isSelected ? 'text-slate-300 hover:bg-slate-800' : ''}
                                ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : ''}
                                ${!isSelected && isDayToday ? 'border border-blue-500/50 text-blue-400' : ''}
                            `}
                        >
                            {format(day, dateFormat)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
