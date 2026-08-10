import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDbStorage } from './indexedDbStorage';
import { TIMEBOX_SLOT_MINUTES } from '@/utils/timebox';

export interface Timebox {
    id: string;
    logicalDate: string;
    startMinute: number;
    durationMinutes: number;
    taskId?: string;
    note?: string;
}

interface TimeboxState {
    timeboxes: Timebox[];
    addTimebox: (logicalDate: string, startMinute: number, taskId?: string) => string;
    updateTimebox: (id: string, updates: Partial<Omit<Timebox, 'id'>>) => void;
    deleteTimebox: (id: string) => void;
    assignTask: (id: string, taskId?: string) => void;
}

const normalizeMinutes = (minutes: number) => Math.max(
    TIMEBOX_SLOT_MINUTES,
    Math.round(minutes / TIMEBOX_SLOT_MINUTES) * TIMEBOX_SLOT_MINUTES,
);

export const useTimeboxStore = create<TimeboxState>()(
    persist(
        (set) => ({
            timeboxes: [],
            addTimebox: (logicalDate, startMinute, taskId) => {
                const id = crypto.randomUUID();
                set((state) => ({
                    timeboxes: [...state.timeboxes, {
                        id,
                        logicalDate,
                        startMinute: Math.max(0, Math.min(1425, startMinute)),
                        durationMinutes: TIMEBOX_SLOT_MINUTES,
                        taskId,
                    }],
                }));
                return id;
            },
            updateTimebox: (id, updates) => set((state) => ({
                timeboxes: state.timeboxes.map((timebox) => timebox.id === id
                    ? {
                        ...timebox,
                        ...updates,
                        startMinute: updates.startMinute === undefined
                            ? timebox.startMinute
                            : Math.max(0, Math.min(1425, updates.startMinute)),
                        durationMinutes: updates.durationMinutes === undefined
                            ? timebox.durationMinutes
                            : normalizeMinutes(updates.durationMinutes),
                    }
                    : timebox),
            })),
            deleteTimebox: (id) => set((state) => ({
                timeboxes: state.timeboxes.filter((timebox) => timebox.id !== id),
            })),
            assignTask: (id, taskId) => set((state) => ({
                timeboxes: state.timeboxes.map((timebox) => timebox.id === id ? { ...timebox, taskId } : timebox),
            })),
        }),
        {
            name: 'timetask-timeboxes',
            storage: createJSONStorage(() => indexedDbStorage),
        },
    ),
);
