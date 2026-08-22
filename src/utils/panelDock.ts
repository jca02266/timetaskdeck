import { usePanelStore } from '@/store/usePanelStore';

/**
 * Dock contract: an open panel is hidden; a hidden panel is shown at the front.
 */
export function togglePanelFromDock(id: string, isOpen: boolean, toggleVisibility: () => void): void {
    if (isOpen) usePanelStore.getState().remove(id);
    else usePanelStore.getState().activate(id);
    toggleVisibility();
}
