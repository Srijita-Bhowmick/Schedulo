import { TimeSlotConfig, DayOfWeek, BreakSlot } from '../types';

export const ALL_DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Calculates start and end time strings for a given period index
 */
export function getPeriodTiming(
  periodIndex: number,
  config: TimeSlotConfig
): { start: string; end: string; label: string; isBreakBefore: boolean; breakBeforeName?: string } {
  const [startHourStr, startMinStr] = config.startTime.split(':');
  let currentMinutes = parseInt(startHourStr, 10) * 60 + parseInt(startMinStr, 10);
  let isBreakBefore = false;
  let breakBeforeName: string | undefined;

  for (let p = 0; p <= periodIndex; p++) {
    // Check if there was a break after period p
    const breakAfter = config.breakSlots.find((b) => b.afterPeriod === p);
    if (p > 0 && breakAfter) {
      if (p === periodIndex) {
        isBreakBefore = true;
        breakBeforeName = breakAfter.name;
      }
      currentMinutes += breakAfter.durationMinutes;
    }

    if (p === periodIndex) {
      const start = formatMinutesToTime(currentMinutes);
      const end = formatMinutesToTime(currentMinutes + config.periodDurationMinutes);
      return {
        start,
        end,
        label: `${start} - ${end}`,
        isBreakBefore,
        breakBeforeName,
      };
    }

    currentMinutes += config.periodDurationMinutes;
  }

  const start = formatMinutesToTime(currentMinutes);
  const end = formatMinutesToTime(currentMinutes + config.periodDurationMinutes);
  return {
    start,
    end,
    label: `${start} - ${end}`,
    isBreakBefore: false,
  };
}

export function formatMinutesToTime(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const padMin = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const padHour = hours24 < 10 ? `0${hours24}` : `${hours24}`;
  return `${padHour}:${padMin}`;
}

export function format12Hour(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

/**
 * Checks if placing a multi-slot event at `startPeriodIndex` with length `durationSlots`
 * would cross a designated break (e.g. Lunch break) or exceed periodsPerDay.
 */
export function isValidConsecutiveBlock(
  startPeriodIndex: number,
  durationSlots: number,
  config: TimeSlotConfig
): boolean {
  if (startPeriodIndex + durationSlots > config.periodsPerDay) {
    return false;
  }

  // Check if any break falls strictly INSIDE the block (i.e. after startPeriodIndex, startPeriodIndex + 1, ..., up to startPeriodIndex + durationSlots - 2)
  for (let offset = 0; offset < durationSlots - 1; offset++) {
    const periodNum = startPeriodIndex + offset + 1; // 1-indexed period number
    const breakSlot = config.breakSlots.find((b) => b.afterPeriod === periodNum);
    // If there's a long break (like lunch, > 20 min) or any break that splits the lab session
    if (breakSlot && breakSlot.durationMinutes >= 30) {
      return false;
    }
  }

  return true;
}
