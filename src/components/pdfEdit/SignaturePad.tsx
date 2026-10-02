import { useEffect, useRef, useState } from 'react';
import { X, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onDone: (png: { dataUrl: string; width: number; height: number }) => void;
  onCancel: () => void;
}

const W = 560;
const H = 200;
const INK = '#1e3a8a';

/** Crops a canvas to its painted pixels (plus a little margin) and returns a PNG. */
function trimToPng(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const pad = 6;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d')!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return { dataUrl: out.toDataURL('image/png'), width: out.width, height: out.height };
}

export function SignaturePad({ onDone, onCancel }: Props) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typed, setTyped] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  // Typed signatures are drawn onto the same canvas, so both paths export alike.
  useEffect(() => {
    if (mode !== 'type') return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!typed.trim()) { setEmpty(true); return; }
    let size = 64 * dpr;
    ctx.fillStyle = INK;
    ctx.textBaseline = 'middle';
    const family = '"Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive';
    do {
      ctx.font = `italic ${size}px ${family}`;
      size -= 4;
    } while (ctx.measureText(typed).width > c.width - 40 * dpr && size > 16);
    ctx.fillText(typed, 20 * dpr, c.height / 2);
    setEmpty(false);
  }, [mode, typed, dpr]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const p = pos(e);
    const ctx = e.currentTarget.getContext('2d')!;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3 * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setEmpty(false);
  };
  const up = () => { drawing.current = false; last.current = null; };

  const done = () => {
    const c = canvasRef.current;
    if (!c) return;
    const png = trimToPng(c);
    if (png) onDone({ ...png, width: png.width / dpr, height: png.height / dpr });
  };

  const tab = (m: 'draw' | 'type', label: string) => (
    <button
      onClick={() => { setMode(m); clear(); }}
      className={`px-3 py-1.5 text-sm rounded-md font-medium ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
    >{label}</button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-background text-foreground rounded-xl shadow-2xl w-full max-w-[620px] p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">{tab('draw', 'Draw')}{tab('type', 'Type')}</div>
          <button onClick={onCancel} aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        {mode === 'type' && (
          <input
            autoFocus value={typed} onChange={e => setTyped(e.target.value)} placeholder="Type your name"
            className="w-full mb-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        )}
        <canvas
          ref={canvasRef} width={W * dpr} height={H * dpr}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
          className="w-full rounded-lg border border-dashed border-border bg-white"
          style={{ aspectRatio: `${W} / ${H}`, touchAction: 'none', cursor: mode === 'draw' ? 'crosshair' : 'default' }}
        />
        <div className="flex items-center justify-between mt-3">
          <Button variant="ghost" size="sm" onClick={() => { clear(); setTyped(''); }}><Eraser className="w-4 h-4 mr-1" /> Clear</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={done} disabled={empty}>Use signature</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">After this, click on the page where the signature should go. You can drag and resize it.</p>
      </div>
    </div>
  );
}
