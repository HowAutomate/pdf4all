import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import { Trash2, GripVertical, Minus, Plus, RotateCcw } from 'lucide-react';
import { groupTextRuns, type RawTextItem, type TextRun } from '@/lib/pdfEdit/textRuns';
import { matchFont, cssFontFor, type FontMatch, type FontFamily } from '@/lib/pdfEdit/fontMatch';
import { sampleColors, rgbToCss } from '@/lib/pdfEdit/sampleColors';
import type { RGB } from '@/lib/pdfEdit/applyEdits';

export type Tool = 'edit' | 'text' | 'whiteout' | 'highlight' | 'sign' | 'image';

export interface RunInfo extends TextRun { font: FontMatch }
export interface RunEdit { text: string; color: RGB; background: RGB }

/** Something the user added. x/y/w/h are page points, top-left origin, as the reader sees the page. */
export interface PageObject {
  id: string;
  page: number;
  kind: 'text' | 'whiteout' | 'highlight' | 'image';
  x: number; y: number; w: number; h: number;
  text?: string;
  fontSize?: number;
  family?: FontFamily;
  color?: string;
  src?: string;
}

export interface PendingImage { dataUrl: string; width: number; height: number }

interface Props {
  page: PDFPageProxy;
  index: number;
  displayWidth: number;
  tool: Tool;
  runs: RunInfo[] | undefined;
  onRuns: (index: number, runs: RunInfo[]) => void;
  runEdits: Record<string, RunEdit>;
  onRunEdit: (key: string, edit: RunEdit | null) => void;
  objects: PageObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (obj: Omit<PageObject, 'id'>) => string;
  onUpdate: (id: string, patch: Partial<PageObject>) => void;
  onDelete: (id: string) => void;
  pending: PendingImage | null;
  onPlacePending: (page: number, x: number, y: number) => void;
}

/** Where the first baseline sits inside a line box of height 1.2em, per family (see EditPdf save). */
export const BASELINE_EM: Record<FontFamily, number> = { sans: 0.95, serif: 0.94, mono: 0.87 };
export const LINE_HEIGHT = 1.2;

export const runKey = (page: number, runId: string) => `${page}:${runId}`;

