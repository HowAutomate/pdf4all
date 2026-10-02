/**
 * A small, strict reader for PDF page content streams — the list of drawing
 * instructions ("operators") that paint a page, e.g.
 *   BT /F1 12 Tf 50 700 Td (Hello) Tj ET
 *
 * It keeps the byte range of every operator (including its operands), so an
 * edit can cut one operator out and leave every other byte of the page exactly
 * as it was.
 */

export type Operand =
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'str'; v: Uint8Array }
  | { t: 'arr'; v: Operand[] }
  | { t: 'dict' }
  | { t: 'bool'; v: boolean }
  | { t: 'null' };

export interface ContentOp {
  op: string;
  args: Operand[];
  /** Byte offset where the first operand (or the operator itself) starts. */
  start: number;
  /** Byte offset just past the operator keyword. */
  end: number;
}

const WS = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIM = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);
const isRegular = (c: number) => !WS.has(c) && !DELIM.has(c);

export class ContentParseError extends Error {}

export function parseContentStream(b: Uint8Array): ContentOp[] {
  let i = 0;
  const n = b.length;
  const ops: ContentOp[] = [];

  const skipWs = () => {
    while (i < n) {
      const c = b[i];
      if (WS.has(c)) { i++; continue; }
      if (c === 0x25) { while (i < n && b[i] !== 0x0a && b[i] !== 0x0d) i++; continue; } // % comment
      break;
    }
  };

  const readLiteral = (): Uint8Array => {
    i++; // (
    const out: number[] = [];
    let depth = 1;
    while (i < n) {
      const c = b[i++];
      if (c === 0x5c) { // backslash
        const e = b[i++];
        if (e === 0x6e) out.push(0x0a);
        else if (e === 0x72) out.push(0x0d);
        else if (e === 0x74) out.push(0x09);
        else if (e === 0x62) out.push(0x08);
        else if (e === 0x66) out.push(0x0c);
        else if (e === 0x0d) { if (b[i] === 0x0a) i++; }
        else if (e === 0x0a) { /* line continuation */ }
        else if (e >= 0x30 && e <= 0x37) {
          let v = e - 0x30;
          for (let k = 0; k < 2 && b[i] >= 0x30 && b[i] <= 0x37; k++) v = v * 8 + (b[i++] - 0x30);
          out.push(v & 0xff);
        } else out.push(e);
        continue;
      }
      if (c === 0x28) depth++;
      else if (c === 0x29 && --depth === 0) return new Uint8Array(out);
      out.push(c);
    }
    throw new ContentParseError('Unterminated string');
  };

  const readHex = (): Uint8Array => {
    i++; // <
    const digits: number[] = [];
    while (i < n && b[i] !== 0x3e) {
      const c = b[i++];
      if (WS.has(c)) continue;
      const v = c <= 0x39 ? c - 0x30 : (c | 0x20) - 0x57;
      if (v < 0 || v > 15) throw new ContentParseError('Bad hex string');
      digits.push(v);
    }
    i++; // >
    if (digits.length % 2) digits.push(0);
    const out = new Uint8Array(digits.length / 2);
    for (let k = 0; k < out.length; k++) out[k] = digits[2 * k] * 16 + digits[2 * k + 1];
    return out;
  };

  const readName = (): string => {
    i++; // /
    let s = '';
    while (i < n && isRegular(b[i])) {
      if (b[i] === 0x23 && i + 2 < n) { // #xx escape
        s += String.fromCharCode(parseInt(String.fromCharCode(b[i + 1], b[i + 2]), 16));
        i += 3;
      } else s += String.fromCharCode(b[i++]);
    }
    return s;
  };

  const readWord = (): string => {
    let s = '';
    while (i < n && isRegular(b[i])) s += String.fromCharCode(b[i++]);
    return s;
  };

  // Reads one operand; returns null when the next token is an operator keyword.
  const readOperand = (): Operand | null => {
    skipWs();
    const c = b[i];
    if (c === 0x28) return { t: 'str', v: readLiteral() };
    if (c === 0x3c) {
      if (b[i + 1] === 0x3c) { skipDict(); return { t: 'dict' }; }
      return { t: 'str', v: readHex() };
    }
    if (c === 0x2f) return { t: 'name', v: readName() };
    if (c === 0x5b) {
      i++;
      const arr: Operand[] = [];
      for (;;) {
        skipWs();
        if (i >= n) throw new ContentParseError('Unterminated array');
        if (b[i] === 0x5d) { i++; break; }
        const v = readOperand();
        if (!v) throw new ContentParseError('Operator inside array');
        arr.push(v);
      }
      return { t: 'arr', v: arr };
    }
    if ((c >= 0x30 && c <= 0x39) || c === 0x2b || c === 0x2d || c === 0x2e) {
      const w = readWord();
      const v = Number(w);
      if (!Number.isFinite(v)) throw new ContentParseError(`Bad number ${w}`);
      return { t: 'num', v };
    }
    const save = i;
    const w = readWord();
    if (w === 'true' || w === 'false') return { t: 'bool', v: w === 'true' };
    if (w === 'null') return { t: 'null' };
    i = save;
    return null;
  };

  const skipDict = () => {
    i += 2; // <<
    for (;;) {
      skipWs();
      if (i >= n) throw new ContentParseError('Unterminated dictionary');
      if (b[i] === 0x3e && b[i + 1] === 0x3e) { i += 2; return; }
      if (!readOperand()) readWord(); // tolerate stray keywords
    }
  };

  for (;;) {
    skipWs();
    if (i >= n) break;
    const start = i;
    const args: Operand[] = [];
    for (;;) {
      const v = readOperand();
      if (!v) break;
      args.push(v);
      skipWs();
      if (i >= n) break;
    }
    if (i >= n) break; // trailing operands with no operator — ignore
    const op = readWord();
    if (!op) throw new ContentParseError(`Unexpected byte ${b[i]} at ${i}`);

    if (op === 'BI') {
      // Inline image: key/value pairs, then ID, one whitespace byte, binary
      // data, then EI. The binary part can contain anything, so it is skipped
      // by looking for whitespace + "EI" + whitespace/end.
      for (;;) {
        skipWs();
        const save = i;
        const w = readWord();
        if (w === 'ID') break;
        i = save;
        if (!readOperand()) throw new ContentParseError('Bad inline image');
      }
      i++; // single whitespace after ID
      while (i < n && !(WS.has(b[i]) && b[i + 1] === 0x45 && b[i + 2] === 0x49 && (i + 3 >= n || WS.has(b[i + 3]) || DELIM.has(b[i + 3])))) i++;
      i += 3;
      ops.push({ op: 'BI', args: [], start, end: Math.min(i, n) });
      continue;
    }
    ops.push({ op, args, start, end: i });
  }
  return ops;
}
