import { create } from 'zustand';

interface PanelState {
    order: string[];
    activate: (id: string) => void;
    remove: (id: string) => void;
    hydrate: () => void;
    reset: () => void;
}

export const PANEL_ORDER_STORAGE_KEY = 'timetask-ui-panel-order';

function saveOrder(order: string[]) {
    if (typeof window !== 'undefined') {
        localStorage.setItem(PANEL_ORDER_STORAGE_KEY, JSON.stringify(order));
    }
}

function readOrder(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const value: unknown = JSON.parse(localStorage.getItem(PANEL_ORDER_STORAGE_KEY) || '[]');
        return Array.isArray(value) && value.every((id) => typeof id === 'string') ? value : [];
    } catch {
        return [];
    }
}

/**
 * UI-only ordering for draggable decks. It is persisted separately from task
 * data because it is a presentation preference, not part of a task.
 * The final id in `order` is the only front-most deck.
 */
export const usePanelStore = create<PanelState>((set) => ({
    order: [],
    activate: (id) => set((state) => {
        const order = [...state.order.filter((panelId) => panelId !== id), id];
        saveOrder(order);
        return { order };
    }),
    remove: (id) => set((state) => {
        const order = state.order.filter((panelId) => panelId !== id);
        saveOrder(order);
        return { order };
    }),
    hydrate: () => set({ order: readOrder() }),
    reset: () => {
        saveOrder([]);
        set({ order: [] });
    },
}));
