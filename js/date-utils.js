/**
 * Utility functions for date manipulation and formatting
 * Supported language: Portuguese (PT-BR)
 */

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MONTH_NAMES_SHORT = [
  'JAN.', 'FEV.', 'MAR.', 'ABR.', 'MAI.', 'JUN.',
  'JUL.', 'AGO.', 'SET.', 'OUT.', 'NOV.', 'DEZ.'
];

export const WEEKDAYS_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/**
 * Format a Date object to string (default format: DD/MM/YYYY)
 */
export function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Format a local calendar date as YYYY-MM-DD without UTC conversion. */
export function formatDateISO(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Inclusive range calculations should compare calendar days, not elapsed DST hours. */
export function differenceInCalendarDays(start, end) {
  if (!start || !end) return 0;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.abs(Math.round((endUtc - startUtc) / 86400000));
}

/**
 * Parse string formatted as DD/MM/YYYY into Date object
 */
export function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export function isBeforeDay(d1, d2) {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return date1.getTime() < date2.getTime();
}

export function isAfterDay(d1, d2) {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return date1.getTime() > date2.getTime();
}

export function isBetweenDays(target, start, end) {
  if (!target || !start || !end) return false;
  return (isAfterDay(target, start) || isSameDay(target, start)) &&
         (isBeforeDay(target, end) || isSameDay(target, end));
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function addYears(date, years) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfWeekIndex(year, month) {
  return new Date(year, month, 1).getDay();
}
