import { describe, it, expect } from 'vitest';
import { parsePageRanges } from '@/lib/pageRanges';

const pages = 6;

describe('parsePageRanges', () => {
  it('parses a single page', () => {
    expect(parsePageRanges('3', pages)).toEqual({ indices: [2] });
  });

  it('parses a range', () => {
    expect(parsePageRanges('2-4', pages)).toEqual({ indices: [1, 2, 3] });
  });

  it('parses a mix of ranges and single pages', () => {
    expect(parsePageRanges('1-3, 5', pages)).toEqual({ indices: [0, 1, 2, 4] });
  });

  it('keeps the order the user listed, not sorted order', () => {
    expect(parsePageRanges('5, 1-3', pages)).toEqual({ indices: [4, 0, 1, 2] });
  });

  it('ignores repeated pages', () => {
    expect(parsePageRanges('2,2,3', pages)).toEqual({ indices: [1, 2] });
  });

  it('tolerates stray whitespace and empty segments', () => {
    expect(parsePageRanges(' 1 ,, 4 - 5 ', pages)).toEqual({ indices: [0, 3, 4] });
  });

  it('accepts the first and last page', () => {
    expect(parsePageRanges('1', pages).indices).toEqual([0]);
    expect(parsePageRanges('6', pages).indices).toEqual([5]);
    expect(parsePageRanges('1-6', pages).indices).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('rejects a page past the end of the document', () => {
    expect(parsePageRanges('9', pages).error).toBe('This PDF only has 6 pages.');
    expect(parsePageRanges('4-9', pages).error).toBe('This PDF only has 6 pages.');
  });

  it('rejects page zero', () => {
    expect(parsePageRanges('0', pages).error).toBe('Pages start at 1.');
  });

  it('rejects a backwards range and suggests the fix', () => {
    expect(parsePageRanges('5-2', pages).error).toContain('write it as 2-5');
  });

  it('rejects nonsense input', () => {
    expect(parsePageRanges('abc', pages).error).toContain('not a page or range');
  });

  it('rejects empty input', () => {
    expect(parsePageRanges('', pages).error).toBe('Enter at least one page or range.');
    expect(parsePageRanges('   ', pages).error).toBe('Enter at least one page or range.');
    expect(parsePageRanges(',,,', pages).error).toBe('Enter at least one page or range.');
  });

  it('uses singular wording for a one-page document', () => {
    expect(parsePageRanges('2', 1).error).toBe('This PDF only has 1 page.');
  });
});
