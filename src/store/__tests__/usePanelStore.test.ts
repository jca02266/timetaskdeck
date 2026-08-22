import { beforeEach, describe, expect, it } from 'vitest';
import { usePanelStore } from '../usePanelStore';

describe('usePanelStore', () => {
    beforeEach(() => usePanelStore.getState().reset());

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
});
