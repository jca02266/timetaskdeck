import { useState } from 'react';
import { parseTime } from '@/utils/validate';

export interface UseTimeInputResult {
    value: string;
    setValue: (v: string) => void;
    formatted: string | undefined; // 正規化済み "HH:mm"、無効なら undefined
    isValid: boolean;
    reset: (v?: string) => void;
}

/** HH:mm 形式の時刻入力を管理する Hook */
export function useTimeInput(initialValue = ''): UseTimeInputResult {
    const [value, setValue] = useState(initialValue);

    const parsed = parseTime(value);

    return {
        value,
        setValue,
        formatted: parsed?.formatted,
        isValid: parsed !== null,
        reset: (v = '') => setValue(v),
    };
}