export function PageView(props: Props) {
  const { page, index, displayWidth, tool, runs, onRuns, runEdits, onRunEdit, objects, selectedId, onSelect, onAdd, onUpdate, onDelete, pending, onPlacePending } = props;
  const base = page.getViewport({ scale: 1 });
  const scale = displayWidth / base.width;
  const vp = page.getViewport({ scale });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(index < 2);
  const [rendered, setRendered] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraftState] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  // Mirrors `draft` synchronously: pointer events can arrive faster than React re-renders.
  const draftRef = useRef<typeof draft>(null);
  const setDraft = (d: typeof draft) => { draftRef.current = d; setDraftState(d); };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Text on a page with /Rotate is sideways in its own coordinates; editing it
  // in place needs rotated overlays, which this first version doesn't do.
  const canEditRuns = base.rotation % 360 === 0;

  // Render only pages near the viewport — long PDFs stay responsive.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current!;
    const renderVp = page.getViewport({ scale: scale * dpr });
    canvas.width = Math.floor(renderVp.width);
    canvas.height = Math.floor(renderVp.height);
    const task = page.render({ canvasContext: canvas.getContext('2d')!, viewport: renderVp });
    let cancelled = false;
    task.promise.then(async () => {
      if (cancelled) return;
      setRendered(true);
      if (runs) return;
      const content = await page.getTextContent();
      const grouped = groupTextRuns(content.items as RawTextItem[], content.styles, `p${index}r`);
      onRuns(index, grouped.map(r => {
        let realName: string | undefined;
        try {
          if (page.commonObjs.has(r.fontName)) realName = page.commonObjs.get(r.fontName)?.name;
        } catch { /* font not loaded — fall back to the generic family */ }
        return { ...r, font: matchFont(realName, content.styles[r.fontName]?.fontFamily) };
      }));
    }).catch(err => {
      // Cancelled renders (resize/unmount) are expected; anything else is a real failure.
      if ((err as { name?: string })?.name !== 'RenderingCancelledException') console.error('[edit-pdf] render failed', err);
    });
    return () => { cancelled = true; task.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, page, scale, dpr]);

  /** Run box in CSS px relative to the page. */
  const runRect = (r: TextRun) => {
    const [x1, y1, x2, y2] = vp.convertToViewportRectangle([r.x, r.y - r.descent, r.x + r.width, r.y + r.ascent]);
    return { left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
  };

  const startEditRun = (r: RunInfo) => {
    const key = runKey(index, r.id);
    if (!runEdits[key]) {
      const canvas = canvasRef.current;
      let colors = { background: [1, 1, 1] as RGB, text: [0, 0, 0] as RGB };
      if (canvas && rendered) {
        const rect = runRect(r);
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        colors = sampleColors(img, { x: rect.left * dpr, y: rect.top * dpr, w: rect.width * dpr, h: rect.height * dpr });
      }
      onRunEdit(key, { text: r.text, color: colors.text, background: colors.background });
    }
    setEditing(key);
  };

  const local = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  // Background layer: deselect, place text/images, draw rectangles.
  const onBgDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = local(e);
    if (pending && (tool === 'sign' || tool === 'image')) { onPlacePending(index, p.x, p.y); return; }
    if (tool === 'text') {
      const fontSize = 12;
      onAdd({ page: index, kind: 'text', x: p.x, y: p.y - fontSize * 0.6, w: 0, h: fontSize * LINE_HEIGHT, text: '', fontSize, family: 'sans', color: '#000000' });
      return;
    }
    if (tool === 'whiteout' || tool === 'highlight') {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not an active pointer */ }
      setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      return;
    }
    onSelect(null);
  };
  const onBgMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = draftRef.current;
    if (!d) return;
    const p = local(e);
    setDraft({ ...d, x1: p.x, y1: p.y });
  };
  const onBgUp = () => {
    const d = draftRef.current;
    if (!d) return;
    const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
    const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
    setDraft(null);
    if (w < 3 || h < 3) return;
    onAdd({ page: index, kind: tool === 'whiteout' ? 'whiteout' : 'highlight', x, y, w, h });
  };

  const cursor = pending ? 'copy' : tool === 'text' ? 'text' : tool === 'whiteout' || tool === 'highlight' ? 'crosshair' : 'default';

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto bg-white shadow-lg select-none"
      style={{ width: vp.width, height: vp.height }}
      data-page={index}
    >
      <canvas ref={canvasRef} className="absolute inset-0" style={{ width: vp.width, height: vp.height }} />
      {!rendered && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">Loading page {index + 1}…</div>}

      <div
        className="absolute inset-0"
        style={{ cursor, touchAction: tool === 'whiteout' || tool === 'highlight' ? 'none' : 'auto' }}
        onPointerDown={onBgDown} onPointerMove={onBgMove} onPointerUp={onBgUp}
      />

      {/* Existing text */}
      {canEditRuns && runs?.map(r => {
        const key = runKey(index, r.id);
        const edit = runEdits[key];
        const rect = runRect(r);
        const fontStyle: React.CSSProperties = {
          fontFamily: cssFontFor(r.font), fontWeight: r.font.bold ? 700 : 400,
          fontStyle: r.font.italic ? 'italic' : 'normal',
          fontSize: r.fontSize * scale, lineHeight: `${rect.height}px`,
        };
        if (edit) {
          return (
            <RunEditor
              key={key} rect={rect} edit={edit} style={fontStyle} editing={editing === key} interactive={tool === 'edit'}
              onStart={() => setEditing(key)}
              onChange={text => onRunEdit(key, { ...edit, text })}
              onCommit={text => {
                setEditing(null);
                if (text === r.text) onRunEdit(key, null);
              }}
              onRevert={() => { setEditing(null); onRunEdit(key, null); }}
            />
          );
        }
        return (
          <div
            key={key}
            className={tool === 'edit' ? 'absolute rounded-sm hover:outline hover:outline-2 hover:outline-blue-500/70 hover:bg-blue-500/10 cursor-text' : 'absolute'}
            style={{ ...rect, pointerEvents: tool === 'edit' ? 'auto' : 'none' }}
            title={tool === 'edit' ? 'Click to edit' : undefined}
            onPointerDown={e => { e.stopPropagation(); if (tool === 'edit') startEditRun(r); }}
          />
        );
      })}

      {draft && (
        <div className="absolute pointer-events-none" style={{
          left: Math.min(draft.x0, draft.x1) * scale, top: Math.min(draft.y0, draft.y1) * scale,
          width: Math.abs(draft.x1 - draft.x0) * scale, height: Math.abs(draft.y1 - draft.y0) * scale,
          background: tool === 'whiteout' ? '#fff' : 'rgba(250,204,21,0.4)', outline: '1px dashed #2563eb',
        }} />
      )}

      {objects.map(o => (
        <ObjectView
          key={o.id} obj={o} scale={scale} selected={o.id === selectedId}
          onSelect={() => onSelect(o.id)} onUpdate={patch => onUpdate(o.id, patch)} onDelete={() => onDelete(o.id)}
        />
      ))}
    </div>
  );
}

