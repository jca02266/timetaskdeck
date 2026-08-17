import type { StateStorage } from 'zustand/middleware';
import type {
    BacklogCategory,
    ColorDefinition,
    Task,
    TaskLogEntry,
} from './useTaskStore';
import type { Timebox } from './useTimeboxStore';

export const INDEXED_DB_NAME = 'timetask-db';
const DB_VERSION = 3;
const LEGACY_STORE_NAME = 'persisted-state';
const MIGRATION_VERSION = 3;
const FALLBACK_PREFIX = 'timetask-fallback-';

const STORE = {
    tasks: 'tasks',
    taskLogs: 'task-logs',
    memos: 'memos',
    backlogCategories: 'backlog-categories',
    colors: 'colors',
    taskLists: 'task-lists',
    settings: 'settings',
    migrationMeta: 'migration-meta',
    timeboxes: 'timeboxes',
} as const;

type StoreName = typeof STORE[keyof typeof STORE];

type PersistedTaskState = {
    currentTask?: Task | null;
    taskStack?: Task[];
    backlogTasks?: Task[];
    backlogCategories?: BacklogCategory[];
    colors?: ColorDefinition[];
    history?: Task[];
    recurringTasks?: Task[];
    taskLog?: TaskLogEntry[];
    activeDialog?: unknown;
    activeMemoTaskId?: string | null;
    isMemoMinimized?: boolean;
    dayStartHour?: number;
    missedTaskWindowMinutes?: number;
    currentTime?: string;
    currentDate?: string;
    currentDay?: number;
    dropTarget?: unknown;
};

type PersistedMemoState = {
    memos?: Record<string, string>;
};

export type LegacyRecoveryCandidate = {
    taskState: PersistedTaskState;
    memoState: PersistedMemoState;
    summary: {
        backlogTasks: number;
        backlogCategories: number;
        history: number;
        recurringTasks: number;
        taskLogs: number;
        memos: number;
    };
};

type PersistedEnvelope<T> = {
    state?: T;
    version?: number;
};

type ParsedLegacy<T> =
    | { kind: 'missing' }
    | { kind: 'valid'; state: T; version: number }
    | { kind: 'invalid'; reason: string };

type NormalizedTaskState = {
    tasks: Task[];
    taskLogs: TaskLogEntry[];
    backlogCategories: BacklogCategory[];
    colors: ColorDefinition[];
    lists: Record<string, string[]>;
    settings: Record<string, unknown>;
};

type NormalizedMemoState = {
    memos: Record<string, string>;
};

let databasePromise: Promise<IDBDatabase> | undefined;
let databaseConnection: IDBDatabase | undefined;
let migrationPromise: Promise<void> | undefined;
let taskSnapshot: NormalizedTaskState | undefined;
let memoSnapshot: NormalizedMemoState | undefined;
let timeboxSnapshot: Timebox[] | undefined;
const initializedStorageNames = new Set<string>();

const areEqual = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

const isIndexedDBAvailable = () =>
    typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const getLocalStorage = (): Storage | undefined =>
    typeof localStorage === 'undefined' ? undefined : localStorage;

const createObjectStores = (database: IDBDatabase) => {
    Object.values(STORE).forEach((storeName) => {
        if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName);
        }
    });
};

const openDatabase = (): Promise<IDBDatabase> => {
    if (!isIndexedDBAvailable()) {
        return Promise.reject(new Error('IndexedDB is not available'));
    }

    if (!databasePromise) {
        databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
            const request = window.indexedDB.open(INDEXED_DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => createObjectStores(request.result);
            request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another tab'));
            request.onsuccess = () => {
                request.result.onversionchange = () => request.result.close();
                databaseConnection = request.result;
                resolve(request.result);
            };
            request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
        }).catch((error) => {
            databasePromise = undefined;
            throw error;
        });
    }

    return databasePromise!;
};

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
    new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });

const readValue = async <T>(database: IDBDatabase, storeName: StoreName | typeof LEGACY_STORE_NAME, key: IDBValidKey): Promise<T | undefined> => {
    const transaction = database.transaction(storeName, 'readonly');
    return requestResult(transaction.objectStore(storeName).get(key));
};

