import { addDays } from 'date-fns';

/** 指定した日付の時刻を hours:minutes に設定したタイムスタンプを返す */
export function setTimeOnDate(date: Date, hours: number, minutes: number): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).getTime();
}

/** dayStartHour を考慮して、論理日 logicalDay における hours のカレンダー日付を返す。
 *  hours < dayStartHour の場合は翌カレンダー日（論理日内の深夜帯）。 */
export function calendarDayForTime(logicalDay: Date, hours: number, dayStartHour: number): Date {
    return hours < dayStartHour ? addDays(logicalDay, 1) : logicalDay;
}
