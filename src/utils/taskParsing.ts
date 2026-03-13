/**
 * Utility for parsing task input strings and clipboard data.
 */

interface ParsedTask {
    name: string;
    memo?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    scheduledDaysOfWeek?: number[];
}

/**
 * Handle clipboard data to extract title and URL if it's a link.
 */
export function getSmartPasteText(clipboardData: DataTransfer): string {
    const html = clipboardData.getData('text/html');
    if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const anchor = doc.querySelector('a');
        if (anchor && anchor.href) {
            const title = anchor.textContent?.trim() || anchor.href;
            return `${title}\n${anchor.href}`;
        }
    }
    return clipboardData.getData('text/plain');
}

/**
 * Extract schedule information from the beginning of a task name.
 * Supports:
 * - Time: 13:00, 9:30, 13時00分
 * - Date: 3/14, 2024/03/14, 3月14日
 * - Days: 月火水, Mon,Tue (Only if specific mode is set)
 */
export function parseTaskInput(input: string, mode: 'backlog' | 'recurring' | 'current'): ParsedTask {
    const lines = input.split('\n');
    let titleLine = lines[0].trim();
    const memo = lines.slice(1).join('\n').trim();

    let scheduledDate: string | undefined;
    let scheduledTime: string | undefined;
    let scheduledDaysOfWeek: number[] | undefined;

    // 1. Extract Time (HH:mm or HH時mm分)
    const timeRegex = /(?:^|\s)(\d{1,2})[:：時](\d{1,2})(?:分)?(?:\s|$)/;
    const timeMatch = titleLine.match(timeRegex);
    if (timeMatch) {
        const hh = timeMatch[1].padStart(2, '0');
        const mm = timeMatch[2].padStart(2, '0');
        scheduledTime = `${hh}:${mm}`;
        titleLine = titleLine.replace(timeMatch[0], ' ').trim();
    }

    // 2. Extract Date (YYYY/MM/DD, MM/DD, MM月DD日)
    const dateRegex = /(?:^|\s)(?:(\d{4})[-/])?(\d{1,2})[-/月](\d{1,2})日?(?:\s|$)/;
    const dateMatch = titleLine.match(dateRegex);
    if (dateMatch) {
        const year = dateMatch[1] || new Date().getFullYear().toString();
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        scheduledDate = `${year}-${month}-${day}`;
        titleLine = titleLine.replace(dateMatch[0], ' ').trim();
    }

    // 3. Extract Days (Only for recurring or backlog depending on use case)
    if (mode === 'recurring') {
        const jpDaysMatch = titleLine.match(/(?:^|\s)([月火水木金土日]+)(?:\s|$)/);
        if (jpDaysMatch) {
            const dayMap: Record<string, number> = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
            const days = Array.from(jpDaysMatch[1]).map(d => dayMap[d]);
            scheduledDaysOfWeek = Array.from(new Set(days)).sort();
            titleLine = titleLine.replace(jpDaysMatch[0], ' ').trim();
        }
    }

    return {
        name: titleLine || 'New Task',
        memo: memo || undefined,
        scheduledDate,
        scheduledTime,
        scheduledDaysOfWeek
    };
}