const readAllValues = async <T>(database: IDBDatabase, storeName: StoreName): Promise<T[]> => {
    const transaction = database.transaction(storeName, 'readonly');
    return requestResult(transaction.objectStore(storeName).getAll());
};

const readAllEntries = async <T>(database: IDBDatabase, storeName: StoreName): Promise<Array<[string, T]>> =>
    new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const keysRequest = objectStore.getAllKeys();
        const valuesRequest = objectStore.getAll();
        let keys: IDBValidKey[] | undefined;
        let values: T[] | undefined;
        const finish = () => {
            const currentKeys = keys;
            const currentValues = values;
            if (!currentKeys || !currentValues) return;
            resolve(currentKeys.map((key, index) => [String(key), currentValues[index]]));
        };
        keysRequest.onsuccess = () => {
            keys = keysRequest.result;
            finish();
        };
        valuesRequest.onsuccess = () => {
            values = valuesRequest.result as T[];
            finish();
        };
        transaction.onerror = () => reject(transaction.error ?? new Error('Failed to read IndexedDB entries'));
    });

const runTransaction = (
    database: IDBDatabase,
    storeNames: StoreName[],
    operation: (transaction: IDBTransaction) => void,
): Promise<void> => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, 'readwrite');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    try {
        operation(transaction);
    } catch (error) {
        transaction.abort();
        reject(error);
    }
});

const parseEnvelope = <T>(rawValue: string | null): ParsedLegacy<T> => {
    if (!rawValue) return { kind: 'missing' };
    try {
        const envelope = JSON.parse(rawValue) as PersistedEnvelope<T>;
        if (!envelope || typeof envelope !== 'object' || !('state' in envelope) || envelope.state === undefined) {
            return { kind: 'invalid', reason: 'Persisted data does not contain a state envelope' };
        }
        return { kind: 'valid', state: envelope.state, version: envelope.version ?? 0 };
    } catch {
        return { kind: 'invalid', reason: 'Persisted data is not valid JSON' };
    }
};

const getLegacyValue = async (database: IDBDatabase, name: string): Promise<string | null> => {
    const pendingFallback = getLocalStorage()?.getItem(`${FALLBACK_PREFIX}${name}`);
    if (pendingFallback !== null && pendingFallback !== undefined) return pendingFallback;
    if (database.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        const indexedDbValue = await readValue<string>(database, LEGACY_STORE_NAME, name);
        if (indexedDbValue !== undefined) return indexedDbValue;
    }
    return getLocalStorage()?.getItem(name) ?? null;
};

const uniqueTasks = (state: PersistedTaskState): Task[] => {
    const allTasks = [
        state.currentTask,
        ...(state.taskStack ?? []),
        ...(state.backlogTasks ?? []),
        ...(state.history ?? []),
        ...(state.recurringTasks ?? []),
    ].filter((task): task is Task => task !== null && task !== undefined);
    const tasksById = new Map<string, Task>();
    allTasks.forEach((task) => tasksById.set(task.id, task));
    return [...tasksById.values()];
};

const normalizeTaskState = (state: PersistedTaskState = {}): NormalizedTaskState => ({
    tasks: uniqueTasks(state),
    taskLogs: state.taskLog ?? [],
    backlogCategories: state.backlogCategories ?? [],
    colors: state.colors ?? [],
    lists: {
        current: state.currentTask ? [state.currentTask.id] : [],
        stack: (state.taskStack ?? []).map((task) => task.id),
        backlog: (state.backlogTasks ?? []).map((task) => task.id),
        history: (state.history ?? []).map((task) => task.id),
        recurring: (state.recurringTasks ?? []).map((task) => task.id),
    },
    settings: {
        activeDialog: state.activeDialog ?? null,
        activeMemoTaskId: state.activeMemoTaskId ?? null,
        isMemoMinimized: state.isMemoMinimized ?? false,
        dayStartHour: state.dayStartHour ?? 5,
        missedTaskWindowMinutes: state.missedTaskWindowMinutes ?? 5,
        currentTime: state.currentTime ?? '',
        currentDate: state.currentDate ?? '',
        currentDay: state.currentDay ?? new Date().getDay(),
        dropTarget: state.dropTarget ?? null,
    },
});

