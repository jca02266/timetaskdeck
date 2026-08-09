import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockOpenDialog = vi.fn();
const mockUpdateTaskLogs = vi.fn();

const makeState = (overrides: Record<string, unknown> = {}) => ({
    activeDialog: 'log' as const,
    openDialog: mockOpenDialog,
    currentTask: null,
    taskLog: [],
    history: [],
    backlogTasks: [],
    taskStack: [],
    addManualTaskLogEntry: vi.fn(),
    dayStartHour: 0,
    updateTaskLogs: mockUpdateTaskLogs,
    ...overrides,
});

// useTaskStore は selector あり・なし両方で使われるため両パターンを処理
function makeStoreMock(stateOverrides = {}) {
    const state = makeState(stateOverrides);
    type StoreHook = {
        (selector?: (s: typeof state) => unknown): unknown;
        getState: () => typeof state;
    };
    const hook = vi.fn((selector?: (s: typeof state) => unknown) =>
        selector ? selector(state) : state
    ) as unknown as StoreHook;
    hook.getState = () => state;
    return hook;
}

let storeMock = makeStoreMock();

vi.mock('@/store/useTaskStore', () => ({
    useTaskStore: (...args: unknown[]) => storeMock(...args as Parameters<typeof storeMock>),
    getLogicalDate: (ts: number, _hour: number) => new Date(ts),
}));

// モック差し替えヘルパー
async function setStoreState(overrides = {}) {
    storeMock = makeStoreMock(overrides);
    const mod = await import('@/store/useTaskStore');
    vi.mocked(mod.useTaskStore).mockImplementation((...args) =>
        storeMock(...args as unknown as Parameters<typeof storeMock>)
    );
}

describe('TaskLogModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        storeMock = makeStoreMock();
    });

    it('isLogOpen=false のとき何も表示しない', async () => {
        storeMock = makeStoreMock({ activeDialog: null });
        const { TaskLogModal } = await import('../TaskLogModal');
        render(<TaskLogModal />);
        expect(screen.queryByText('Activity Log')).toBeNull();
    });

    it('isLogOpen=true のとき Activity Log を表示する', async () => {
        const { TaskLogModal } = await import('../TaskLogModal');
        render(<TaskLogModal />);
        expect(screen.getByText('Activity Log')).toBeTruthy();
    });

    it('ログが空のとき空メッセージを表示する', async () => {
        const { TaskLogModal } = await import('../TaskLogModal');
        render(<TaskLogModal />);
        expect(screen.getByText('No activity recorded for this day.')).toBeTruthy();
    });
});
