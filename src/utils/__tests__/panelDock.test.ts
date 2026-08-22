import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePanelStore } from '@/store/usePanelStore';
import { togglePanelFromDock } from '../panelDock';

describe('togglePanelFromDock', () => {
    beforeEach(() => usePanelStore.getState().reset());

    it('hides an open panel and removes it from the stack', () => {
        usePanelStore.getState().activate('timebox-panel');
        const toggle = vi.fn();

        togglePanelFromDock('timebox-panel', true, toggle);

        expect(toggle).toHaveBeenCalledOnce();
        expect(usePanelStore.getState().order).toEqual([]);
    });

    it('shows a hidden panel at the front', () => {
        usePanelStore.getState().activate('history-panel');
        const toggle = vi.fn();

        togglePanelFromDock('backlog-panel-main', false, toggle);

        expect(toggle).toHaveBeenCalledOnce();
        expect(usePanelStore.getState().order).toEqual(['history-panel', 'backlog-panel-main']);
    });
});
