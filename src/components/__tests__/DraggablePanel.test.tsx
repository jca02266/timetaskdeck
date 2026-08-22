import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DraggablePanel } from '../DraggablePanel';
import { usePanelStore } from '@/store/usePanelStore';

describe('DraggablePanel front ordering', () => {
    beforeEach(() => {
        localStorage.clear();
        usePanelStore.getState().reset();
    });

    it('moves only the selected panel to the front with integer z-indexes', async () => {
        render(
            <>
                <DraggablePanel id="panel-a" defaultPosition={{ top: 0, left: 0 }} defaultSize={{ width: 240, height: 180 }}>
                    <button onPointerDown={(event) => event.stopPropagation()}>A control</button>
                </DraggablePanel>
                <DraggablePanel id="panel-b" defaultPosition={{ top: 20, left: 20 }} defaultSize={{ width: 240, height: 180 }}>
                    <button>B control</button>
                </DraggablePanel>
            </>,
        );

        await waitFor(() => expect(screen.getByText('A control')).toBeTruthy());
        fireEvent.pointerDown(screen.getByText('A control'));

        expect(usePanelStore.getState().order).toEqual(['panel-a']);
        const panelA = screen.getByText('A control').closest('[data-panel-id]') as HTMLElement;
        const panelB = screen.getByText('B control').closest('[data-panel-id]') as HTMLElement;

        expect(panelA.getAttribute('data-panel-front')).toBe('true');
        expect(panelB.getAttribute('data-panel-front')).toBe('false');
        expect(panelA.style.zIndex).toBe('101');
        expect(panelB.style.zIndex).toBe('100');

        fireEvent.pointerDown(screen.getByText('B control'));

        expect(usePanelStore.getState().order).toEqual(['panel-a', 'panel-b']);
        expect(panelA.getAttribute('data-panel-front')).toBe('false');
        expect(panelB.getAttribute('data-panel-front')).toBe('true');
        expect(panelA.style.zIndex).toBe('101');
        expect(panelB.style.zIndex).toBe('102');

        fireEvent.pointerDown(screen.getByText('A control'));

        expect(usePanelStore.getState().order).toEqual(['panel-b', 'panel-a']);
        expect(panelA.getAttribute('data-panel-front')).toBe('true');
        expect(panelB.getAttribute('data-panel-front')).toBe('false');
        expect(panelA.style.zIndex).toBe('102');
        expect(panelB.style.zIndex).toBe('101');
    });
});
