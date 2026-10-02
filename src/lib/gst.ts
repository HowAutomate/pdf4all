import { round2 } from '@/lib/money';

export type GstMode = 'exclusive' | 'inclusive';

export interface GstBreakup {
  /** Value before tax. */
  taxable: number;
  /** Total GST at the given rate. */
  gst: number;
  /** Taxable + GST. */
  total: number;
  /** Half of GST each — what an intra-state invoice shows. */
  cgst: number;
  sgst: number;
}

/**
 * exclusive: `amount` is the price before GST — tax is added on top.
 * inclusive: `amount` already contains GST — tax is backed out of it
 *            (taxable = amount × 100 / (100 + rate)).
 *
 * Intra-state: CGST/SGST are each rounded to paise and GST is their sum, so
 * the two halves always add up exactly to the GST line a reader sees.
 * Inter-state: one IGST figure, rounded once (cgst/sgst are reported as 0).
 */
export function calculateGst(amount: number, rate: number, mode: GstMode, interState = false): GstBreakup {
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || amount < 0 || rate < 0) {
    return { taxable: 0, gst: 0, total: 0, cgst: 0, sgst: 0 };
  }
  const taxableRaw = mode === 'exclusive' ? amount : (amount * 100) / (100 + rate);
  const half = interState ? 0 : round2((taxableRaw * rate) / 200);
  const gst = interState ? round2((taxableRaw * rate) / 100) : round2(half * 2);
  if (mode === 'exclusive') {
    const taxable = round2(amount);
    return { taxable, gst, total: round2(taxable + gst), cgst: half, sgst: half };
  }
  // Inclusive: the total is fixed by the user, so taxable absorbs any paise rounding.
  const total = round2(amount);
  return { taxable: round2(total - gst), gst, total, cgst: half, sgst: half };
}
