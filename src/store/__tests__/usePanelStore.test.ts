import { beforeEach, describe, expect, it } from 'vitest';
import { usePanelStore } from '../usePanelStore';

describe('usePanelStore', () => {
    beforeEach(() => {
        localStorage.clear();
        usePanelStore.getState().reset();
    });

    it('moves only the activated panel to the front', () => {
        const { activate } = usePanelStore.getState();
        activate('main');
        activate('timebox');
        activate('history');
        activate('timebox');

        expect(usePanelStore.getState().order).toEqual(['main', 'history', 'timebox']);
    });

    it('removes hidden panels from the ordering', () => {
        const { activate, remove } = usePanelStore.getState();
        activate('main');
        activate('timebox');
        remove('timebox');

        expect(usePanelStore.getState().order).toEqual(['main']);
    });

    it('restores a removed panel at the front', () => {
        const { activate, remove } = usePanelStore.getState();
        activate('main');
        activate('timebox');
        remove('main');
        activate('main');

        expect(usePanelStore.getState().order).toEqual(['timebox', 'main']);
    });

    it('persists the front ordering and hydrates it after reload', () => {
        const { activate, hydrate } = usePanelStore.getState();
        activate('main');
        activate('timebox');
        activate('history');
        const saved = localStorage.getItem('timetask-ui-panel-order');

        usePanelStore.setState({ order: [] });
        expect(localStorage.getItem('timetask-ui-panel-order')).toBe(saved);
        hydrate();

        expect(usePanelStore.getState().order).toEqual(['main', 'timebox', 'history']);
    });
});
