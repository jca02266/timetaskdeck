import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Task, BacklogCategory } from '@/store/useTaskStore';

const mockPickFromBacklog = vi.fn();
const mockAddToBacklog = vi.fn();

const makeTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'task-1',
    name: 'Test Task',
    startTime: 0,
    duration: 0,
    status: 'pending',
    backlogId: 'main',
    ...overrides,
});

// モジュールレベルで差し替え可能な状態
let currentTasks: Task[] = [];

const makeStoreState = () => ({
    backlogTasks: currentTasks,
    colors: [],
    addToBacklog: mockAddToBacklog,
    pickFromBacklog: mockPickFromBacklog,
    updateTaskName: vi.fn(),
    deleteTask: vi.fn(),
    moveBacklogTask: vi.fn(),
    moveHistoryToBacklog: vi.fn(),
    copyToRecurring: vi.fn(),
    updateTaskSchedule: vi.fn(),
    updateBacklogCategory: vi.fn(),
    deleteBacklogCategory: vi.fn(),
    toggleBacklogMinimized: vi.fn(),
    updateTaskColorId: vi.fn(),
    draggedTaskId: null,
    setDraggedTaskId: vi.fn(),
    dropTarget: null,
    setDropTarget: vi.fn(),
    commitMove: vi.fn(),
    taskStack: [],
    history: [],
    openMemo: vi.fn(),
});

const useTaskStoreMock = Object.assign(
    (selector: (s: ReturnType<typeof makeStoreState>) => unknown) => selector(makeStoreState()),
    { getState: () => makeStoreState() }
);

vi.mock('@/store/useTaskStore', () => ({
    useTaskStore: useTaskStoreMock,
}));

vi.mock('@/store/useMemoStore', () => ({
    useMemoStore: (selector: (s: { memos: Record<string, string> }) => unknown) =>
        selector({ memos: {} }),
}));

vi.mock('@/hooks/useNotification', () => ({
    useNotification: () => ({ checkAndNotify: vi.fn() }),
}));

vi.mock('../DraggablePanel', () => ({
    DraggablePanel: ({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) => (
        <div><div>{title}</div><div>{children}</div></div>
    ),
}));

const testCategory: BacklogCategory = {
    id: 'main',
    name: 'Main',
    allocatedMinutes: 0,
    isMinimized: false,
};

describe('BacklogPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentTasks = [];
    });

    it('タスクがないとき一覧に何も表示しない', async () => {
        const { BacklogPanel } = await import('../BacklogPanel');
        render(<BacklogPanel category={testCategory} defaultPosition={{ top: 0, left: 0 }} />);
        expect(screen.queryByText('Test Task')).toBeNull();
    });

    it('バックログのタスク名を表示する', async () => {
        currentTasks = [makeTask({ name: 'My Backlog Task' })];
        const { BacklogPanel } = await import('../BacklogPanel');
        render(<BacklogPanel category={testCategory} defaultPosition={{ top: 0, left: 0 }} />);
        expect(screen.getByText('My Backlog Task')).toBeTruthy();
    });

    it('別カテゴリのタスクは表示しない', async () => {
        currentTasks = [makeTask({ name: 'Other Task', backlogId: 'other' })];
        const { BacklogPanel } = await import('../BacklogPanel');
        render(<BacklogPanel category={testCategory} defaultPosition={{ top: 0, left: 0 }} />);
        expect(screen.queryByText('Other Task')).toBeNull();
    });
});