/* ── an edited line of existing text ─────────────────────────────────── */

function RunEditor({ rect, edit, style, editing, interactive, onStart, onChange, onCommit, onRevert }: {
  rect: { left: number; top: number; width: number; height: number };
  edit: RunEdit; style: React.CSSProperties; editing: boolean; interactive: boolean;
  onStart: () => void; onChange: (text: string) => void; onCommit: (text: string) => void; onRevert: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // Text at the moment editing began, so Esc can restore it.
  const startText = useRef(edit.text);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !editing) return;
    el.textContent = edit.text;
    startText.current = edit.text;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  return (
    <>
      {/* Cover for the original glyphs — same box the PDF cover will use. */}
      <div className="absolute pointer-events-none" style={{ ...rect, background: rgbToCss(edit.background) }} />
      <span
        ref={ref}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={false}
        className={`absolute whitespace-pre outline-none ${editing ? 'ring-2 ring-blue-500 rounded-sm' : interactive ? 'hover:ring-1 hover:ring-blue-400 cursor-text' : ''}`}
        style={{
          ...style, left: rect.left, top: rect.top, minWidth: rect.width, height: rect.height,
          color: rgbToCss(edit.color), background: rgbToCss(edit.background), pointerEvents: interactive ? 'auto' : 'none',
          zIndex: editing ? 20 : 2,
        }}
        onPointerDown={e => { e.stopPropagation(); if (!editing && interactive) onStart(); }}
        // Saved on every keystroke, so Download is correct even mid-edit.
        onInput={e => onChange((e.currentTarget.textContent ?? '').replace(/\n/g, ' '))}
        onBlur={e => onCommit((e.currentTarget.textContent ?? '').replace(/\n/g, ' '))}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          if (e.key === 'Escape') {
            e.currentTarget.textContent = startText.current;
            onChange(startText.current);
            e.currentTarget.blur();
          }
        }}
      >{editing ? null : edit.text}</span>
      {editing && (
        <button
          className="absolute z-30 flex items-center gap-1 rounded-md bg-gray-900 text-white text-[11px] px-2 py-1 shadow"
          style={{ left: rect.left, top: rect.top - 28 }}
          onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onRevert(); }}
        >
          <RotateCcw className="w-3 h-3" /> Undo change
        </button>
      )}
    </>
  );
}

/* ── an added object: text box, white-out, highlight, image/signature ── */

