import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedScheduleDialog } from '../AdvancedScheduleDialog';

vi.mock('react-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-dom')>();
    return { ...actual, createPortal: (node: React.ReactNode) => node };
});

describe('AdvancedScheduleDialog', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onSave: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('isOpen=false のとき何も表示しない', () => {
        render(<AdvancedScheduleDialog {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Task Schedule')).toBeNull();
    });

    it('isOpen=true のときダイアログを表示する', () => {
        render(<AdvancedScheduleDialog {...defaultProps} />);
        expect(screen.getByText('Task Schedule')).toBeTruthy();
    });

    it('One-time モードで Apply すると date/time を渡す', () => {
        render(<AdvancedScheduleDialog {...defaultProps} currentDate="2026-05-01" currentTime="09:00" />);
        fireEvent.click(screen.getByText('Apply'));
        expect(defaultProps.onSave).toHaveBeenCalledWith('2026-05-01', '09:00', undefined, true);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('Weekly タブに切り替えると曜日ボタンが表示される', () => {
        render(<AdvancedScheduleDialog {...defaultProps} />);
        fireEvent.click(screen.getByText('Weekly'));
        // 月曜 "M" ボタンが表示される
        const mButtons = screen.getAllByText('M');
        expect(mButtons.length).toBeGreaterThan(0);
    });

    it('Weekly モードで月曜を選択して Apply すると daysOfWeek=[1] を渡す', () => {
        render(<AdvancedScheduleDialog {...defaultProps} />);
        fireEvent.click(screen.getByText('Weekly'));
        // "M" は1つだけ
        fireEvent.click(screen.getByText('M'));
        fireEvent.click(screen.getByText('Apply'));
        expect(defaultProps.onSave).toHaveBeenCalledWith(undefined, undefined, [1], true);
    });

    it('Clear Schedule を押すと null を渡して閉じる', () => {
        render(<AdvancedScheduleDialog {...defaultProps} currentDate="2026-05-01" />);
        fireEvent.click(screen.getByText('Clear Schedule'));
        expect(defaultProps.onSave).toHaveBeenCalledWith(null, null, null, undefined);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('daysOfWeek が初期値にある場合 Weekly モードで開く', () => {
        render(<AdvancedScheduleDialog {...defaultProps} currentDaysOfWeek={[1, 3]} />);
        const weeklyTab = screen.getByText('Weekly').closest('button');
        expect(weeklyTab?.className).toContain('bg-slate-800');
    });
});
