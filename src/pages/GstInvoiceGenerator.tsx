import { useState, useMemo } from 'react';
import { Receipt, Plus, Trash2, Printer, Upload, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { amountInWords, inr } from '@/lib/money';
import { PAGES } from '@/data/pages';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

// 5% and 18% are the main slabs since GST 2.0 (22 Sep 2025); 40% is the
// luxury/sin slab, 3% is gold/silver. 12% and 28% kept for older invoices.
const GST_RATES = [0, 3, 5, 12, 18, 28, 40];

interface LineItem {
  id: number;
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  gstRate: number;
}

let nextId = 1;
const newItem = (): LineItem => ({ id: nextId++, description: '', hsn: '', qty: 1, rate: 0, gstRate: 18 });

/**
 * One generator, four Indian business documents. They share the line items,
 * GST maths, logo, bank details and print-to-PDF; only the wording and a few
 * fields differ.
 */
type DocKind = 'invoice' | 'quotation' | 'proforma' | 'challan';
interface DocConfig {
  kind: DocKind; heading: string; noLabel: string; noPlaceholder: string; dateLabel: string;
  filePrefix: string; subtitle: string; defaultNotes: string; footer: string; party: string;
}
const DOCS: Record<string, DocConfig> = {
  '/gst-invoice-generator': {
    kind: 'invoice', heading: 'TAX INVOICE', noLabel: 'Invoice Number', noPlaceholder: 'INV-001', dateLabel: 'Invoice Date',
    filePrefix: 'Invoice', party: 'Bill To',
    subtitle: 'Create a GST-compliant tax invoice in minutes — automatic CGST/SGST or IGST split, HSN codes, amount in words. Everything stays in your browser.',
    defaultNotes: 'Thank you for your business.',
    footer: 'This is a computer-generated invoice and does not require a physical signature or stamp.',
  },
  '/quotation-generator': {
    kind: 'quotation', heading: 'QUOTATION', noLabel: 'Quotation Number', noPlaceholder: 'QT-001', dateLabel: 'Quotation Date',
    filePrefix: 'Quotation', party: 'Quotation For',
    subtitle: 'Send a professional price quotation with GST worked out, validity date, terms and your logo — then save it as a PDF.',
    defaultNotes: 'Prices are valid until the date above. Delivery within 7 days of order confirmation. 50% advance with order, balance before dispatch.',
    footer: 'This is a quotation and not a tax invoice. A tax invoice will be issued on supply.',
  },
  '/proforma-invoice-generator': {
    kind: 'proforma', heading: 'PROFORMA INVOICE', noLabel: 'Proforma Number', noPlaceholder: 'PI-001', dateLabel: 'Date',
    filePrefix: 'Proforma', party: 'Bill To',
    subtitle: 'Make a proforma invoice to request an advance or share a final price before supply — GST shown, bank and UPI details included.',
    defaultNotes: 'Please make the payment to the bank account below. Goods will be dispatched on receipt of payment.',
    footer: 'This is a proforma invoice and not a tax invoice. A tax invoice will be issued on supply.',
  },
  '/delivery-challan-generator': {
    kind: 'challan', heading: 'DELIVERY CHALLAN', noLabel: 'Challan Number', noPlaceholder: 'DC-001', dateLabel: 'Challan Date',
    filePrefix: 'Challan', party: 'Consignee (Ship To)',
    subtitle: 'Create a GST delivery challan for goods sent for job work, on approval, as samples or ahead of the invoice — with vehicle details and signature boxes.',
    defaultNotes: 'Goods sent as per details above. Please sign and return a copy as acknowledgement of receipt.',
    footer: 'This delivery challan is not a tax invoice.',
  },
};

const CHALLAN_REASONS = [
  'Supply of goods (invoice to follow)', 'Job work', 'Supply on approval / sale or return', 'Stock transfer to own branch',
  'Exhibition / display', 'Repair / replacement', 'Samples (free of cost)', 'Other',
];

const GstInvoiceGenerator = () => {
  const { pathname } = useLocation();
  const route = pathname in DOCS ? pathname : '/gst-invoice-generator';
  const doc = DOCS[route];
  const page = PAGES[route];
  const [seller, setSeller] = useState({ name: '', address: '', gstin: '', state: '', phone: '', email: '' });
  const [sellerLogo, setSellerLogo] = useState<string | null>(null);
  const [buyer, setBuyer] = useState({ name: '', address: '', gstin: '', state: '' });
  const [meta, setMeta] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    placeOfSupply: '',
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    reason: CHALLAN_REASONS[0],
    vehicleNo: '',
    transport: 'Road',
  });
  // A challan for job work or approval often carries no prices.
  const [showValues, setShowValues] = useState(true);
  const values = doc.kind !== 'challan' || showValues;
  const [bank, setBank] = useState({
    accountName: '', bankName: '', accountNumber: '', ifsc: '', branch: '', upi: '',
  });
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [notes, setNotes] = useState(doc.defaultNotes);
  // Switching document type swaps in that document's default terms.
  const [notesFor, setNotesFor] = useState(route);
  if (notesFor !== route) { setNotesFor(route); setNotes(doc.defaultNotes); }
  const [roundOff, setRoundOff] = useState(false);

  const addItem = () => setItems(prev => [...prev, newItem()]);
  const removeItem = (id: number) => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
  const updateItem = (id: number, patch: Partial<LineItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSellerLogo(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isIntraState = seller.state && buyer.state && seller.state === buyer.state;
  const hasBankDetails = Object.values(bank).some(v => v.trim() !== '');

  const computed = useMemo(() => {
    const rows = items.map(item => {
      const taxable = item.qty * item.rate;
      const gstAmount = taxable * (item.gstRate / 100);
      return { ...item, taxable, gstAmount };
    });
    const subtotal = rows.reduce((s, r) => s + r.taxable, 0);
    const totalGst = rows.reduce((s, r) => s + r.gstAmount, 0);
    const rawTotal = subtotal + totalGst;
    const rounded = Math.round(rawTotal);
    const roundOffAmount = roundOff ? rounded - rawTotal : 0;
    const grandTotal = roundOff ? rounded : rawTotal;
    return { rows, subtotal, totalGst, rawTotal, roundOffAmount, grandTotal };
  }, [items, roundOff]);

  const handlePrint = () => {
    // Browsers stamp document.title into the printed page header, so swap in a
    // neutral invoice name for the duration of the print and restore it after.
    const previousTitle = document.title;
    const name = [meta.invoiceNumber && `${doc.filePrefix}-${meta.invoiceNumber}`, seller.name]
      .filter(Boolean).join(' - ');
    document.title = name || doc.heading;
    const restore = () => { document.title = previousTitle; };
    window.addEventListener('afterprint', restore, { once: true });
    window.print();
    setTimeout(restore, 1000);
  };

  const inputCls = 'print:hidden';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={page.title}
        description={page.description}
        path={route}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: page.h1,
          url: `https://tools.howautomate.com${route}`,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-preview, #invoice-preview * { visibility: visible; }
          #invoice-preview { position: absolute; top: 0; left: 0; width: 100%; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>

      <header className={`${inputCls} sticky top-0 z-20`} style={{ background: 'rgba(7,4,15,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src={logo} alt="HowAutomate" style={{ height: 56, width: 'auto', display: 'block' }} />
          </Link>
        </div>
      </header>

      <div className={inputCls} style={{ position: 'relative', overflow: 'hidden', background: '#07040f', padding: '72px 32px 64px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '52px 52px' }} />
        </div>
        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', padding: 14, borderRadius: 18, background: 'linear-gradient(135deg,#2563eb,#0ea5e9)', boxShadow: '0 8px 28px rgba(37,99,235,0.45)', marginBottom: 20 }}>
            <Receipt style={{ width: 30, height: 30, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.03em' }}>{page.h1}</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, margin: 0 }}>
            {doc.subtitle}
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10 flex-1">
        <div className={`${inputCls} flex flex-wrap justify-center gap-2 mb-6`}>
          {Object.entries(DOCS).map(([to, d]) => (
            <Link key={to} to={to} className={`rounded-full px-3 py-1 text-xs font-semibold border ${route === to ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {PAGES[to].h1.replace(' Generator', '')}
            </Link>
          ))}
        </div>
        <div className={`${inputCls} grid lg:grid-cols-2 gap-4 mb-6`}>
          <Card>
            <CardContent className="pt-5 space-y-3">
              <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Your Business (Seller)</h2>
              <div>
                <Label>Logo (optional)</Label>
                <div className="flex items-center gap-3">
                  {sellerLogo ? (
                    <div className="relative">
                      <img src={sellerLogo} alt="Logo preview" className="h-14 w-14 object-contain border border-border rounded" />
                      <button
                        type="button"
                        onClick={() => setSellerLogo(null)}
                        className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5"
                        aria-label="Remove logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 text-sm border border-dashed border-border rounded-md px-3 py-2 cursor-pointer hover:bg-muted">
                      <Upload className="w-4 h-4" /> Upload logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                </div>
              </div>
              <div><Label>Business Name</Label><Input value={seller.name} onChange={e => setSeller({ ...seller, name: e.target.value })} placeholder="Acme Enterprises" /></div>
              <div><Label>Address</Label><Textarea rows={2} value={seller.address} onChange={e => setSeller({ ...seller, address: e.target.value })} placeholder="Shop no., street, city, PIN" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>GSTIN</Label><Input value={seller.gstin} onChange={e => setSeller({ ...seller, gstin: e.target.value.toUpperCase() })} placeholder="08XXXXX0000X1ZG" maxLength={15} /></div>
                <div>
                  <Label>State</Label>
                  <Select value={seller.state} onValueChange={v => setSeller({ ...seller, state: v })}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={seller.phone} onChange={e => setSeller({ ...seller, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" /></div>
                <div><Label>Email</Label><Input value={seller.email} onChange={e => setSeller({ ...seller, email: e.target.value })} placeholder="you@business.com" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 space-y-3">
              <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">{doc.kind === 'challan' ? 'Consignee (Receiver)' : doc.kind === 'quotation' ? 'Customer' : 'Bill To (Buyer)'}</h2>
              <div><Label>Customer / Business Name</Label><Input value={buyer.name} onChange={e => setBuyer({ ...buyer, name: e.target.value })} placeholder="Client name" /></div>
              <div><Label>Address</Label><Textarea rows={2} value={buyer.address} onChange={e => setBuyer({ ...buyer, address: e.target.value })} placeholder="Billing address" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>GSTIN (optional)</Label><Input value={buyer.gstin} onChange={e => setBuyer({ ...buyer, gstin: e.target.value.toUpperCase() })} placeholder="Leave blank if unregistered" maxLength={15} /></div>
                <div>
                  <Label>State</Label>
                  <Select value={buyer.state} onValueChange={v => setBuyer({ ...buyer, state: v })}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={`${inputCls} mb-6`}>
          <CardContent className="pt-5 grid sm:grid-cols-3 gap-3">
            <div><Label>{doc.noLabel}</Label><Input value={meta.invoiceNumber} onChange={e => setMeta({ ...meta, invoiceNumber: e.target.value })} placeholder={doc.noPlaceholder} /></div>
            <div><Label>{doc.dateLabel}</Label><Input type="date" value={meta.invoiceDate} onChange={e => setMeta({ ...meta, invoiceDate: e.target.value })} /></div>
            <div><Label>Place of Supply</Label><Input value={meta.placeOfSupply} onChange={e => setMeta({ ...meta, placeOfSupply: e.target.value })} placeholder="e.g. Rajasthan" /></div>
            {doc.kind === 'quotation' && (
              <div><Label>Valid Until</Label><Input type="date" value={meta.validUntil} onChange={e => setMeta({ ...meta, validUntil: e.target.value })} /></div>
            )}
            {doc.kind === 'challan' && (
              <>
                <div className="sm:col-span-2">
                  <Label>Reason for Sending</Label>
                  <Select value={meta.reason} onValueChange={v => setMeta({ ...meta, reason: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CHALLAN_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Vehicle Number</Label><Input value={meta.vehicleNo} onChange={e => setMeta({ ...meta, vehicleNo: e.target.value.toUpperCase() })} placeholder="RJ14 AB 1234" /></div>
                <div><Label>Mode of Transport</Label><Input value={meta.transport} onChange={e => setMeta({ ...meta, transport: e.target.value })} placeholder="Road / Courier / Hand delivery" /></div>
                <div className="sm:col-span-2 flex items-center gap-2 pt-6">
                  <Checkbox id="show-values" checked={showValues} onCheckedChange={v => setShowValues(v === true)} />
                  <Label htmlFor="show-values" className="cursor-pointer">Show prices and tax (untick for job work or approval challans without values)</Label>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={`${inputCls} mb-6`}>
          <CardContent className="pt-5">
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Line Items</h2>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end border-b border-border pb-3 last:border-0">
                  <div className="col-span-12 sm:col-span-4"><Label className="text-xs">Description</Label><Input value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} placeholder="Item / service" /></div>
                  <div className="col-span-4 sm:col-span-2"><Label className="text-xs">HSN/SAC</Label><Input value={item.hsn} onChange={e => updateItem(item.id, { hsn: e.target.value })} placeholder="9983" /></div>
                  <div className="col-span-3 sm:col-span-1"><Label className="text-xs">Qty</Label><Input type="number" min={0} value={item.qty} onChange={e => updateItem(item.id, { qty: Number(e.target.value) })} /></div>
                  <div className="col-span-5 sm:col-span-2"><Label className="text-xs">Rate (₹)</Label><Input type="number" min={0} value={item.rate} onChange={e => updateItem(item.id, { rate: Number(e.target.value) })} /></div>
                  <div className="col-span-8 sm:col-span-2">
                    <Label className="text-xs">GST %</Label>
                    <Select value={String(item.gstRate)} onValueChange={v => updateItem(item.id, { gstRate: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 sm:col-span-1 flex justify-end">
                    <Button variant="outline" size="icon" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </CardContent>
        </Card>

        <Card className={`${inputCls} mb-6 ${doc.kind === 'challan' ? 'hidden' : ''}`}>
          <CardContent className="pt-5 space-y-3">
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Bank / Payment Details (optional)</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Account Holder Name</Label><Input value={bank.accountName} onChange={e => setBank({ ...bank, accountName: e.target.value })} placeholder="Name as per bank records" /></div>
              <div><Label>Bank Name</Label><Input value={bank.bankName} onChange={e => setBank({ ...bank, bankName: e.target.value })} placeholder="e.g. HDFC Bank" /></div>
              <div><Label>Account Number</Label><Input value={bank.accountNumber} onChange={e => setBank({ ...bank, accountNumber: e.target.value })} placeholder="XXXXXXXXXXXXXX" inputMode="numeric" /></div>
              <div><Label>IFSC Code</Label><Input value={bank.ifsc} onChange={e => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" maxLength={11} /></div>
              <div><Label>Branch</Label><Input value={bank.branch} onChange={e => setBank({ ...bank, branch: e.target.value })} placeholder="Branch / city" /></div>
              <div><Label>UPI ID</Label><Input value={bank.upi} onChange={e => setBank({ ...bank, upi: e.target.value })} placeholder="name@upi" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${inputCls} mb-6`}>
          <CardContent className="pt-5 space-y-4">
            <div>
              <Label>Notes / Terms</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="round-off" checked={roundOff} onCheckedChange={v => setRoundOff(v === true)} className="mt-0.5" />
              <div>
                <Label htmlFor="round-off" className="cursor-pointer">Round off total to nearest rupee</Label>
                <p className="text-xs text-muted-foreground">Adds a Round Off line and shows the grand total as a whole number.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={`${inputCls} flex justify-center mb-8`}>
          <Button size="lg" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF
          </Button>
        </div>

        {/* Invoice preview + printable area */}
        <div id="invoice-preview" className="max-w-3xl mx-auto bg-white text-black rounded-lg shadow-lg p-8 print:shadow-none print:p-0">
          <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-4">
            <div className="flex items-start gap-3">
              {sellerLogo && <img src={sellerLogo} alt="Business logo" className="h-16 w-16 object-contain shrink-0" />}
              <div>
                <h2 className="text-xl font-bold">{seller.name || 'Your Business Name'}</h2>
                <p className="text-sm whitespace-pre-line text-gray-600">{seller.address || 'Business address'}</p>
                {seller.gstin && <p className="text-sm text-gray-600">GSTIN: {seller.gstin}</p>}
                {seller.phone && <p className="text-sm text-gray-600">Phone: {seller.phone}</p>}
                {seller.email && <p className="text-sm text-gray-600">Email: {seller.email}</p>}
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-extrabold text-gray-800">{doc.heading}</h1>
              <p className="text-sm text-gray-600 mt-1">No: {meta.invoiceNumber || '—'}</p>
              <p className="text-sm text-gray-600">Date: {meta.invoiceDate}</p>
              {doc.kind === 'quotation' && meta.validUntil && <p className="text-sm text-gray-600">Valid until: {meta.validUntil}</p>}
              {meta.placeOfSupply && <p className="text-sm text-gray-600">Place of Supply: {meta.placeOfSupply}</p>}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">{doc.party}</p>
            <p className="font-semibold">{buyer.name || 'Customer name'}</p>
            <p className="text-sm whitespace-pre-line text-gray-600">{buyer.address}</p>
            {buyer.gstin && <p className="text-sm text-gray-600">GSTIN: {buyer.gstin}</p>}
          </div>

          {doc.kind === 'challan' && (
            <div className="mb-4 grid grid-cols-3 gap-3 text-sm border border-gray-300 rounded p-2.5">
              <p><span className="text-gray-500">Reason: </span>{meta.reason}</p>
              <p><span className="text-gray-500">Transport: </span>{meta.transport || '—'}</p>
              <p><span className="text-gray-500">Vehicle No: </span>{meta.vehicleNo || '—'}</p>
            </div>
          )}

          {/* Scrolls sideways on phones; print keeps the full table on the page. */}
          <div className="overflow-x-auto mb-4 print:overflow-visible print:mb-4">
          <table className="w-full text-sm border-collapse min-w-[520px] print:min-w-0">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border border-gray-300 px-2 py-1">#</th>
                <th className="border border-gray-300 px-2 py-1">Description</th>
                <th className="border border-gray-300 px-2 py-1">HSN/SAC</th>
                <th className="border border-gray-300 px-2 py-1 text-right">Qty</th>
                {values && <>
                  <th className="border border-gray-300 px-2 py-1 text-right">Rate</th>
                  <th className="border border-gray-300 px-2 py-1 text-right">Taxable Value</th>
                  <th className="border border-gray-300 px-2 py-1 text-right">GST</th>
                  <th className="border border-gray-300 px-2 py-1 text-right">Amount</th>
                </>}
              </tr>
            </thead>
            <tbody>
              {computed.rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="border border-gray-300 px-2 py-1">{i + 1}</td>
                  <td className="border border-gray-300 px-2 py-1">{r.description || '—'}</td>
                  <td className="border border-gray-300 px-2 py-1">{r.hsn || '—'}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{r.qty}</td>
                  {values && <>
                    <td className="border border-gray-300 px-2 py-1 text-right">₹{inr(r.rate)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">₹{inr(r.taxable)}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{r.gstRate}% (₹{inr(r.gstAmount)})</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">₹{inr(r.taxable + r.gstAmount)}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {values && <div className="flex justify-end mb-4">
            <div className="w-64 text-sm">
              <div className="flex justify-between py-1"><span>Subtotal</span><span>₹{inr(computed.subtotal)}</span></div>
              {isIntraState ? (
                <>
                  <div className="flex justify-between py-1"><span>CGST</span><span>₹{inr(computed.totalGst / 2)}</span></div>
                  <div className="flex justify-between py-1"><span>SGST</span><span>₹{inr(computed.totalGst / 2)}</span></div>
                </>
              ) : (
                <div className="flex justify-between py-1"><span>IGST</span><span>₹{inr(computed.totalGst)}</span></div>
              )}
              {roundOff && (
                <div className="flex justify-between py-1"><span>Round Off</span><span>{computed.roundOffAmount < 0 ? '-' : '+'}₹{inr(Math.abs(computed.roundOffAmount))}</span></div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-gray-800 font-bold text-base"><span>Total</span><span>₹{roundOff ? computed.grandTotal.toLocaleString('en-IN') : inr(computed.grandTotal)}</span></div>
            </div>
          </div>}

          {values && <div className="mb-4">
            <p className="text-xs font-bold uppercase text-gray-500">Amount in Words</p>
            <p className="text-sm">{amountInWords(computed.grandTotal)}</p>
          </div>}

          {hasBankDetails && doc.kind !== 'challan' && (
            <div className="mb-4 border border-gray-300 rounded p-3" style={{ breakInside: 'avoid' }}>
              <p className="text-xs font-bold uppercase text-gray-500 mb-1.5">Bank Details for Payment</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {bank.accountName && <p><span className="text-gray-500">A/c Name: </span>{bank.accountName}</p>}
                {bank.bankName && <p><span className="text-gray-500">Bank: </span>{bank.bankName}</p>}
                {bank.accountNumber && <p><span className="text-gray-500">A/c No: </span><span className="font-medium">{bank.accountNumber}</span></p>}
                {bank.ifsc && <p><span className="text-gray-500">IFSC: </span><span className="font-medium">{bank.ifsc}</span></p>}
                {bank.branch && <p><span className="text-gray-500">Branch: </span>{bank.branch}</p>}
                {bank.upi && <p><span className="text-gray-500">UPI ID: </span>{bank.upi}</p>}
              </div>
            </div>
          )}

          {notes && (
            <div className="mb-4">
              <p className="text-xs font-bold uppercase text-gray-500">Notes</p>
              <p className="text-sm text-gray-600">{notes}</p>
            </div>
          )}

          {doc.kind === 'challan' && (
            <div className="grid grid-cols-2 gap-8 mt-8 mb-4 text-sm" style={{ breakInside: 'avoid' }}>
              <div><div className="h-12 border-b border-gray-500" /><p className="text-gray-600 mt-1">Received by (name, signature &amp; date)</p></div>
              <div className="text-right"><div className="h-12 border-b border-gray-500" /><p className="text-gray-600 mt-1">For {seller.name || 'your business'} — Authorised signatory</p></div>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center border-t border-gray-200 pt-3 leading-relaxed">
            {doc.footer}
          </p>
        </div>
      </main>

      <footer className={`${inputCls} border-t border-border py-6`}>
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Free online tools by{' '}
          <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            HowAutomate
          </a>
        </div>
      </footer>
    </div>
  );
};

export default GstInvoiceGenerator;
