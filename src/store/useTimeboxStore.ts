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
    addTimebox: (logicalDate: string, startMinute: number, taskId?: string, durationMinutes?: number) => string;
    syncScheduledTimebox: (logicalDate: string, startMinute: number, taskId: string, durationMinutes: number) => void;
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
        (set, get) => ({
            timeboxes: [],
            addTimebox: (logicalDate, startMinute, taskId, durationMinutes = TIMEBOX_SLOT_MINUTES) => {
                const id = crypto.randomUUID();
                set((state) => ({
                    timeboxes: [...state.timeboxes, {
                        id,
                        logicalDate,
                        startMinute: Math.max(0, Math.min(1425, startMinute)),
                        durationMinutes: normalizeMinutes(durationMinutes),
                        taskId,
                    }],
                }));
                return id;
            },
            syncScheduledTimebox: (logicalDate, startMinute, taskId, durationMinutes) => {
                const normalizedStart = Math.max(0, Math.min(1425, startMinute));
                const normalizedDuration = normalizeMinutes(durationMinutes);
                const current = get();
                const existing = current.timeboxes.find((timebox) =>
                    timebox.logicalDate === logicalDate && timebox.taskId === taskId,
                );
                if (existing) {
                    if (existing.startMinute === normalizedStart && existing.durationMinutes === normalizedDuration) return;
                    set((state) => ({
                        timeboxes: state.timeboxes.map((timebox) => timebox.id === existing.id
                            ? { ...timebox, startMinute: normalizedStart, durationMinutes: normalizedDuration }
                            : timebox),
                    }));
                    return;
                }

                const emptySlot = current.timeboxes.find((timebox) =>
                    timebox.logicalDate === logicalDate && timebox.startMinute === normalizedStart && !timebox.taskId,
                );
                if (emptySlot) {
                    set((state) => ({
                        timeboxes: state.timeboxes.map((timebox) => timebox.id === emptySlot.id
                            ? { ...timebox, taskId, durationMinutes: normalizedDuration }
                            : timebox),
                    }));
                    return;
                }

                set((state) => ({
                    timeboxes: [...state.timeboxes, {
                        id: crypto.randomUUID(),
                        logicalDate,
                        startMinute: normalizedStart,
                        durationMinutes: normalizedDuration,
                        taskId,
                    }],
                }));
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
            version: 1,
            migrate: (persistedState) => persistedState as TimeboxState,
        },
    ),
);
