/**
 * Computes standard ISO-8601 week string anchored to Asia/Kolkata time (UTC+5:30)
 * Format: YYYY-Www (e.g. 2026-W48)
 */
export function getCurrentIsoWeekIST(inputDate: Date = new Date()): string {
  // Convert date to IST (UTC + 5 hours 30 mins)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(inputDate.getTime() + istOffsetMs);

  // Target Thursday in current week according to ISO-8601:
  // Week begins Monday (1), ends Sunday (7)
  const target = new Date(Date.UTC(istTime.getUTCFullYear(), istTime.getUTCMonth(), istTime.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // Thursday of this week

  // First Thursday of year defines Week 1
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);

  // Calculate week number
  const weekDiffMs = target.getTime() - firstThursday.getTime();
  const weekNr = 1 + Math.round(weekDiffMs / (7 * 24 * 60 * 60 * 1000));
  const year = target.getUTCFullYear();

  return `${year}-W${weekNr.toString().padStart(2, '0')}`;
}