const normalizeMemoState = (state: PersistedMemoState = {}): NormalizedMemoState => ({
    memos: state.memos ?? {},
});

const mergeRecordsById = <T extends { id: string }>(older: T[] = [], newer: T[] = []): T[] => {
    const merged = new Map(older.map((record) => [record.id, record]));
    newer.forEach((record) => merged.set(record.id, record));
    return [...merged.values()];
};

const mergeLegacyTaskStates = (older: PersistedTaskState, newer: PersistedTaskState): PersistedTaskState => ({
    ...older,
    ...newer,
    currentTask: newer.currentTask ?? older.currentTask,
    taskStack: mergeRecordsById(older.taskStack, newer.taskStack),
    backlogTasks: mergeRecordsById(older.backlogTasks, newer.backlogTasks),
    backlogCategories: mergeRecordsById(older.backlogCategories, newer.backlogCategories),
    colors: mergeRecordsById(older.colors, newer.colors),
    history: mergeRecordsById(older.history, newer.history),
    recurringTasks: mergeRecordsById(older.recurringTasks, newer.recurringTasks),
    taskLog: mergeRecordsById(older.taskLog, newer.taskLog),
});

const parseLocalRecoveryEnvelope = <T>(name: string): ParsedLegacy<T> =>
    parseEnvelope<T>(getLocalStorage()?.getItem(name) ?? null);

export const getLegacyRecoveryCandidate = (): LegacyRecoveryCandidate | null => {
    const taskSources = [
        parseLocalRecoveryEnvelope<PersistedTaskState>('timetask-storage'),
        parseLocalRecoveryEnvelope<PersistedTaskState>(`${FALLBACK_PREFIX}timetask-storage`),
    ];
    const memoSources = [
        parseLocalRecoveryEnvelope<PersistedMemoState>('timetask-memos'),
        parseLocalRecoveryEnvelope<PersistedMemoState>(`${FALLBACK_PREFIX}timetask-memos`),
    ];

    const taskState = taskSources.reduce<PersistedTaskState>((merged, parsed) => {
        if (parsed.kind !== 'valid') return merged;
        return mergeLegacyTaskStates(merged, migrateLegacyTaskState(parsed.state, parsed.version));
    }, {});
    const memoState = memoSources.reduce<PersistedMemoState>((merged, parsed) => {
        if (parsed.kind !== 'valid') return merged;
        return { memos: { ...(merged.memos ?? {}), ...(parsed.state.memos ?? {}) } };
    }, {});

    const hasTaskData = taskSources.some((parsed) => parsed.kind === 'valid');
    const hasMemoData = memoSources.some((parsed) => parsed.kind === 'valid');
    if (!hasTaskData && !hasMemoData) return null;

    return {
        taskState,
        memoState,
        summary: {
            backlogTasks: taskState.backlogTasks?.length ?? 0,
            backlogCategories: taskState.backlogCategories?.length ?? 0,
            history: taskState.history?.length ?? 0,
            recurringTasks: taskState.recurringTasks?.length ?? 0,
            taskLogs: taskState.taskLog?.length ?? 0,
            memos: Object.keys(memoState.memos ?? {}).length,
        },
    };
};

const LEGACY_DEFAULT_COLORS: ColorDefinition[] = [
    { id: 'color-1', colorCode: 'bg-slate-500', name: 'Default' },
    { id: 'color-2', colorCode: 'bg-red-500', name: 'Urgent' },
    { id: 'color-3', colorCode: 'bg-orange-500', name: 'Orange' },
    { id: 'color-4', colorCode: 'bg-yellow-500', name: 'Yellow' },
    { id: 'color-5', colorCode: 'bg-green-500', name: 'Green' },
    { id: 'color-6', colorCode: 'bg-blue-500', name: 'Blue' },
    { id: 'color-7', colorCode: 'bg-purple-500', name: 'Purple' },
    { id: 'color-8', colorCode: 'bg-pink-500', name: 'Pink' },
];

