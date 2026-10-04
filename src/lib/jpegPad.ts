/**
 * Raises a JPEG to a minimum file size without touching the picture.
 *
 * Some exam forms demand a minimum size that a small image can't reach —
 * IBPS wants a 140 × 60 px signature of at least 10 KB, while a clean JPEG
 * that small is only ~3 KB even at maximum quality. The standard remedy is a
 * JPEG comment (COM, 0xFFFE) segment: decoders skip it, so the image is
 * pixel-for-pixel identical, and the file simply gets bigger.
 */
const MAX_SEGMENT_DATA = 65533; // 65535 minus the 2 length bytes

export function padJpeg(jpeg: Uint8Array, targetBytes: number): Uint8Array {
  if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('Not a JPEG');
  let need = targetBytes - jpeg.length;
  if (need <= 0) return jpeg;
  const segments: Uint8Array[] = [];
  while (need > 0) {
    // Each segment costs 4 bytes of header; never create one with < 1 byte of data.
    const data = Math.max(1, Math.min(MAX_SEGMENT_DATA, need - 4));
    const seg = new Uint8Array(4 + data);
    seg[0] = 0xff; seg[1] = 0xfe;
    seg[2] = ((data + 2) >> 8) & 0xff; seg[3] = (data + 2) & 0xff;
    seg.fill(0x20, 4); // spaces
    segments.push(seg);
    need -= seg.length;
  }
  const extra = segments.reduce((n, s) => n + s.length, 0);
  const out = new Uint8Array(jpeg.length + extra);
  out.set(jpeg.subarray(0, 2), 0); // SOI
  let o = 2;
  for (const s of segments) { out.set(s, o); o += s.length; }
  out.set(jpeg.subarray(2), o);
  return out;
}
