import { useMemo, useState } from 'react';
import { Home as HomeIcon, Printer, AlertTriangle } from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { amountInWords, inr } from '@/lib/money';
import { monthsBetween, formatDate, PAN_THRESHOLD_ANNUAL } from '@/lib/rentReceipt';
import { printAs } from '@/lib/print';
import { RENT_RECEIPT_FAQS as FAQS } from '@/data/faqs';

const ACCENT = { from: '#2563eb', to: '#60a5fa', soft: 'rgba(37,99,235,0.18)' };
const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];
/** Cash receipts above this customarily carry a ₹1 revenue stamp. */
const REVENUE_STAMP_ABOVE = 5000;

/** Current Indian financial year as "YYYY-MM" bounds (April → March). */
function currentFinancialYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${startYear}-04`, to: `${startYear + 1}-03` };
}

export default function RentReceiptGenerator() {
  const fy = currentFinancialYear();
  const [tenant, setTenant] = useState('');
  const [landlord, setLandlord] = useState('');
  const [landlordPan, setLandlordPan] = useState('');
  const [address, setAddress] = useState('');
  const [rent, setRent] = useState<number>(15000);
  const [mode, setMode] = useState('UPI');
  const [from, setFrom] = useState(fy.from);
  const [to, setTo] = useState(fy.to);
  const [day, setDay] = useState<number>(1);

  const periods = useMemo(() => monthsBetween(from, to, day), [from, to, day]);
  const total = rent * periods.length;
  const annualised = rent * 12;
  const panNeeded = annualised > PAN_THRESHOLD_ANNUAL && !landlordPan.trim();
  const needsStamp = mode === 'Cash' && rent > REVENUE_STAMP_ABOVE;
  const ready = tenant.trim() && landlord.trim() && address.trim() && rent > 0 && periods.length > 0;

  const print = () => printAs(`Rent Receipts - ${tenant || 'Tenant'} - ${periods[0]?.label ?? ''} to ${periods[periods.length - 1]?.label ?? ''}`);

  return (
    <ToolLayout
      seoTitle="Free Rent Receipt Generator for HRA (India) - HowAutomate Tools"
      seoDescription="Generate monthly rent receipts for your HRA claim in seconds — landlord PAN check, revenue-stamp box for cash, amount in words, two receipts per A4 page. Free, nothing uploaded."
      path="/rent-receipt-generator"
      eyebrow="Business & Tax"
      eyebrowIcon={HomeIcon}
      title="Rent Receipt Generator"
      subtitle="Monthly rent receipts for your HRA claim — one for every month in the period, ready to print and get signed."
      note="Checks the ₹1 lakh landlord-PAN rule and adds a revenue-stamp box for cash payments. Runs entirely in your browser."
      accent={ACCENT}
      appCategory="FinanceApplication"
      faqs={FAQS}
      maxWidth={1000}
    >
      <style>{`
        @media print {
          body { background: #fff !important; }
          @page { size: A4; margin: 10mm; }
          .receipt { break-inside: avoid; }
          .receipt:nth-child(2n) { break-after: page; }
        }
      `}</style>

      <div className="print:hidden grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5 space-y-3">
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Tenant &amp; landlord</h2>
            <div><Label>Tenant name (you)</Label><Input value={tenant} onChange={e => setTenant(e.target.value)} placeholder="As it appears in your payroll" /></div>
            <div><Label>Landlord name</Label><Input value={landlord} onChange={e => setLandlord(e.target.value)} placeholder="Owner of the property" /></div>
            <div>
              <Label>Landlord PAN {annualised > PAN_THRESHOLD_ANNUAL ? '(required)' : '(optional)'}</Label>
              <Input value={landlordPan} onChange={e => setLandlordPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
            </div>
            <div><Label>Rented property address</Label><Textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Flat / house no., street, city, PIN" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-3">
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Rent &amp; period</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Monthly rent (₹)</Label><Input type="number" min={0} value={rent} onChange={e => setRent(Number(e.target.value))} /></div>
              <div>
                <Label>Paid by</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From month</Label><Input type="month" value={from} onChange={e => setFrom(e.target.value)} /></div>
              <div><Label>To month</Label><Input type="month" value={to} onChange={e => setTo(e.target.value)} /></div>
            </div>
            <div>
              <Label>Receipt date (day of month)</Label>
              <Input type="number" min={1} max={31} value={day} onChange={e => setDay(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Use the day you usually pay. 31 becomes the last day of shorter months.</p>
            </div>
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              {periods.length
                ? <>{periods.length} receipt{periods.length === 1 ? '' : 's'} · total <strong>₹{inr(total)}</strong></>
                : <span className="text-destructive">The “to” month must be the same as or after the “from” month.</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {(panNeeded || needsStamp) && (
        <div className="print:hidden space-y-2 mb-6">
          {panNeeded && (
            <div className="flex gap-2 rounded-md border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Rent of ₹{inr(annualised)} a year is above ₹1,00,000, so your employer will ask for the landlord's PAN (or a signed declaration if they don't have one).</span>
            </div>
          )}
          {needsStamp && (
            <div className="flex gap-2 rounded-md border border-sky-400/50 bg-sky-400/10 px-3 py-2 text-sm text-sky-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Cash receipts above ₹5,000 usually carry a ₹1 revenue stamp. Each receipt has a marked box for it — stick the stamp there and have the landlord sign across it.</span>
            </div>
          )}
        </div>
      )}

      <div className="print:hidden flex justify-center mb-8">
        <Button size="lg" onClick={print} disabled={!ready}>
          <Printer className="w-4 h-4 mr-2" /> {ready ? `Print / Save ${periods.length} receipt${periods.length === 1 ? '' : 's'} as PDF` : 'Fill in names, address and rent to print'}
        </Button>
      </div>

      <div id="receipts" className="space-y-6 max-h-[920px] overflow-y-auto rounded-lg print:space-y-0 print:max-h-none print:overflow-visible">
        {periods.map((p, i) => (
          <div key={p.key} className="receipt bg-white text-black rounded-lg shadow-lg p-7 print:shadow-none print:rounded-none print:border print:border-gray-400 print:mb-[8mm]">
            <div className="flex justify-between items-baseline border-b-2 border-gray-800 pb-2 mb-4">
              <h2 className="text-xl font-extrabold tracking-wide">RENT RECEIPT</h2>
              <div className="text-right text-sm text-gray-600">
                <p>Receipt No: {String(i + 1).padStart(2, '0')}</p>
                <p>Date: {formatDate(p.date)}</p>
              </div>
            </div>
            <p className="text-sm leading-7">
              Received with thanks from <strong>{tenant || '__________'}</strong> a sum of{' '}
              <strong>₹{inr(rent)}</strong> (<em>{amountInWords(rent)}</em>) by <strong>{mode}</strong>{' '}
              towards rent for the month of <strong>{p.label}</strong> for the property at{' '}
              <strong>{address || '__________'}</strong>.
            </p>
            <div className="flex justify-between items-end mt-6 gap-4">
              <div className="text-sm text-gray-700 space-y-0.5">
                <p><span className="text-gray-500">Landlord: </span>{landlord || '__________'}</p>
                {landlordPan && <p><span className="text-gray-500">Landlord PAN: </span>{landlordPan}</p>}
              </div>
              <div className="flex items-end gap-4">
                {needsStamp && (
                  <div className="w-20 h-20 border border-dashed border-gray-500 flex items-center justify-center text-[10px] text-gray-500 text-center leading-tight">
                    Affix ₹1<br />revenue<br />stamp
                  </div>
                )}
                <div className="text-center">
                  <div className="w-44 border-b border-gray-700 h-12" />
                  <p className="text-xs text-gray-600 mt-1">Signature of Landlord</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToolLayout>
  );
}
