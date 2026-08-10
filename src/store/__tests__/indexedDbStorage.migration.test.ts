import 'fake-indexeddb/auto';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
    INDEXED_DB_NAME,
    indexedDbStorage,
    resetIndexedDbStorageForTests,
} from '@/store/indexedDbStorage';

const openDatabase = (version: number) => new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, version);
    request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('persisted-state')) {
            request.result.createObjectStore('persisted-state');
        }
        if (version >= 2) {
            ['tasks', 'task-logs', 'memos', 'backlog-categories', 'colors', 'task-lists', 'settings', 'migration-meta']
                .forEach((storeName) => {
                    if (!request.result.objectStoreNames.contains(storeName)) {
                        request.result.createObjectStore(storeName);
                    }
                });
        }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(INDEXED_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
});

const putLegacyValue = async (name: string, value: unknown, version = 1) => {
    const database = await openDatabase(version);
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('persisted-state', 'readwrite');
        transaction.objectStore('persisted-state').put(JSON.stringify(value), name);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
    database.close();
};

const readStoreValue = async <T>(storeName: string, key: string): Promise<T | undefined> => {
    const database = await openDatabase(2);
    return new Promise<T | undefined>((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly');
        const request = transaction.objectStore(storeName).get(key);
        request.onsuccess = () => {
            database.close();
            resolve(request.result as T | undefined);
        };
        request.onerror = () => reject(request.error);
    });
};

const taskEnvelope = (state: Record<string, unknown>, version = 1) => ({ state, version });

describe('indexedDbStorage migration', () => {
    beforeEach(async () => {
        resetIndexedDbStorageForTests();
        localStorage.clear();
        await deleteDatabase();
    });

    afterEach(() => {
        resetIndexedDbStorageForTests();
    });

    it('migrates localStorage-only data and removes legacy keys after success', async () => {
        localStorage.setItem('timetask-storage', JSON.stringify(taskEnvelope({
            backlogTasks: [{ id: 'task-1', name: 'Task', startTime: 1, duration: 0, status: 'pending' }],
            backlogCategories: [{ id: 'main', name: 'Main', allocatedMinutes: 0 }],
            taskLog: [],
        })));
        localStorage.setItem('timetask-memos', JSON.stringify(taskEnvelope({ memos: { 'task-1': 'Memo' } })));

        const rawTasks = await indexedDbStorage.getItem('timetask-storage');
        const rawMemos = await indexedDbStorage.getItem('timetask-memos');

        expect(JSON.parse(rawTasks ?? '{}').state.backlogTasks).toHaveLength(1);
        expect(JSON.parse(rawMemos ?? '{}').state.memos).toEqual({ 'task-1': 'Memo' });
        expect(localStorage.getItem('timetask-storage')).toBeNull();
        expect(localStorage.getItem('timetask-memos')).toBeNull();
        expect(await readStoreValue('migration-meta', 'schema')).toMatchObject({
            schemaVersion: 2,
            status: 'completed',
        });
    });

    it('migrates the legacy IndexedDB JSON format before localStorage', async () => {
        await putLegacyValue('timetask-storage', taskEnvelope({
            backlogTasks: [{ id: 'idb-task', name: 'IndexedDB task', startTime: 1, duration: 0, status: 'pending' }],
            backlogCategories: [{ id: 'main', name: 'Main', allocatedMinutes: 0 }],
            taskLog: [],
        }));
        localStorage.setItem('timetask-storage', JSON.stringify(taskEnvelope({
            backlogTasks: [{ id: 'local-task', name: 'Local task', startTime: 1, duration: 0, status: 'pending' }],
            taskLog: [],
        })));

        const rawTasks = await indexedDbStorage.getItem('timetask-storage');

        expect(JSON.parse(rawTasks ?? '{}').state.backlogTasks[0].id).toBe('idb-task');
        expect(localStorage.getItem('timetask-storage')).toBeNull();
    });

    it('converts the old version 0 backlog field', async () => {
        await putLegacyValue('timetask-storage', taskEnvelope({
            backlog: [{ id: 'old-task', name: 'Old task', startTime: 1, duration: 0, status: 'pending' }],
            taskLog: [],
        }, 0));

        const rawTasks = await indexedDbStorage.getItem('timetask-storage');
        const state = JSON.parse(rawTasks ?? '{}').state;

        expect(state.backlogTasks).toHaveLength(1);
        expect(state.backlogTasks[0].backlogId).toBe('main');
        expect(state.backlogCategories).toEqual([
            { id: 'main', name: 'Main Backlog', allocatedMinutes: 0 },
        ]);
    });

    it('does not mark migration complete or delete corrupted localStorage', async () => {
        localStorage.setItem('timetask-storage', '{broken json');

        const rawTasks = await indexedDbStorage.getItem('timetask-storage');

        expect(rawTasks).toBe('{broken json');
        expect(localStorage.getItem('timetask-storage')).toBe('{broken json');
        expect(await readStoreValue('migration-meta', 'schema')).toBeUndefined();
    });

    it('does not clear existing split data when no legacy source exists', async () => {
        const database = await openDatabase(2);
        await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction('tasks', 'readwrite');
            transaction.objectStore('tasks').put({ id: 'existing', name: 'Existing' }, 'existing');
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
        database.close();

        const rawTasks = await indexedDbStorage.getItem('timetask-storage');

        expect(JSON.parse(rawTasks ?? '{}').state.backlogTasks).toEqual([]);
        expect(await readStoreValue('tasks', 'existing')).toEqual({ id: 'existing', name: 'Existing' });
    });

    it('resynchronizes pending localStorage fallback data', async () => {
        await indexedDbStorage.getItem('timetask-storage');
        localStorage.setItem('timetask-fallback-timetask-storage', JSON.stringify(taskEnvelope({
            backlogTasks: [{ id: 'pending-task', name: 'Pending task', startTime: 1, duration: 0, status: 'pending' }],
            taskLog: [],
        })));

        const rawTasks = await indexedDbStorage.getItem('timetask-storage');

        expect(JSON.parse(rawTasks ?? '{}').state.backlogTasks[0].id).toBe('pending-task');
        expect(localStorage.getItem('timetask-fallback-timetask-storage')).toBeNull();
    });

    it('is idempotent when migration is run again', async () => {
        localStorage.setItem('timetask-storage', JSON.stringify(taskEnvelope({
            backlogTasks: [{ id: 'task-1', name: 'Task', startTime: 1, duration: 0, status: 'pending' }],
            taskLog: [],
        })));

        const first = JSON.parse((await indexedDbStorage.getItem('timetask-storage')) ?? '{}');
        resetIndexedDbStorageForTests();
        const second = JSON.parse((await indexedDbStorage.getItem('timetask-storage')) ?? '{}');

        expect(second.state.backlogTasks).toEqual(first.state.backlogTasks);
        expect(await readStoreValue('migration-meta', 'schema')).toMatchObject({ status: 'completed' });
    });
});
