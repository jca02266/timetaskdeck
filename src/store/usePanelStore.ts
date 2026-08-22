import { create } from 'zustand';

interface PanelState {
    order: string[];
    activate: (id: string) => void;
    remove: (id: string) => void;
    reset: () => void;
}

/**
 * Ephemeral UI-only ordering for draggable decks.
 * The final id in `order` is the only front-most deck.
 */
export const usePanelStore = create<PanelState>((set) => ({
    order: [],
    activate: (id) => set((state) => ({
        order: [...state.order.filter((panelId) => panelId !== id), id],
    })),
    remove: (id) => set((state) => ({
        order: state.order.filter((panelId) => panelId !== id),
    })),
    reset: () => set({ order: [] }),
}));