const migrateLegacyTaskState = (state: PersistedTaskState, version: number): PersistedTaskState => {
    const legacyState = state as PersistedTaskState & { backlog?: Task[] };
    if (version !== 0 && !legacyState.backlog) return state;

    const backlog = legacyState.backlog ?? [];
    return {
        ...state,
        backlogTasks: state.backlogTasks ?? backlog.map((task) => ({ ...task, backlogId: task.backlogId ?? 'main' })),
        backlogCategories: state.backlogCategories ?? [{ id: 'main', name: 'Main Backlog', allocatedMinutes: 0 }],
        colors: state.colors ?? LEGACY_DEFAULT_COLORS,
    };
};

const validateLegacyTaskState = (source: PersistedTaskState, migrated: PersistedTaskState) => {
    const sourceWithLegacyFields = source as PersistedTaskState & { backlog?: Task[] };
    if (sourceWithLegacyFields.backlog && migrated.backlogTasks?.length !== sourceWithLegacyFields.backlog.length) {
        throw new Error('Legacy backlog task count changed during migration');
    }
    if ((source.taskLog?.length ?? 0) !== (migrated.taskLog?.length ?? 0)) {
        throw new Error('Task log count changed during migration');
    }
};

const validateLegacyMemoState = (source: PersistedMemoState, migrated: PersistedMemoState) => {
    if (Object.keys(source.memos ?? {}).length !== Object.keys(migrated.memos ?? {}).length) {
        throw new Error('Memo count changed during migration');
    }
};

const putRecords = <T extends { id: string }>(
    transaction: IDBTransaction,
    storeName: StoreName,
    records: T[],
    previousRecords: T[] | undefined,
) => {
    const objectStore = transaction.objectStore(storeName);
    const currentIds = new Set(records.map((record) => record.id));
    const previousById = new Map((previousRecords ?? []).map((record) => [record.id, record]));
    previousRecords?.forEach((record) => {
        if (!currentIds.has(record.id)) objectStore.delete(record.id);
    });
    records.forEach((record) => {
        if (!areEqual(previousById.get(record.id), record)) objectStore.put(record, record.id);
    });
};

const putMapRecords = (
    transaction: IDBTransaction,
    storeName: StoreName,
    records: Record<string, string>,
    previousRecords: Record<string, string> | undefined,
) => {
    const objectStore = transaction.objectStore(storeName);
    const currentKeys = new Set(Object.keys(records));
    Object.keys(previousRecords ?? {}).forEach((key) => {
        if (!currentKeys.has(key)) objectStore.delete(key);
    });
    Object.entries(records).forEach(([key, value]) => {
        if (previousRecords?.[key] !== value) objectStore.put(value, key);
    });
};

const putLists = (
    transaction: IDBTransaction,
    lists: Record<string, string[]>,
    previousLists?: Record<string, string[]>,
) => {
    const objectStore = transaction.objectStore(STORE.taskLists);
    Object.entries(lists).forEach(([key, value]) => {
        if (!areEqual(previousLists?.[key], value)) objectStore.put(value, key);
    });
};

const clearNewStores = (transaction: IDBTransaction) => {
    Object.values(STORE)
        .filter((storeName) => storeName !== STORE.migrationMeta)
        .forEach((storeName) => transaction.objectStore(storeName).clear());
};

