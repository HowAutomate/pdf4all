export interface ParsedRanges {
  /** Zero-based page indices, in the order the user listed them, deduplicated. */
  indices: number[];
  /** Human-readable reason the input was rejected, if it was. */
  error?: string;
}

/**
 * Parses a page selection like "1-3, 7, 10-12" into zero-based page indices.
 *
 * Returns an error string rather than throwing, so the UI can show it live as
 * the user types. Pages are kept in the order given ("5, 1-3" → 5, 1, 2, 3)
 * and repeats are ignored.
 */
export function parsePageRanges(input: string, pageCount: number): ParsedRanges {
  const trimmed = input.trim();
  if (!trimmed) return { indices: [], error: 'Enter at least one page or range.' };

  const seen = new Set<number>();
  const order: number[] = [];

  for (const chunk of trimmed.split(',')) {
    const part = chunk.trim();
    if (!part) continue;

    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    const single = part.match(/^(\d+)$/);

    let start: number;
    let end: number;
    if (range) {
      start = Number(range[1]);
      end = Number(range[2]);
    } else if (single) {
      start = end = Number(single[1]);
    } else {
      return { indices: [], error: `"${part}" is not a page or range. Use formats like 3 or 5-9.` };
    }

    if (start < 1 || end < 1) return { indices: [], error: 'Pages start at 1.' };
    if (start > pageCount || end > pageCount) {
      return { indices: [], error: `This PDF only has ${pageCount} page${pageCount === 1 ? '' : 's'}.` };
    }
    if (start > end) return { indices: [], error: `"${part}" runs backwards — write it as ${end}-${start}.` };

    for (let p = start; p <= end; p++) {
      if (!seen.has(p)) { seen.add(p); order.push(p - 1); }
    }
  }

  if (!order.length) return { indices: [], error: 'Enter at least one page or range.' };
  return { indices: order };
}
