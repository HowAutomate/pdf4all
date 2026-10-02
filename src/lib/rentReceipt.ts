export interface ReceiptPeriod {
  /** "2026-04" */
  key: string;
  /** "April 2026" */
  label: string;
  /** Receipt date for that month, "2026-04-05". */
  date: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * One entry per month from `from` to `to` inclusive (both "YYYY-MM").
 * `day` is the receipt day of month; it is clamped to the month's length, so
 * day 31 lands on 30 April and 28/29 February. Empty when the range is
 * reversed or malformed. Capped at 24 months to keep the print sane.
 */
export function monthsBetween(from: string, to: string, day: number): ReceiptPeriod[] {
  const m1 = /^(\d{4})-(\d{2})$/.exec(from);
  const m2 = /^(\d{4})-(\d{2})$/.exec(to);
  if (!m1 || !m2) return [];
  let y = Number(m1[1]);
  let m = Number(m1[2]);
  const endY = Number(m2[1]);
  const endM = Number(m2[2]);
  const out: ReceiptPeriod[] = [];
  while ((y < endY || (y === endY && m <= endM)) && out.length < 24) {
    const daysInMonth = new Date(y, m, 0).getDate();
    const d = Math.min(Math.max(1, Math.floor(day) || 1), daysInMonth);
    out.push({ key: `${y}-${pad(m)}`, label: `${MONTHS[m - 1]} ${y}`, date: `${y}-${pad(m)}-${pad(d)}` });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** "2026-04-05" → "05 Apr 2026" without going through a JS Date (no timezone shift). */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]} ${MONTHS[Number(m[2]) - 1].slice(0, 3)} ${m[1]}`;
}

/** The landlord's PAN is needed for the HRA claim once yearly rent crosses ₹1 lakh. */
export const PAN_THRESHOLD_ANNUAL = 100000;