function ObjectView({ obj, scale, selected, onSelect, onUpdate, onDelete }: {
  obj: PageObject; scale: number; selected: boolean;
  onSelect: () => void; onUpdate: (p: Partial<PageObject>) => void; onDelete: () => void;
}) {
  const textRef = useRef<HTMLDivElement>(null);
  // contentEditable owns its DOM while typing; React only seeds it once.
  const [initialText] = useState(obj.text ?? '');
  const drag = useRef<{ mode: 'move' | 'resize'; sx: number; sy: number; o: PageObject } | null>(null);

  // New, empty text boxes start focused so the user can type immediately.
  useLayoutEffect(() => {
    if (obj.kind === 'text' && selected && textRef.current && document.activeElement !== textRef.current) {
      if (!obj.text) textRef.current.focus();
    }
  }, [obj.kind, obj.text, selected]);

  const startDrag = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not an active pointer */ }
    drag.current = { mode, sx: e.clientX, sy: e.clientY, o: obj };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
    if (d.mode === 'move') onUpdate({ x: d.o.x + dx, y: d.o.y + dy });
    else if (obj.kind === 'image') {
      const w = Math.max(12, d.o.w + dx);
      onUpdate({ w, h: w * (d.o.h / d.o.w) });
    } else onUpdate({ w: Math.max(6, d.o.w + dx), h: Math.max(6, d.o.h + dy) });
  };
  const endDrag = () => { drag.current = null; };

  const box: React.CSSProperties = {
    position: 'absolute', left: obj.x * scale, top: obj.y * scale, zIndex: selected ? 15 : 10,
    outline: selected ? '2px solid #2563eb' : undefined, outlineOffset: 1,
  };
  const handle = (
    <div
      onPointerDown={startDrag('resize')} onPointerMove={onMove} onPointerUp={endDrag}
      className="absolute -right-1.5 -bottom-1.5 w-3 h-3 rounded-sm bg-blue-600 border border-white cursor-nwse-resize"
      style={{ touchAction: 'none' }}
    />
  );

  const toolbar = selected && (
    <div
      className="absolute flex items-center gap-1 rounded-md bg-gray-900 text-white text-xs px-1.5 py-1 shadow-lg whitespace-nowrap"
      style={{ top: -34, left: 0, zIndex: 30 }}
      onPointerDown={e => e.stopPropagation()}
    >
      {obj.kind === 'text' && (
        <>
          <button className="p-1 hover:bg-white/10 rounded" aria-label="Smaller text" onClick={() => onUpdate({ fontSize: Math.max(6, (obj.fontSize ?? 12) - 1) })}><Minus className="w-3 h-3" /></button>
          <span className="w-6 text-center tabular-nums">{obj.fontSize}</span>
          <button className="p-1 hover:bg-white/10 rounded" aria-label="Larger text" onClick={() => onUpdate({ fontSize: Math.min(96, (obj.fontSize ?? 12) + 1) })}><Plus className="w-3 h-3" /></button>
          <select
            value={obj.family} onChange={e => onUpdate({ family: e.target.value as FontFamily })}
            className="bg-gray-800 rounded px-1 py-0.5 text-xs" aria-label="Font"
          >
            <option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option>
          </select>
          <input type="color" value={obj.color} onChange={e => onUpdate({ color: e.target.value })} className="w-5 h-5 bg-transparent border-0 p-0 cursor-pointer" aria-label="Text colour" />
        </>
      )}
      <button className="p-1 hover:bg-red-500/30 rounded" aria-label="Delete" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );

  if (obj.kind === 'text') {
    const fs = (obj.fontSize ?? 12) * scale;
    return (
      <div style={box}>
        {toolbar}
        {selected && (
          <div
            onPointerDown={startDrag('move')} onPointerMove={onMove} onPointerUp={endDrag}
            className="absolute -left-5 top-0 h-full flex items-center text-blue-600 cursor-move" style={{ touchAction: 'none' }}
            title="Drag to move"
          ><GripVertical className="w-4 h-4" /></div>
        )}
        <div
          ref={textRef}
          contentEditable suppressContentEditableWarning spellCheck={false}
          className="outline-none whitespace-pre min-w-[1ch]"
          style={{ fontSize: fs, lineHeight: LINE_HEIGHT, fontFamily: cssFontFor({ family: obj.family ?? 'sans', bold: false, italic: false }), color: obj.color, cursor: 'text', minHeight: fs * LINE_HEIGHT }}
          onPointerDown={e => { e.stopPropagation(); onSelect(); }}
          onInput={e => onUpdate({ text: e.currentTarget.innerText.replace(/\n$/, '') })}
          onBlur={e => { if (!e.currentTarget.innerText.trim()) onDelete(); }}
          onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.blur(); }}
        >{initialText}</div>
      </div>
    );
  }

  const style: React.CSSProperties = { ...box, width: obj.w * scale, height: obj.h * scale, cursor: 'move', touchAction: 'none' };
  return (
    <div style={style} onPointerDown={startDrag('move')} onPointerMove={onMove} onPointerUp={endDrag}>
      {toolbar}
      {obj.kind === 'whiteout' && <div className="w-full h-full bg-white" style={{ boxShadow: selected ? undefined : 'inset 0 0 0 1px rgba(37,99,235,0.25)' }} />}
      {obj.kind === 'highlight' && <div className="w-full h-full" style={{ background: 'rgba(250,204,21,0.4)' }} />}
      {obj.kind === 'image' && <img src={obj.src} alt="" draggable={false} className="w-full h-full pointer-events-none" />}
      {selected && handle}
    </div>
  );
}
