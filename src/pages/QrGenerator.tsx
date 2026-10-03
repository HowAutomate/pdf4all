import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { QrCode, Download, IndianRupee, Link2, MessageCircle, Wifi, Contact, AlertTriangle } from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/data/pages';
import { upiPayload, whatsappPayload, wifiPayload, vcardPayload, linkPayload } from '@/lib/qrPayload';

const ACCENT = { from: '#16a34a', to: '#86efac', soft: 'rgba(22,163,74,0.18)' };
type Mode = 'link' | 'upi' | 'whatsapp' | 'wifi' | 'contact';
const MODES: [Mode, string, typeof Link2][] = [
  ['link', 'Link / text', Link2], ['upi', 'UPI payment', IndianRupee], ['whatsapp', 'WhatsApp', MessageCircle], ['wifi', 'Wi-Fi', Wifi], ['contact', 'Contact', Contact],
];
const ROUTE_MODE: Record<string, Mode> = { '/upi-qr-code-generator': 'upi', '/whatsapp-qr-code-generator': 'whatsapp' };

/** Relative luminance contrast — QR scanners need dark-on-light with good contrast. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return { ratio: (l1 + 0.05) / (l2 + 0.05), darkOnLight: lum(a) < lum(b) };
}

function save(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
}

export default function QrGenerator() {
  const { pathname } = useLocation();
  const route = pathname in PAGES ? pathname : '/qr-code-generator';
  const meta = PAGES[route];

  const [mode, setMode] = useState<Mode>(ROUTE_MODE[route] ?? 'link');
  const [link, setLink] = useState('https://howautomate.com');
  const [upi, setUpi] = useState({ upiId: '', name: '', amount: '', note: '' });
  const [wa, setWa] = useState({ phone: '', message: '' });
  const [wifi, setWifi] = useState({ ssid: '', password: '', security: 'WPA' as 'WPA' | 'WEP' | 'nopass' });
  const [card, setCard] = useState({ name: '', phone: '', email: '', org: '', url: '' });
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [size, setSize] = useState(1024);
  const [preview, setPreview] = useState('');

  useEffect(() => { setMode(ROUTE_MODE[route] ?? 'link'); }, [route]);

  const payload = useMemo(() => {
    switch (mode) {
      case 'upi': return upiPayload(upi);
      case 'whatsapp': return whatsappPayload(wa.phone, wa.message);
      case 'wifi': return wifiPayload(wifi.ssid, wifi.password, wifi.security);
      case 'contact': return vcardPayload(card);
      default: return linkPayload(link);
    }
  }, [mode, upi, wa, wifi, card, link]);

  const c = contrast(fg, bg);
  const poorContrast = c.ratio < 3 || !c.darkOnLight;
  const opts = { errorCorrectionLevel: 'M' as const, margin: 4, color: { dark: fg, light: bg } };

  useEffect(() => {
    if (!payload.text) { setPreview(''); return; }
    QRCode.toDataURL(payload.text, { ...opts, width: 360 }).then(setPreview).catch(() => setPreview(''));
  }, [payload.text, fg, bg]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = mode === 'upi' ? 'upi-qr' : mode === 'whatsapp' ? 'whatsapp-qr' : mode === 'wifi' ? 'wifi-qr' : mode === 'contact' ? 'contact-qr' : 'qr-code';
  const downloadPng = async () => save(await QRCode.toDataURL(payload.text, { ...opts, width: size }), `${base}.png`);
  const downloadSvg = async () => {
    const svg = await QRCode.toString(payload.text, { ...opts, type: 'svg' });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    save(url, `${base}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  /** Printable "Scan & Pay" card for a shop counter (A6 at 300 DPI). */
  const downloadUpiCard = async () => {
    const W = 1240, H = 1748;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#16a34a'; ctx.fillRect(0, 0, W, 220);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
    ctx.font = 'bold 96px Inter, Arial, sans-serif'; ctx.fillText('Scan & Pay', W / 2, 150);
    const qrImg = new Image();
    qrImg.src = await QRCode.toDataURL(payload.text, { errorCorrectionLevel: 'M', margin: 2, width: 900, color: { dark: '#000000', light: '#ffffff' } });
    await qrImg.decode();
    ctx.drawImage(qrImg, (W - 900) / 2, 300);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 72px Inter, Arial, sans-serif'; ctx.fillText((upi.name.trim() || upi.upiId).slice(0, 26), W / 2, 1320);
    ctx.font = '48px Inter, Arial, sans-serif'; ctx.fillStyle = '#4b5563'; ctx.fillText(upi.upiId.trim(), W / 2, 1400);
    if (upi.amount.trim()) { ctx.font = 'bold 64px Inter, Arial, sans-serif'; ctx.fillStyle = '#111827'; ctx.fillText(`₹ ${Number(upi.amount).toFixed(2)}`, W / 2, 1500); }
    ctx.font = '40px Inter, Arial, sans-serif'; ctx.fillStyle = '#6b7280';
    ctx.fillText('Pay with any UPI app — Google Pay, PhonePe, Paytm, BHIM', W / 2, 1640);
    canvas.toBlob(b => { if (b) { const u = URL.createObjectURL(b); save(u, 'upi-payment-card.png'); setTimeout(() => URL.revokeObjectURL(u), 10_000); } }, 'image/png');
  };

  const field = 'w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white text-sm outline-none focus:border-green-500';
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5';
  const chip = (active: boolean) => `rounded-lg px-3 py-1.5 text-sm font-semibold border ${active ? 'border-green-500 bg-green-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`;
  const input = (lbl: string, value: string, onChange: (v: string) => void, placeholder = '', type = 'text') => (
    <label className="block"><span className={label}>{lbl}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={field} /></label>
  );

  return (
    <ToolLayout
      seoTitle={meta.title} seoDescription={meta.description} path={route}
      eyebrow="QR Code" eyebrowIcon={QrCode}
      title={meta.h1} subtitle={meta.intro}
      accent={ACCENT} faqs={meta.faqs} maxWidth={920}
    >
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {[['/qr-code-generator', 'QR code'], ['/upi-qr-code-generator', 'UPI QR'], ['/whatsapp-qr-code-generator', 'WhatsApp QR']].map(([to, l]) => (
          <Link key={to} to={to} className={`rounded-full px-3 py-1 text-xs font-semibold border ${route === to ? 'border-green-500 bg-green-500/15 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}>{l}</Link>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {MODES.map(([m, l, Icon]) => <button key={m} onClick={() => setMode(m)} className={`${chip(mode === m)} flex items-center gap-1.5`}><Icon className="w-3.5 h-3.5" />{l}</button>)}
          </div>
          {mode === 'link' && (
            <label className="block"><span className={label}>Link or text</span><textarea rows={3} value={link} onChange={e => setLink(e.target.value)} className={field} placeholder="https://your-website.com" /></label>
          )}
          {mode === 'upi' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {input('UPI ID', upi.upiId, v => setUpi({ ...upi, upiId: v }), 'yourname@okhdfcbank')}
              {input('Name shown to payer', upi.name, v => setUpi({ ...upi, name: v }), 'Sharma General Store')}
              {input('Amount (₹, optional)', upi.amount, v => setUpi({ ...upi, amount: v }), 'Leave blank to let them enter it')}
              {input('Note (optional)', upi.note, v => setUpi({ ...upi, note: v }), 'Order number, etc.')}
            </div>
          )}
          {mode === 'whatsapp' && (
            <div className="space-y-3">
              {input('WhatsApp number', wa.phone, v => setWa({ ...wa, phone: v }), '98765 43210', 'tel')}
              <label className="block"><span className={label}>Pre-filled message (optional)</span><textarea rows={2} value={wa.message} onChange={e => setWa({ ...wa, message: e.target.value })} className={field} placeholder="Hi! I’d like to place an order." /></label>
            </div>
          )}
          {mode === 'wifi' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {input('Network name (SSID)', wifi.ssid, v => setWifi({ ...wifi, ssid: v }), 'Cafe_Guest')}
              {wifi.security !== 'nopass' && input('Password', wifi.password, v => setWifi({ ...wifi, password: v }), '')}
              <div className="sm:col-span-2 flex gap-2">
                {(['WPA', 'WEP', 'nopass'] as const).map(s => <button key={s} onClick={() => setWifi({ ...wifi, security: s })} className={chip(wifi.security === s)}>{s === 'nopass' ? 'No password' : s === 'WPA' ? 'WPA / WPA2' : 'WEP'}</button>)}
              </div>
            </div>
          )}
          {mode === 'contact' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {input('Name', card.name, v => setCard({ ...card, name: v }))}
              {input('Phone', card.phone, v => setCard({ ...card, phone: v }), '+91 98765 43210', 'tel')}
              {input('Email', card.email, v => setCard({ ...card, email: v }), '', 'email')}
              {input('Company', card.org, v => setCard({ ...card, org: v }))}
              {input('Website', card.url, v => setCard({ ...card, url: v }))}
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-3 border-t border-white/10 pt-4">
            <label className="block"><span className={label}>Colour</span><input type="color" value={fg} onChange={e => setFg(e.target.value)} className="w-full h-9 rounded bg-transparent cursor-pointer" /></label>
            <label className="block"><span className={label}>Background</span><input type="color" value={bg} onChange={e => setBg(e.target.value)} className="w-full h-9 rounded bg-transparent cursor-pointer" /></label>
            <div>
              <span className={label}>PNG size</span>
              <div className="flex gap-1.5">{[512, 1024, 2048].map(s => <button key={s} onClick={() => setSize(s)} className={chip(size === s)}>{s}</button>)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col items-center">
          <div className="w-full aspect-square rounded-xl flex items-center justify-center" style={{ background: bg }}>
            {preview ? <img src={preview} alt="QR code preview" className="w-full h-full rounded-xl" /> : <QrCode className="w-16 h-16 text-gray-300" />}
          </div>
          {payload.error && <p className="text-xs text-amber-200 mt-3">{payload.error}</p>}
          {poorContrast && <p className="flex gap-1.5 text-xs text-amber-200 mt-3"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />Use a dark colour on a light background — many phones can’t scan low-contrast or inverted codes.</p>}
          <div className="w-full mt-4 space-y-2">
            <Button onClick={downloadPng} disabled={!payload.text} className="w-full" style={{ background: payload.text ? `linear-gradient(135deg,${ACCENT.from},#0891b2)` : undefined, color: '#fff' }}>
              <Download className="w-4 h-4 mr-2" />Download PNG ({size} px)
            </Button>
            <Button onClick={downloadSvg} disabled={!payload.text} variant="outline" className="w-full"><Download className="w-4 h-4 mr-2" />Download SVG (for print)</Button>
            {mode === 'upi' && (
              <Button onClick={downloadUpiCard} disabled={!payload.text} variant="outline" className="w-full"><IndianRupee className="w-4 h-4 mr-2" />Printable “Scan & Pay” card</Button>
            )}
          </div>
          {mode === 'upi' && payload.text && <p className="text-[11px] text-white/40 mt-3 text-center">Test it once: scan with your own UPI app and check the name before printing.</p>}
        </div>
      </div>
    </ToolLayout>
  );
}
