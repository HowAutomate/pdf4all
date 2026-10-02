import { useState } from 'react';
import { Calculator, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ToolLayout } from '@/components/ToolLayout';
import { calculateGst, type GstMode } from '@/lib/gst';
import { amountInWords, inr } from '@/lib/money';

const ACCENT = { from: '#ea580c', to: '#fdba74', soft: 'rgba(234,88,12,0.18)' };

/** Most goods and services sit at 5% or 18% since GST 2.0 (22 Sep 2025). */
const RATES = [0.25, 3, 5, 12, 18, 28, 40];

const FAQS = [
  {
    q: 'How do I add GST to a price?',
    a: 'Multiply the price by the rate and add it: ₹1,000 at 18% → GST ₹180, total ₹1,180. Choose "Add GST" above.',
  },
  {
    q: 'How do I remove GST from a GST-inclusive price?',
    a: 'Divide by (100 + rate) and multiply by 100: ₹1,180 inclusive of 18% → ₹1,180 × 100 ÷ 118 = ₹1,000 taxable value, GST ₹180. Don\'t just take 18% off the total — that gives ₹967.60, which is wrong. Choose "Remove GST" above.',
  },
  {
    q: 'When is it CGST + SGST and when is it IGST?',
    a: 'If the seller and the place of supply are in the same state, the GST is split equally into CGST and SGST (18% = 9% + 9%). If they are in different states, the whole amount is IGST. The total tax is the same either way.',
  },
  {
    q: 'What are the GST rates now?',
    a: 'Since the GST 2.0 rate rationalisation took effect on 22 September 2025, most items fall in two main slabs, 5% and 18%, with a 40% slab for luxury and sin goods. Special rates such as 3% (gold, silver) and 0.25% (rough diamonds) continue. Always check the current rate notified for your HSN/SAC code.',
  },
  {
    q: 'Can I turn this into an invoice?',
    a: 'Yes — use the free GST Invoice Generator, which applies the same maths per line item and adds HSN codes, GSTINs and amount in words.',
  },
];

export default function GstCalculator() {
  const [amount, setAmount] = useState<number | ''>(1000);
  const [rate, setRate] = useState(18);
  const [custom, setCustom] = useState('');
  const [mode, setMode] = useState<GstMode>('exclusive');
  const [interState, setInterState] = useState(false);
  const [copied, setCopied] = useState(false);

  const effectiveRate = custom !== '' ? Number(custom) : rate;
  const r = calculateGst(amount === '' ? 0 : amount, effectiveRate, mode, interState);

  const summary = [
    `Taxable value: ₹${inr(r.taxable)}`,
    interState
      ? `IGST @ ${effectiveRate}%: ₹${inr(r.gst)}`
      : `CGST @ ${effectiveRate / 2}%: ₹${inr(r.cgst)}\nSGST @ ${effectiveRate / 2}%: ₹${inr(r.sgst)}`,
    `Total: ₹${inr(r.total)}`,
  ].join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked — nothing to do */ }
  };

  const pill = (active: boolean) => ({
    flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
    border: active ? `1px solid ${ACCENT.from}` : '1px solid rgba(255,255,255,0.1)',
    background: active ? ACCENT.soft : 'rgba(255,255,255,0.03)',
    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
  } as React.CSSProperties);

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'block' };
  const line = (k: string, v: string, strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: strong ? 18 : 14, fontWeight: strong ? 800 : 500, color: strong ? '#fff' : 'rgba(255,255,255,0.75)' }}>
      <span>{k}</span><span>₹{v}</span>
    </div>
  );

  return (
    <ToolLayout
      seoTitle="GST Calculator India - Add or Remove GST (CGST, SGST, IGST) - HowAutomate Tools"
      seoDescription="Free GST calculator: add GST to a price or remove GST from an inclusive amount, with CGST/SGST or IGST split for 5%, 18%, 40% and every other slab. Instant, no signup."
      path="/gst-calculator"
      eyebrow="Business & GST"
      eyebrowIcon={Calculator}
      title="GST Calculator"
      subtitle="Add GST to a price, or back it out of a GST-inclusive amount — with the CGST/SGST or IGST split your invoice needs."
      accent={ACCENT}
      appCategory="FinanceApplication"
      faqs={FAQS}
    >
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: 22 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button style={pill(mode === 'exclusive')} onClick={() => setMode('exclusive')}>Add GST</button>
          <button style={pill(mode === 'inclusive')} onClick={() => setMode('inclusive')}>Remove GST</button>
        </div>

        <label style={label} htmlFor="gst-amount">{mode === 'exclusive' ? 'Price before GST (₹)' : 'Price including GST (₹)'}</label>
        <input
          id="gst-amount" type="number" min={0} inputMode="decimal" value={amount}
          onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 16px', fontSize: 22, fontWeight: 700, color: '#fff', outline: 'none', marginBottom: 20 }}
        />

        <span style={label}>GST rate</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {RATES.map(x => (
            <button key={x} onClick={() => { setRate(x); setCustom(''); }}
              style={{ ...pill(custom === '' && rate === x), flex: '0 0 auto', minWidth: 64 }}>
              {x}%
            </button>
          ))}
          <input
            type="number" min={0} step="0.01" placeholder="Other %" value={custom}
            onChange={e => setCustom(e.target.value)} aria-label="Custom GST rate"
            style={{ width: 100, background: 'rgba(0,0,0,0.3)', border: custom !== '' ? `1px solid ${ACCENT.from}` : '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0 12px', fontSize: 14, color: '#fff', outline: 'none' }}
          />
        </div>

        <span style={{ ...label, marginTop: 16 }}>Supply</span>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button style={pill(!interState)} onClick={() => setInterState(false)}>Within state (CGST + SGST)</button>
          <button style={pill(interState)} onClick={() => setInterState(true)}>Other state (IGST)</button>
        </div>

        <div>
          {line('Taxable value', inr(r.taxable))}
          {interState
            ? line(`IGST @ ${effectiveRate}%`, inr(r.gst))
            : <>{line(`CGST @ ${effectiveRate / 2}%`, inr(r.cgst))}{line(`SGST @ ${effectiveRate / 2}%`, inr(r.sgst))}</>}
          {line('Total GST', inr(r.gst))}
          {line(mode === 'exclusive' ? 'Total price' : 'Price including GST', inr(r.total), true)}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>{amountInWords(r.total)}</p>

        <button onClick={copy}
          style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy breakup</>}
        </button>
      </div>

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 20, textAlign: 'center' }}>
        Need a full invoice? Try the free{' '}
        <Link to="/gst-invoice-generator" style={{ color: ACCENT.to }}>GST Invoice Generator</Link>.
      </p>
    </ToolLayout>
  );
}
