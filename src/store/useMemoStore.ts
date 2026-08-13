import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDbStorage } from './indexedDbStorage';

interface MemoState {
    memos: Record<string, string>;
    setMemo: (taskId: string, content: string) => void;
    getMemo: (taskId: string) => string;
    importState: (data: any) => void;
}

export const useMemoStore = create<MemoState>()(
    persist(
        (set, get) => ({
            memos: {},
            setMemo: (taskId: string, content: string) => {
                set((state) => ({
                    memos: {
                        ...state.memos,
                        [taskId]: content
                    }
                }));
            },
            getMemo: (taskId: string) => {
                const state = get();
                return state.memos[taskId] || '';
            },
            importState: (data: any) => {
                set({ memos: data.memos || {} });
            }
        }),
        {
            name: 'timetask-memos',
            storage: createJSONStorage(() => indexedDbStorage),
            version: 1,
            migrate: (persistedState) => persistedState as MemoState,
        }
    )
);
