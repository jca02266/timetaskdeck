export interface ParsedTime {
    hours: number;
    minutes: number;
    formatted: string; // "HH:mm"
}

/** "HH:mm" 形式の文字列を安全にパースする。不正な値は null を返す */
export function parseTime(value: string): ParsedTime | null {
    if (!value) return null;
    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours > 23 || minutes > 59) return null;
    return {
        hours,
        minutes,
        formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    };
}

/** "YYYY-MM-DD" 形式の文字列を検証する */
export function parseDate(value: string): string | null {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return value;
}

export interface ImportedState {
    tasks?: { state: unknown };
    memos?: { state: unknown };
}

/** JSON importデータの構造を検証する */
export function validateImportData(json: unknown): ImportedState | null {
    if (typeof json !== 'object' || json === null) return null;
    const obj = json as Record<string, unknown>;
    const hasNewFormat =
        (obj.tasks != null && typeof obj.tasks === 'object') ||
        (obj.memos != null && typeof obj.memos === 'object');
    if (hasNewFormat || typeof obj.currentTask !== 'undefined' || Array.isArray(obj.backlogTasks)) {
        return obj as ImportedState;
    }
    return null;
}