const migrateLegacyData = async (database: IDBDatabase): Promise<void> => {
    const migrationMarker = await readValue<{ schemaVersion?: number; status?: string }>(database, STORE.migrationMeta, 'schema');
    if (migrationMarker?.schemaVersion === MIGRATION_VERSION && migrationMarker.status === 'completed') return;

    const [taskRawValue, memoRawValue] = await Promise.all([
        getLegacyValue(database, 'timetask-storage'),
        getLegacyValue(database, 'timetask-memos'),
    ]);
    const taskParsed = parseEnvelope<PersistedTaskState>(taskRawValue);
    const memoParsed = parseEnvelope<PersistedMemoState>(memoRawValue);
    if (taskParsed.kind === 'invalid') throw new Error(`Task migration failed: ${taskParsed.reason}`);
    if (memoParsed.kind === 'invalid') throw new Error(`Memo migration failed: ${memoParsed.reason}`);

    const taskState = taskParsed.kind === 'valid'
        ? migrateLegacyTaskState(taskParsed.state, taskParsed.version)
        : {};
    const memoState = memoParsed.kind === 'valid' ? memoParsed.state : {};
    if (taskParsed.kind === 'valid') validateLegacyTaskState(taskParsed.state, taskState);
    if (memoParsed.kind === 'valid') validateLegacyMemoState(memoParsed.state, memoState);
    const normalizedTaskState = normalizeTaskState(taskState);
    const normalizedMemoState = normalizeMemoState(memoState);
    const hasLegacyData = taskParsed.kind === 'valid' || memoParsed.kind === 'valid';
    const existingSplitData = (await Promise.all([
        readAllValues<unknown>(database, STORE.tasks),
        readAllValues<unknown>(database, STORE.taskLogs),
        readAllValues<unknown>(database, STORE.memos),
        readAllValues<unknown>(database, STORE.backlogCategories),
        readAllValues<unknown>(database, STORE.colors),
        readAllValues<unknown>(database, STORE.taskLists),
        readAllValues<unknown>(database, STORE.settings),
        readAllValues<unknown>(database, STORE.timeboxes),
    ])).some((records) => records.length > 0);

    await runTransaction(database, [STORE.migrationMeta], (transaction) => {
        transaction.objectStore(STORE.migrationMeta).put({
            schemaVersion: MIGRATION_VERSION,
            status: 'started',
            startedAt: Date.now(),
        }, 'schema');
    });

    await runTransaction(database, [
        STORE.tasks,
        STORE.taskLogs,
        STORE.memos,
        STORE.backlogCategories,
        STORE.colors,
        STORE.taskLists,
        STORE.settings,
        STORE.timeboxes,
        STORE.migrationMeta,
    ], (transaction) => {
        if (hasLegacyData || !existingSplitData) {
            clearNewStores(transaction);
            putRecords(transaction, STORE.tasks, normalizedTaskState.tasks, undefined);
            putRecords(transaction, STORE.taskLogs, normalizedTaskState.taskLogs, undefined);
            putRecords(transaction, STORE.backlogCategories, normalizedTaskState.backlogCategories, undefined);
            putRecords(transaction, STORE.colors, normalizedTaskState.colors, undefined);
            putMapRecords(transaction, STORE.memos, normalizedMemoState.memos, undefined);
            putLists(transaction, normalizedTaskState.lists);
            transaction.objectStore(STORE.settings).put(normalizedTaskState.settings, 'state');
        }
        transaction.objectStore(STORE.migrationMeta).put({
            schemaVersion: MIGRATION_VERSION,
            status: 'completed',
            migratedAt: Date.now(),
            source: hasLegacyData ? 'legacy' : existingSplitData ? 'existing-split' : 'empty',
        }, 'schema');
    });

    getLocalStorage()?.removeItem('timetask-storage');
    getLocalStorage()?.removeItem('timetask-memos');
    getLocalStorage()?.removeItem(`${FALLBACK_PREFIX}timetask-storage`);
    getLocalStorage()?.removeItem(`${FALLBACK_PREFIX}timetask-memos`);
    taskSnapshot = normalizedTaskState;
    memoSnapshot = normalizedMemoState;
};

const resyncPendingFallbacks = async (database: IDBDatabase): Promise<void> => {
    const storage = getLocalStorage();
    if (!storage) return;

    const pendingTaskValue = storage.getItem(`${FALLBACK_PREFIX}timetask-storage`);
    if (pendingTaskValue !== null) {
        const parsed = parseEnvelope<PersistedTaskState>(pendingTaskValue);
        if (parsed.kind === 'valid') {
            await setTaskState(database, pendingTaskValue);
            storage.removeItem(`${FALLBACK_PREFIX}timetask-storage`);
        }
    }

    const pendingMemoValue = storage.getItem(`${FALLBACK_PREFIX}timetask-memos`);
    if (pendingMemoValue !== null) {
        const parsed = parseEnvelope<PersistedMemoState>(pendingMemoValue);
        if (parsed.kind === 'valid') {
            await setMemoState(database, pendingMemoValue);
            storage.removeItem(`${FALLBACK_PREFIX}timetask-memos`);
        }
    }
};

