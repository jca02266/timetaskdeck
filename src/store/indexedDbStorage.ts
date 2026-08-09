import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'timetask-db';
const STORE_NAME = 'persisted-state';
const DB_VERSION = 1;

let databasePromise: Promise<IDBDatabase> | undefined;

const isIndexedDBAvailable = () =>
    typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const openDatabase = (): Promise<IDBDatabase> => {
    if (!isIndexedDBAvailable()) {
        return Promise.reject(new Error('IndexedDB is not available'));
    }

    if (!databasePromise) {
        databasePromise = new Promise((resolve, reject) => {
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                request.result.createObjectStore(STORE_NAME);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
        });
    }

    return databasePromise;
};

const readFromIndexedDB = async (name: string): Promise<string | null> => {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(name);
        request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
        request.onerror = () => reject(request.error ?? new Error('Failed to read IndexedDB'));
    });
};

const writeToIndexedDB = async (name: string, value: string): Promise<void> => {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(value, name);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Failed to write IndexedDB'));
    });
};

const removeFromIndexedDB = async (name: string): Promise<void> => {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(name);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Failed to delete from IndexedDB'));
    });
};

/** Zustand storage backed by IndexedDB, with localStorage migration fallback. */
export const indexedDbStorage: StateStorage = {
    async getItem(name) {
        try {
            const storedValue = await readFromIndexedDB(name);
            if (storedValue !== null) return storedValue;

            const legacyValue = window.localStorage.getItem(name);
            if (legacyValue !== null) await writeToIndexedDB(name, legacyValue);
            return legacyValue;
        } catch {
            return typeof localStorage === 'undefined' ? null : localStorage.getItem(name);
        }
    },
    async setItem(name, value) {
        try {
            await writeToIndexedDB(name, value);
        } catch {
            if (typeof localStorage !== 'undefined') localStorage.setItem(name, value);
        }
    },
    async removeItem(name) {
        try {
            await removeFromIndexedDB(name);
        } catch {
            if (typeof localStorage !== 'undefined') localStorage.removeItem(name);
        }
    },
};

export const getPersistedValue = (name: string) => indexedDbStorage.getItem(name);
