import { useMemo, useState } from 'react';
import { Wallet, Printer, Plus, Trash2, Upload, X } from 'lucide-react';
import { ToolLayout } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { amountInWords, inr, round2 } from '@/lib/money';
import { printAs } from '@/lib/print';
import { SALARY_SLIP_FAQS as FAQS } from '@/data/faqs';

const ACCENT = { from: '#0d9488', to: '#5eead4', soft: 'rgba(13,148,136,0.18)' };

/** EPF is 12% of Basic, on wages up to the ₹15,000 statutory ceiling. */
const PF_RATE = 0.12;
const PF_WAGE_CEILING = 15000;

interface Row { id: number; label: string; amount: number }
let nextId = 1;
const row = (label: string, amount = 0): Row => ({ id: nextId++, label, amount });

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function monthLabel(ym: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ym;
}
function daysIn(ym: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  return m ? new Date(Number(m[1]), Number(m[2]), 0).getDate() : 30;
}
function lastMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function SalarySlipGenerator() {
  const [company, setCompany] = useState({ name: '', address: '' });
  const [logo, setLogo] = useState<string | null>(null);
  const [emp, setEmp] = useState({
    name: '', id: '', designation: '', department: '', joining: '',
    pan: '', uan: '', bank: '', account: '',
  });
  const [month, setMonth] = useState(lastMonth());
  const [paidDays, setPaidDays] = useState<number | ''>('');
  const [earnings, setEarnings] = useState<Row[]>([
    row('Basic Salary', 25000), row('House Rent Allowance', 10000),
    row('Special Allowance', 8000), row('Conveyance Allowance', 1600),
  ]);
  const [deductions, setDeductions] = useState<Row[]>([
    row('Provident Fund (Employee)', 1800), row('Professional Tax', 200), row('Income Tax (TDS)', 0),
  ]);
  const [note, setNote] = useState('');

  const monthDays = daysIn(month);
  const shownPaidDays = paidDays === '' ? monthDays : paidDays;

  const totals = useMemo(() => {
    const gross = round2(earnings.reduce((s, r) => s + (r.amount || 0), 0));
    const ded = round2(deductions.reduce((s, r) => s + (r.amount || 0), 0));
    return { gross, ded, net: round2(gross - ded) };
  }, [earnings, deductions]);

  const update = (set: typeof setEarnings) => (id: number, patch: Partial<Row>) =>
    set(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const updEarn = update(setEarnings);
  const updDed = update(setDeductions);

  const fillPf = () => {
    const basic = earnings.find(r => /basic/i.test(r.label))?.amount ?? 0;
    const pf = Math.round(Math.min(basic, PF_WAGE_CEILING) * PF_RATE);
    setDeductions(prev => {
      const i = prev.findIndex(r => /provident|pf/i.test(r.label));
      if (i === -1) return [row('Provident Fund (Employee)', pf), ...prev];
      return prev.map((r, j) => (j === i ? { ...r, amount: pf } : r));
    });
  };

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const print = () => printAs(`Salary Slip - ${emp.name || 'Employee'} - ${monthLabel(month)}`);

  const rowsLen = Math.max(earnings.length, deductions.length);
  const empFields: [string, string][] = [
    ['Employee Name', emp.name], ['Employee ID', emp.id], ['Designation', emp.designation],
    ['Department', emp.department], ['Date of Joining', emp.joining], ['PAN', emp.pan],
    ['UAN', emp.uan], ['Bank', emp.bank], ['Account No.', emp.account],
    ['Days in Month', String(monthDays)], ['Paid Days', String(shownPaidDays)],
    ['Loss of Pay Days', String(Math.max(0, monthDays - Number(shownPaidDays)))],
  ];

  const editor = (title: string, rows: Row[], set: typeof setEarnings, upd: ReturnType<typeof update>, extra?: React.ReactNode) => (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">{title}</h2>
          {extra}
        </div>
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="flex gap-2">
              <Input className="flex-1" value={r.label} onChange={e => upd(r.id, { label: e.target.value })} placeholder="Component" />
              <Input className="w-32" type="number" min={0} value={r.amount} onChange={e => upd(r.id, { amount: Number(e.target.value) })} />
              <Button variant="outline" size="icon" onClick={() => set(prev => prev.filter(x => x.id !== r.id))} aria-label={`Remove ${r.label}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => set(prev => [...prev, row('')])}>
          <Plus className="w-4 h-4 mr-1" /> Add row
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <ToolLayout
      seoTitle="Free Salary Slip Generator (India) - Payslip Format with PF - HowAutomate Tools"
      seoDescription="Create a professional monthly salary slip / payslip in Indian format — earnings, PF, professional tax, TDS, paid days and net pay in words. Free, prints to PDF, nothing uploaded."
      path="/salary-slip-generator"
      eyebrow="Business & Payroll"
      eyebrowIcon={Wallet}
      title="Salary Slip Generator"
      subtitle="A clean, standard Indian payslip — earnings, deductions, paid days and net pay in words — printed to PDF in one click."
      note="Includes a one-click EPF fill (12% of Basic, ₹15,000 ceiling). Employee data never leaves your browser."
      accent={ACCENT}
      appCategory="BusinessApplication"
      faqs={FAQS}
      maxWidth={1000}
    >
      <style>{`
        @media print {
          body { background: #fff !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="print:hidden grid lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardContent className="pt-5 space-y-3">
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Company</h2>
            <div className="flex items-center gap-3">
              {logo ? (
                <div className="relative">
                  <img src={logo} alt="Logo preview" className="h-12 w-12 object-contain border border-border rounded" />
                  <button type="button" onClick={() => setLogo(null)} className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5" aria-label="Remove logo">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm border border-dashed border-border rounded-md px-3 py-2 cursor-pointer hover:bg-muted">
                  <Upload className="w-4 h-4" /> Logo (optional)
                  <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
                </label>
              )}
            </div>
            <div><Label>Company name</Label><Input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} placeholder="Acme Technologies Pvt Ltd" /></div>
            <div><Label>Address</Label><Textarea rows={2} value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} placeholder="Office address" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Pay month</Label><Input type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
              <div>
                <Label>Paid days</Label>
                <Input type="number" min={0} max={monthDays} value={paidDays} placeholder={String(monthDays)}
                  onChange={e => setPaidDays(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-3">
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Employee</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={emp.name} onChange={e => setEmp({ ...emp, name: e.target.value })} /></div>
              <div><Label>Employee ID</Label><Input value={emp.id} onChange={e => setEmp({ ...emp, id: e.target.value })} /></div>
              <div><Label>Designation</Label><Input value={emp.designation} onChange={e => setEmp({ ...emp, designation: e.target.value })} /></div>
              <div><Label>Department</Label><Input value={emp.department} onChange={e => setEmp({ ...emp, department: e.target.value })} /></div>
              <div><Label>Date of joining</Label><Input type="date" value={emp.joining} onChange={e => setEmp({ ...emp, joining: e.target.value })} /></div>
              <div><Label>PAN</Label><Input value={emp.pan} maxLength={10} onChange={e => setEmp({ ...emp, pan: e.target.value.toUpperCase() })} /></div>
              <div><Label>UAN (PF)</Label><Input value={emp.uan} maxLength={12} onChange={e => setEmp({ ...emp, uan: e.target.value })} /></div>
              <div><Label>Bank</Label><Input value={emp.bank} onChange={e => setEmp({ ...emp, bank: e.target.value })} /></div>
              <div className="col-span-2"><Label>Account number</Label><Input value={emp.account} onChange={e => setEmp({ ...emp, account: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="print:hidden grid lg:grid-cols-2 gap-4 mb-4">
        {editor('Earnings', earnings, setEarnings, updEarn)}
        {editor('Deductions', deductions, setDeductions, updDed,
          <Button variant="outline" size="sm" onClick={fillPf}>Fill PF (12% of Basic)</Button>)}
      </div>

      <Card className="print:hidden mb-6">
        <CardContent className="pt-5">
          <Label>Note on slip (optional)</Label>
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Includes arrears for August" />
        </CardContent>
      </Card>

      <div className="print:hidden flex justify-center mb-8">
        <Button size="lg" onClick={print}><Printer className="w-4 h-4 mr-2" /> Print / Save as PDF</Button>
      </div>

      <div id="salary-slip" className="bg-white text-black rounded-lg shadow-lg p-8 print:shadow-none print:p-0 print:rounded-none">
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-3 mb-4 gap-4">
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt="Company logo" className="h-14 w-14 object-contain" />}
            <div>
              <h2 className="text-xl font-bold">{company.name || 'Company Name'}</h2>
              {company.address && <p className="text-sm text-gray-600 whitespace-pre-line">{company.address}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-gray-800">SALARY SLIP</p>
            <p className="text-sm text-gray-600">{monthLabel(month)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3 gap-x-6 gap-y-1.5 text-sm mb-5">
          {empFields.filter(([, v]) => v && v.trim()).map(([k, v]) => (
            <p key={k}><span className="text-gray-500">{k}: </span><span className="font-medium">{v}</span></p>
          ))}
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-sm border-collapse min-w-[480px] print:min-w-0">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1.5 text-left">Earnings</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right w-32">Amount (₹)</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">Deductions</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right w-32">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowsLen }, (_, i) => {
                const e = earnings[i];
                const d = deductions[i];
                return (
                  <tr key={i}>
                    <td className="border border-gray-300 px-2 py-1">{e?.label ?? ''}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{e ? inr(e.amount || 0) : ''}</td>
                    <td className="border border-gray-300 px-2 py-1">{d?.label ?? ''}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{d ? inr(d.amount || 0) : ''}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold bg-gray-50">
                <td className="border border-gray-300 px-2 py-1.5">Gross Earnings</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{inr(totals.gross)}</td>
                <td className="border border-gray-300 px-2 py-1.5">Total Deductions</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{inr(totals.ded)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center border-2 border-gray-800 rounded mt-5 px-4 py-3">
          <span className="font-bold">Net Pay</span>
          <span className="text-xl font-extrabold">₹{inr(totals.net)}</span>
        </div>
        <p className="text-sm mt-2"><span className="text-gray-500">In words: </span>{totals.net >= 0 ? amountInWords(totals.net) : 'Deductions exceed earnings'}</p>
        {note && <p className="text-sm text-gray-600 mt-3">{note}</p>}

        <p className="text-xs text-gray-500 text-center border-t border-gray-200 pt-3 mt-6">
          This is a computer-generated salary slip.
        </p>
      </div>
    </ToolLayout>
  );
}
