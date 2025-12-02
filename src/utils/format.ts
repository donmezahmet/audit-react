import { format, formatDistance, formatRelative, parseISO } from 'date-fns';

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date, formatStr: string = 'PPP'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format date relative to now (e.g., "2 hours ago")
 */
export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

/**
 * Format date relative with specific context (e.g., "yesterday at 4:30 PM")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatRelative(dateObj, new Date());
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert snake_case to Title Case
 */
export function toTitleCase(text: string): string {
  return text
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Format financial impact (Euro)
 * Examples: "74.36K €", "3K €", "1.25M €", "2M €", "500 €"
 * Note: .00 decimals are hidden (3K € instead of 3.00K €)
 */
export function formatFinancialImpact(value: number): string {
  if (!value || isNaN(value)) return '0 €';
  
  const num = parseFloat(value.toString());
  
  if (num >= 1000000) {
    // Million format: 1.25M € veya 2M € (eğer .00 ise)
    const millions = num / 1000000;
    // Eğer tam sayı ise .00 gösterme
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2);
    return `${formatted}M €`;
  } else if (num >= 1000) {
    // Thousand format: 74.36K € veya 3K € (eğer .00 ise)
    const thousands = num / 1000;
    // Eğer tam sayı ise .00 gösterme
    const formatted = thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(2);
    return `${formatted}K €`;
  } else {
    // Small values: 500 €
    return `${num.toFixed(0)} €`;
  }
}

