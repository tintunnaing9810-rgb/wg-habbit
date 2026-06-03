// ICT = UTC+7
export function getIctDate(): Date {
  return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

export function getIctDateString(): string {
  const d = getIctDate();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ISO 8601 week: week 1 = first week containing a Thursday
export function getIsoWeek(dateStr: string): { year: number; week: number } {
  const date = new Date(dateStr + 'T00:00:00Z');
  const dayOfWeek = date.getUTCDay() || 7;
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: thursday.getUTCFullYear(), week };
}

// Count weekday (Mon-Fri) gaps between two date strings (exclusive)
function weekdaysBetween(fromStr: string, toStr: string): number {
  const from = new Date(fromStr + 'T00:00:00Z');
  const to = new Date(toStr + 'T00:00:00Z');
  let count = 0;
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d < to) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

export type StreakUpdate = { newStreak: number; useGrace: boolean };

export function computeStreakUpdate(
  frequency: string,
  currentStreak: number,
  lastLoggedDate: string | null,
  todayStr: string,
  graceUsedThisWeek: boolean,
): StreakUpdate {
  if (!lastLoggedDate) return { newStreak: 1, useGrace: false };

  // x_per_week: streak updated when weekly quota is first met; handled in the log route
  if (frequency === 'x_per_week') return { newStreak: currentStreak, useGrace: false };

  if (frequency === 'weekdays') {
    const missed = weekdaysBetween(lastLoggedDate, todayStr);
    if (missed === 0) return { newStreak: currentStreak + 1, useGrace: false };
    if (missed === 1 && !graceUsedThisWeek) return { newStreak: currentStreak + 1, useGrace: true };
    return { newStreak: 1, useGrace: false };
  }

  // daily
  const start = new Date(lastLoggedDate + 'T00:00:00Z');
  const end = new Date(todayStr + 'T00:00:00Z');
  const daysDiff = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (daysDiff === 1) return { newStreak: currentStreak + 1, useGrace: false };
  if (daysDiff === 2 && !graceUsedThisWeek) return { newStreak: currentStreak + 1, useGrace: true };
  return { newStreak: 1, useGrace: false };
}

// Is a habit due today given frequency?
export function isHabitDueToday(
  frequency: string,
  todayStr: string,
  weeklyCount: number,
  frequencyTarget: number,
): boolean {
  if (frequency === 'daily') return true;
  if (frequency === 'weekdays') {
    const dow = new Date(todayStr + 'T00:00:00Z').getUTCDay();
    return dow !== 0 && dow !== 6;
  }
  if (frequency === 'x_per_week') return weeklyCount < frequencyTarget;
  return true;
}

export function formatFrequency(frequency: string, target: number): string {
  if (frequency === 'daily') return 'Every day';
  if (frequency === 'weekdays') return 'Weekdays';
  return `${target}x per week`;
}

export function formatStreak(streak: number, frequency: string): string {
  if (frequency === 'x_per_week') return `${streak}w`;
  return `${streak}d`;
}
