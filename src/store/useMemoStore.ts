import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDbStorage } from './indexedDbStorage';

interface MemoState {
    hasHydrated: boolean;
    setHasHydrated: (hydrated: boolean) => void;
    memos: Record<string, string>;
    setMemo: (taskId: string, content: string) => void;
    getMemo: (taskId: string) => string;
    importState: (data: any) => void;
    mergeRecoveredState: (data: { memos?: Record<string, string> }) => void;
}

export const useMemoStore = create<MemoState>()(
    persist(
        (set, get) => ({
            hasHydrated: false,
            setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
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
            },
            mergeRecoveredState: (data) => {
                set((state) => ({
                    memos: {
                        ...(data?.memos ?? {}),
                        ...state.memos,
                    },
                }));
            }
        }),
        {
            name: 'timetask-memos',
            storage: createJSONStorage(() => indexedDbStorage),
            version: 1,
            migrate: (persistedState) => persistedState as MemoState,
            onRehydrateStorage: () => () => {
                useMemoStore.setState({ hasHydrated: true });
            },
            partialize: (state) => ({ memos: state.memos }),
        }
    )
);
