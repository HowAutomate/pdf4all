import { describe, it, expect } from 'vitest';
import { amountInWords, numberToIndianWords, inr } from '@/lib/money';
import { calculateGst } from '@/lib/gst';
import { monthsBetween, formatDate } from '@/lib/rentReceipt';

describe('amountInWords', () => {
  it('uses the Indian lakh/crore system', () => {
    expect(numberToIndianWords(12345678)).toBe('One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight');
  });
  it('handles paise without float drift', () => {
    expect(amountInWords(1180.29)).toBe('One Thousand One Hundred Eighty Rupees and Twenty Nine Paise Only');
    expect(amountInWords(15000)).toBe('Fifteen Thousand Rupees Only');
  });
  it('handles amounts of 100 crore and above', () => {
    expect(numberToIndianWords(1000000000)).toBe('One Hundred Crore');
  });
  it('formats rupees Indian style', () => {
    expect(inr(123456.7)).toBe('1,23,456.70');
  });
});

describe('calculateGst', () => {
  it('adds GST on top (exclusive)', () => {
    expect(calculateGst(1000, 18, 'exclusive')).toEqual({ taxable: 1000, gst: 180, total: 1180, cgst: 90, sgst: 90 });
  });
  it('backs GST out of an inclusive price', () => {
    expect(calculateGst(1180, 18, 'inclusive')).toEqual({ taxable: 1000, gst: 180, total: 1180, cgst: 90, sgst: 90 });
  });
  it('keeps halves summing to the GST line when paise are odd', () => {
    const r = calculateGst(999, 5, 'inclusive');
    expect(r.cgst + r.sgst).toBeCloseTo(r.gst, 10);
    expect(r.taxable + r.gst).toBeCloseTo(999, 10);
  });
  it('rounds IGST once instead of as two halves', () => {
    expect(calculateGst(1180, 5, 'inclusive', true)).toEqual({ taxable: 1123.81, gst: 56.19, total: 1180, cgst: 0, sgst: 0 });
    expect(calculateGst(1180, 5, 'inclusive').gst).toBe(56.2);
  });
  it('returns zeros for bad input', () => {
    expect(calculateGst(-5, 18, 'exclusive').total).toBe(0);
    expect(calculateGst(NaN, 18, 'exclusive').total).toBe(0);
  });
});

describe('monthsBetween', () => {
  it('spans a financial year', () => {
    const r = monthsBetween('2026-04', '2027-03', 1);
    expect(r).toHaveLength(12);
    expect(r[0]).toEqual({ key: '2026-04', label: 'April 2026', date: '2026-04-01' });
    expect(r[11].label).toBe('March 2027');
  });
  it('clamps the receipt day to the month length', () => {
    const r = monthsBetween('2027-02', '2027-04', 31);
    expect(r.map(p => p.date)).toEqual(['2027-02-28', '2027-03-31', '2027-04-30']);
  });
  it('is empty for a reversed or malformed range', () => {
    expect(monthsBetween('2026-05', '2026-04', 1)).toEqual([]);
    expect(monthsBetween('', '2026-04', 1)).toEqual([]);
  });
  it('caps at 24 months', () => {
    expect(monthsBetween('2020-01', '2030-01', 1)).toHaveLength(24);
  });
  it('formats dates without timezone shifts', () => {
    expect(formatDate('2026-04-05')).toBe('05 Apr 2026');
  });
});