const ensureDatabaseMigrated = async (): Promise<IDBDatabase> => {
    const database = await openDatabase();
    if (!migrationPromise) {
        migrationPromise = migrateLegacyData(database).catch((error) => {
            migrationPromise = undefined;
            throw error;
        });
    }
    await migrationPromise;
    await resyncPendingFallbacks(database);
    return database;
};

const getTaskState = async (database: IDBDatabase): Promise<string> => {
    const [tasks, taskLogs, backlogCategories, colors, lists, settings] = await Promise.all([
        readAllValues<Task>(database, STORE.tasks),
        readAllValues<TaskLogEntry>(database, STORE.taskLogs),
        readAllValues<BacklogCategory>(database, STORE.backlogCategories),
        readAllValues<ColorDefinition>(database, STORE.colors),
        Promise.all(Object.keys(normalizeTaskState().lists).map(async (key) => [
            key,
            await readValue<string[]>(database, STORE.taskLists, key) ?? [],
        ] as const)),
        readValue<Record<string, unknown>>(database, STORE.settings, 'state'),
    ]);
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const listMap = Object.fromEntries(lists);
    const getTasks = (key: string) => (listMap[key] ?? [])
        .map((id) => taskById.get(id))
        .filter((task): task is Task => task !== undefined);
    const currentTask = getTasks('current')[0] ?? null;
    const state: PersistedTaskState = {
        currentTask,
        taskStack: getTasks('stack'),
        backlogTasks: getTasks('backlog'),
        backlogCategories,
        colors,
        history: getTasks('history'),
        recurringTasks: getTasks('recurring'),
        taskLog: taskLogs,
        ...(settings ?? {}),
    };
    taskSnapshot = normalizeTaskState(state);
    return JSON.stringify({ state, version: 1 });
};

const getTimeboxState = async (database: IDBDatabase): Promise<string> => {
    const timeboxes = await readAllValues<Timebox>(database, STORE.timeboxes);
    timeboxSnapshot = timeboxes;
    return JSON.stringify({ state: { timeboxes }, version: 1 });
};

const getMemoState = async (database: IDBDatabase): Promise<string> => {
    const records = await readAllEntries<string>(database, STORE.memos);
    const memos = Object.fromEntries(records);
    memoSnapshot = { memos };
    return JSON.stringify({ state: { memos }, version: 1 });
};

const setTaskState = async (database: IDBDatabase, rawValue: string): Promise<void> => {
    const state = (JSON.parse(rawValue) as PersistedEnvelope<PersistedTaskState>).state ?? {};
    const next = normalizeTaskState(state);
    const previous = taskSnapshot;
    await runTransaction(database, [
        STORE.tasks,
        STORE.taskLogs,
        STORE.backlogCategories,
        STORE.colors,
        STORE.taskLists,
        STORE.settings,
    ], (transaction) => {
        if (!previous) {
            [STORE.tasks, STORE.taskLogs, STORE.backlogCategories, STORE.colors, STORE.taskLists, STORE.settings]
                .forEach((storeName) => transaction.objectStore(storeName).clear());
        }
        putRecords(transaction, STORE.tasks, next.tasks, previous?.tasks);
        putRecords(transaction, STORE.taskLogs, next.taskLogs, previous?.taskLogs);
        putRecords(transaction, STORE.backlogCategories, next.backlogCategories, previous?.backlogCategories);
        putRecords(transaction, STORE.colors, next.colors, previous?.colors);
        putLists(transaction, next.lists, previous?.lists);
        if (!areEqual(next.settings, previous?.settings)) {
            transaction.objectStore(STORE.settings).put(next.settings, 'state');
        }
    });
    taskSnapshot = next;
};

const setMemoState = async (database: IDBDatabase, rawValue: string): Promise<void> => {
    const state = (JSON.parse(rawValue) as PersistedEnvelope<PersistedMemoState>).state ?? {};
    const next = normalizeMemoState(state);
    await runTransaction(database, [STORE.memos], (transaction) => {
        putMapRecords(transaction, STORE.memos, next.memos, memoSnapshot?.memos);
    });
    memoSnapshot = next;
};

const setTimeboxState = async (database: IDBDatabase, rawValue: string): Promise<void> => {
    const state = (JSON.parse(rawValue) as PersistedEnvelope<{ timeboxes?: Timebox[] }>).state ?? {};
    const timeboxes = state.timeboxes ?? [];
    await runTransaction(database, [STORE.timeboxes], (transaction) => {
        putRecords(transaction, STORE.timeboxes, timeboxes, timeboxSnapshot);
    });
    timeboxSnapshot = timeboxes;
};

const fallbackStorage: StateStorage = {
    getItem: (name) => getLocalStorage()?.getItem(`${FALLBACK_PREFIX}${name}`)
        ?? getLocalStorage()?.getItem(name)
        ?? null,
    setItem: (name, value) => getLocalStorage()?.setItem(`${FALLBACK_PREFIX}${name}`, value),
    removeItem: (name) => {
        getLocalStorage()?.removeItem(`${FALLBACK_PREFIX}${name}`);
        getLocalStorage()?.removeItem(name);
    },
};

export const indexedDbStorage: StateStorage = {
    async getItem(name) {
        if (!isIndexedDBAvailable()) {
            initializedStorageNames.add(name);
            return fallbackStorage.getItem(name);
        }
        try {
            const database = await ensureDatabaseMigrated();
            if (name === 'timetask-memos') return await getMemoState(database);
            if (name === 'timetask-timeboxes') return await getTimeboxState(database);
            return await getTaskState(database);
        } catch {
            return fallbackStorage.getItem(name);
        } finally {
            initializedStorageNames.add(name);
        }
    },
    async setItem(name, value) {
        if (!isIndexedDBAvailable()) {
            fallbackStorage.setItem(name, value);
            return;
        }
        // Zustand can publish default state while asynchronous hydration is still reading.
        // Ignoring that write prevents an empty startup snapshot from replacing persisted data.
        if (!initializedStorageNames.has(name)) return;
        try {
            const database = await ensureDatabaseMigrated();
            if (name === 'timetask-memos') await setMemoState(database, value);
            else if (name === 'timetask-timeboxes') await setTimeboxState(database, value);
            else await setTaskState(database, value);
        } catch {
            fallbackStorage.setItem(name, value);
        }
    },
    async removeItem(name) {
        if (!isIndexedDBAvailable()) {
            fallbackStorage.removeItem(name);
            return;
        }
        try {
            const database = await ensureDatabaseMigrated();
            if (name === 'timetask-memos') {
                await runTransaction(database, [STORE.memos], (transaction) => {
                    transaction.objectStore(STORE.memos).clear();
                });
            } else if (name === 'timetask-timeboxes') {
                await runTransaction(database, [STORE.timeboxes], (transaction) => {
                    transaction.objectStore(STORE.timeboxes).clear();
                });
            } else await runTransaction(database, [
                STORE.tasks,
                STORE.taskLogs,
                STORE.backlogCategories,
                STORE.colors,
                STORE.taskLists,
                STORE.settings,
            ], (transaction) => {
                [STORE.tasks, STORE.taskLogs, STORE.backlogCategories, STORE.colors, STORE.taskLists, STORE.settings]
                    .forEach((storeName) => transaction.objectStore(storeName).clear());
            });
        } catch {
            fallbackStorage.removeItem(name);
        }
    },
};

export const getPersistedValue = (name: string) => indexedDbStorage.getItem(name);

/** Test-only reset for the module-level connection and migration state. */
export const resetIndexedDbStorageForTests = () => {
    databaseConnection?.close();
    databaseConnection = undefined;
    databasePromise = undefined;
    migrationPromise = undefined;
    taskSnapshot = undefined;
    memoSnapshot = undefined;
    timeboxSnapshot = undefined;
    initializedStorageNames.clear();
};
