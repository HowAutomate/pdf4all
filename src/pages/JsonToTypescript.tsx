import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Code2, Copy, Check, Download, ChevronDown, ChevronUp,
  X, FileCode, Braces, FileJson, Database, Settings2,
  Upload, ArrowRight, Shield, Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
type JsonVal = string | number | boolean | null | JsonObj | JsonVal[];
type JsonObj = { [k: string]: JsonVal };

interface Opts {
  rootName: string;
  useType: boolean;
  optionalFields: boolean;
  readonlyFields: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function pascal(s: string) {
  return s.replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase()).replace(/^(.)/, (c: string) => c.toUpperCase());
}

// ── TypeScript Generation ─────────────────────────────────────────────────────
function tsFieldType(v: JsonVal, key: string, ifaces: Map<string, string>, opts: Opts): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  if (Array.isArray(v)) {
    if (!v.length) return 'unknown[]';
    const item = v[0];
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const n = pascal(key);
      buildTsInterface(item as JsonObj, n, ifaces, opts);
      return `${n}[]`;
    }
    return `${tsFieldType(item, key + 'Item', ifaces, opts)}[]`;
  }
  if (typeof v === 'object') {
    const n = pascal(key);
    buildTsInterface(v as JsonObj, n, ifaces, opts);
    return n;
  }
  return 'unknown';
}

function buildTsInterface(obj: JsonObj, name: string, ifaces: Map<string, string>, opts: Opts) {
  if (ifaces.has(name)) return;
  const kw = opts.useType ? 'type' : 'interface';
  const lines: string[] = [opts.useType ? `type ${name} = {` : `interface ${name} {`];
  for (const [k, v] of Object.entries(obj)) {
    const t = tsFieldType(v, k, ifaces, opts);
    const opt = opts.optionalFields ? '?' : '';
    const ro = opts.readonlyFields ? 'readonly ' : '';
    lines.push(`  ${ro}${k}${opt}: ${t};`);
  }
  lines.push(opts.useType ? '};' : '}');
  ifaces.set(name, lines.join('\n'));
}

function genTypeScript(src: string, opts: Opts): string {
  const json: JsonVal = JSON.parse(src);
  const ifaces = new Map<string, string>();
  if (Array.isArray(json)) {
    if (json.length && json[0] !== null && typeof json[0] === 'object' && !Array.isArray(json[0])) {
      buildTsInterface(json[0] as JsonObj, opts.rootName, ifaces, opts);
      return [...ifaces.values()].join('\n\n') + `\n\ntype ${opts.rootName}List = ${opts.rootName}[];`;
    }
    const t = typeof json[0] === 'string' ? 'string' : typeof json[0] === 'number' ? 'number' : typeof json[0] === 'boolean' ? 'boolean' : 'unknown';
    return `type ${opts.rootName}List = ${t}[];`;
  }
  if (json !== null && typeof json === 'object') {
    buildTsInterface(json as JsonObj, opts.rootName, ifaces, opts);
    return [...ifaces.values()].join('\n\n');
  }
  return `// Cannot generate interface for primitive value`;
}

// ── Zod Generation ────────────────────────────────────────────────────────────
function zodFieldType(v: JsonVal, key: string, schemas: Map<string, string>, opts: Opts): string {
  if (v === null) return 'z.null()';
  if (typeof v === 'string') return 'z.string()';
  if (typeof v === 'number') return Number.isInteger(v) ? 'z.number().int()' : 'z.number()';
  if (typeof v === 'boolean') return 'z.boolean()';
  if (Array.isArray(v)) {
    if (!v.length) return 'z.array(z.unknown())';
    const item = v[0];
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const sn = pascal(key) + 'Schema';
      buildZodSchema(item as JsonObj, sn, schemas, opts);
      return `z.array(${sn})`;
    }
    return `z.array(${zodFieldType(item, key + 'Item', schemas, opts)})`;
  }
  if (typeof v === 'object') {
    const sn = pascal(key) + 'Schema';
    buildZodSchema(v as JsonObj, sn, schemas, opts);
    return sn;
  }
  return 'z.unknown()';
}

function buildZodSchema(obj: JsonObj, name: string, schemas: Map<string, string>, opts: Opts) {
  if (schemas.has(name)) return;
  const lines: string[] = [`const ${name} = z.object({`];
  for (const [k, v] of Object.entries(obj)) {
    let t = zodFieldType(v, k, schemas, opts);
    if (opts.optionalFields) t = `${t}.optional()`;
    lines.push(`  ${k}: ${t},`);
  }
  lines.push('});');
  lines.push(`type ${name.replace(/Schema$/, '')} = z.infer<typeof ${name}>;`);
  schemas.set(name, lines.join('\n'));
}

function genZod(src: string, opts: Opts): string {
  const json: JsonVal = JSON.parse(src);
  const schemas = new Map<string, string>();
  const header = `import { z } from 'zod';\n\n`;
  if (Array.isArray(json)) {
    if (json.length && json[0] !== null && typeof json[0] === 'object' && !Array.isArray(json[0])) {
      const sn = opts.rootName + 'Schema';
      buildZodSchema(json[0] as JsonObj, sn, schemas, opts);
      return header + [...schemas.values()].join('\n\n') + `\n\nconst ${opts.rootName}ListSchema = z.array(${sn});`;
    }
    const t = typeof json[0] === 'string' ? 'z.string()' : typeof json[0] === 'number' ? 'z.number()' : 'z.boolean()';
    return header + `const ${opts.rootName}ListSchema = z.array(${t});`;
  }
  if (json !== null && typeof json === 'object') {
    buildZodSchema(json as JsonObj, opts.rootName + 'Schema', schemas, opts);
    return header + [...schemas.values()].join('\n\n');
  }
  return `// Cannot generate Zod schema for primitive value`;
}

// ── JSON Schema Generation ────────────────────────────────────────────────────
function jsonSchemaField(v: JsonVal, key: string): unknown {
  if (v === null) return { type: 'null' };
  if (typeof v === 'string') return { type: 'string', example: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { type: 'integer', example: v } : { type: 'number', example: v };
  if (typeof v === 'boolean') return { type: 'boolean' };
  if (Array.isArray(v)) {
    if (!v.length) return { type: 'array' };
    return { type: 'array', items: jsonSchemaField(v[0], key + 'Item') };
  }
  if (typeof v === 'object') return buildJsonSchemaObj(v as JsonObj);
  return {};
}

function buildJsonSchemaObj(obj: JsonObj): unknown {
  const props: Record<string, unknown> = {};
  const req: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    props[k] = jsonSchemaField(v, k);
    if (v !== null) req.push(k);
  }
  return { type: 'object', properties: props, ...(req.length ? { required: req } : {}) };
}

function genJsonSchema(src: string, opts: Opts): string {
  const json: JsonVal = JSON.parse(src);
  const base: Record<string, unknown> = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: opts.rootName,
  };
  if (Array.isArray(json)) {
    base.type = 'array';
    if (json.length) base.items = jsonSchemaField(json[0], opts.rootName);
  } else if (json !== null && typeof json === 'object') {
    Object.assign(base, buildJsonSchemaObj(json as JsonObj));
  }
  return JSON.stringify(base, null, 2);
}

// ── Mock Data Generation ──────────────────────────────────────────────────────
function mockVal(key: string, v: JsonVal): JsonVal {
  const kl = key.toLowerCase();
  if (v === null) return null;
  if (typeof v === 'string') {
    if (kl.includes('email')) return 'dev@example.com';
    if (kl.includes('url') || kl.includes('website') || kl.includes('link')) return 'https://example.com';
    if (kl.includes('name') && !kl.includes('file')) return 'John Doe';
    if (kl.includes('first')) return 'John';
    if (kl.includes('last')) return 'Doe';
    if (kl.includes('phone') || kl.includes('mobile')) return '+1-555-0100';
    if (kl.includes('date') || kl.includes('_at') || kl === 'timestamp') return '2024-01-15T10:30:00Z';
    if (kl.includes('city')) return 'San Francisco';
    if (kl.includes('country')) return 'United States';
    if (kl.includes('zip') || kl.includes('postal')) return '94105';
    if (kl.includes('street') || kl.includes('address')) return '123 Main St';
    if (kl.includes('title')) return 'Sample Title';
    if (kl.includes('description') || kl.includes('bio') || kl.includes('summary')) return 'Sample description text.';
    if (kl.includes('id') || kl.includes('uuid')) return 'abc-123-def-456';
    if (kl.includes('token') || kl.includes('key') || kl.includes('secret')) return 'sk-xxxxxxxxxxxxxxxxxxxx';
    if (kl.includes('color')) return '#7c3aed';
    if (kl.includes('tag') || kl.includes('label')) return 'sample-tag';
    return 'sample string';
  }
  if (typeof v === 'number') {
    if (kl.includes('id')) return 1;
    if (kl.includes('age')) return 28;
    if (kl.includes('price') || kl.includes('amount') || kl.includes('cost')) return 29.99;
    if (kl.includes('count') || kl.includes('total') || kl.includes('qty')) return 42;
    if (kl.includes('lat')) return 37.7749;
    if (kl.includes('lng') || kl.includes('lon')) return -122.4194;
    return Number.isInteger(v) ? 1 : 1.5;
  }
  if (typeof v === 'boolean') return true;
  if (Array.isArray(v)) {
    if (!v.length) return [];
    return [mockVal(key + 'Item', v[0])];
  }
  if (typeof v === 'object') {
    const r: JsonObj = {};
    for (const [k2, v2] of Object.entries(v as JsonObj)) r[k2] = mockVal(k2, v2);
    return r;
  }
  return v;
}

function genMock(src: string): string {
  const json: JsonVal = JSON.parse(src);
  if (Array.isArray(json)) {
    if (!json.length) return '[]';
    const item = json[0];
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      const mocked: JsonObj = {};
      for (const [k, v] of Object.entries(item as JsonObj)) mocked[k] = mockVal(k, v);
      return JSON.stringify([mocked], null, 2);
    }
    return JSON.stringify(json, null, 2);
  }
  if (json !== null && typeof json === 'object') {
    const mocked: JsonObj = {};
    for (const [k, v] of Object.entries(json as JsonObj)) mocked[k] = mockVal(k, v);
    return JSON.stringify(mocked, null, 2);
  }
  return JSON.stringify(json, null, 2);
}

// ── Constants ────────────────────────────────────────────────────────────────
const SAMPLE = `{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "age": 28,
    "isAdmin": false,
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "zipCode": "94105"
    },
    "tags": ["developer", "typescript"],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}`;

const RELATED = [
  { title: 'Password Generator', desc: 'Secure random passwords', path: '/password-generator', from: '#dc2626', to: '#ea580c' },
  { title: 'DateTime Converter', desc: 'Unix timestamps & dates', path: '/datetime-converter', from: '#d97706', to: '#ea580c' },
  { title: 'Word Counter',       desc: 'Words, chars & reading time', path: '/word-counter', from: '#16a34a', to: '#059669' },
  { title: 'BMI Calculator',     desc: 'Health metric calculator', path: '/bmi-calculator', from: '#db2777', to: '#e11d48' },
  { title: 'File to PDF',        desc: 'Convert files to PDF', path: '/pdf-converter', from: '#7c3aed', to: '#2563eb' },
];

const FAQS = [
  { q: 'What is TypeScript interface generation?', a: 'TypeScript interface generation creates strongly-typed interfaces from your JSON data. These interfaces define the shape of your data and enable type checking, autocompletion, and refactoring support in TypeScript projects.' },
  { q: 'What is a Zod schema?', a: 'Zod is a TypeScript-first schema validation library. A Zod schema validates that your data matches the expected structure at runtime, while also providing inferred TypeScript types — giving you both compile-time and runtime safety.' },
  { q: 'How do I convert JSON to TypeScript?', a: 'Paste your JSON data in the input panel on the left. The tool instantly generates TypeScript interfaces, Zod schemas, JSON Schema definitions, and mock data. Copy or download any output with one click.' },
  { q: 'Is this tool free?', a: 'Yes, completely free with no limits. No signup, no credits, no subscriptions — ever.' },
  { q: 'Is my JSON data secure?', a: 'Absolutely. All processing happens 100% in your browser using JavaScript. Your JSON is never sent to any server, stored anywhere, or shared with anyone.' },
];

const TABS = [
  { id: 'typescript', label: 'TypeScript', icon: FileCode, ext: 'ts' },
  { id: 'zod',        label: 'Zod Schema', icon: Braces,   ext: 'ts' },
  { id: 'jsonschema', label: 'JSON Schema', icon: FileJson, ext: 'json' },
  { id: 'mock',       label: 'Mock Data',  icon: Database,  ext: 'json' },
] as const;

type TabId = typeof TABS[number]['id'];
type Output = Record<TabId, string>;

// ── Component ────────────────────────────────────────────────────────────────
const JsonToTypescript = () => {
  const [input, setInput]         = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('typescript');
  const [error, setError]         = useState('');
  const [output, setOutput]       = useState<Output>({ typescript: '', zod: '', jsonschema: '', mock: '' });
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [showAdv, setShowAdv]     = useState(false);
  const [isDrag, setIsDrag]       = useState(false);
  const [opts, setOpts]           = useState<Opts>({ rootName: 'Root', useType: false, optionalFields: false, readonlyFields: false });
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Auto-generate (debounced) ─────────────────────────────────────────────
  useEffect(() => {
    if (!input.trim()) {
      setOutput({ typescript: '', zod: '', jsonschema: '', mock: '' });
      setError('');
      return;
    }
    const t = setTimeout(() => {
      try {
        setOutput({
          typescript: genTypeScript(input, opts),
          zod:        genZod(input, opts),
          jsonschema: genJsonSchema(input, opts),
          mock:       genMock(input),
        });
        setError('');
      } catch (e) {
        const msg = e instanceof SyntaxError ? e.message : String(e);
        setError(`Invalid JSON — ${msg}`);
        setOutput({ typescript: '', zod: '', jsonschema: '', mock: '' });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [input, opts]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        formatJson();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const content = output[activeTab];
        if (content) doCopy(content, activeTab);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output, activeTab]);

  const formatJson = useCallback(() => {
    try { setInput(JSON.stringify(JSON.parse(input), null, 2)); } catch { /* error shown inline */ }
  }, [input]);

  const doCopy = async (text: string, tab: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const doDownload = (tab: TabId) => {
    const content = output[tab];
    if (!content) return;
    const ext = TABS.find(t => t.id === tab)!.ext;
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${opts.rootName.toLowerCase()}.${ext}`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setInput(e.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const hasOutput = !!output.typescript;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="JSON to TypeScript & Zod Generator — HowAutomate Tools"
        description="Convert JSON to TypeScript interfaces, Zod schemas, and JSON Schema instantly. Free online developer tool — no signup, 100% in-browser."
        path="/json-to-typescript-zod"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'JSON to TypeScript & Zod Generator',
          url: 'https://tools.howautomate.com/json-to-typescript-zod',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          description: 'Convert JSON to TypeScript interfaces, Zod schemas, and JSON Schema instantly.',
        }}
      />

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(7,4,15,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <img src={logo} alt="HowAutomate" style={{ height: 54, width: 'auto', display: 'block' }} />
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="https://howautomate.com/blog" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              Blog
            </a>
            <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 11, background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', color: '#fff', textDecoration: 'none', boxShadow: '0 4px 16px rgba(14,165,233,0.4)', transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              Visit HowAutomate
            </a>
          </nav>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#07040f', padding: '64px 32px 52px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-18%', left: '15%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', top: '5%', right: '10%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)', backgroundSize: '52px 52px' }} />
        </div>
        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 15px', borderRadius: 100, background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', fontSize: 11, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 22 }}>
            <Sparkles size={11} /> Developer Tool
          </div>
          <div style={{ display: 'inline-flex', padding: 16, borderRadius: 20, background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', boxShadow: '0 10px 32px rgba(14,165,233,0.45)', marginBottom: 20 }}>
            <Code2 style={{ width: 32, height: 32, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 900, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            JSON → TypeScript &amp; Zod Generator
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.46)', lineHeight: 1.75, margin: '0 0 24px' }}>
            Paste JSON and instantly get TypeScript interfaces, Zod validation schemas, JSON Schema definitions, and typed mock data.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px 32px' }}>
            {[['Instant', 'No wait, 100% in-browser'], ['TypeScript + Zod', 'Both generated at once'], ['Free Forever', 'No signup needed']].map(([t, d]) => (
              <div key={t} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{t}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <main className="flex-1" style={{ maxWidth: 1400, margin: '0 auto', width: '100%', padding: '28px 24px 80px' }}>

        {/* 2-column tool layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── INPUT PANEL ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <Card className="shadow-lg flex-1">
              <CardContent className="pt-4 pb-4">
                {/* Panel header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-sm font-semibold text-foreground">JSON Input</span>
                    {input && !error && (
                      <span className="text-xs text-emerald-500 font-medium">✓ Valid JSON</span>
                    )}
                    {error && (
                      <span className="text-xs text-destructive font-medium">✗ Invalid</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
                      onClick={() => navigator.clipboard.readText().then(t => setInput(t)).catch(() => toast.error('Clipboard access denied'))}>
                      <Upload className="w-3 h-3 mr-1" />Paste
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={formatJson} disabled={!input || !!error}>
                      Format
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={() => setInput(SAMPLE)}>
                      Sample
                    </Button>
                    {input && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setInput('')} title="Clear">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Textarea with drag-drop */}
                <div
                  className="relative"
                  onDragOver={e => { e.preventDefault(); setIsDrag(true); }}
                  onDragLeave={() => setIsDrag(false)}
                  onDrop={handleDrop}
                >
                  <textarea
                    className={cn(
                      'w-full h-[420px] lg:h-[500px] p-4 rounded-xl bg-muted/50 border text-foreground text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all',
                      error ? 'border-destructive/60' : 'border-border',
                    )}
                    placeholder={`{\n  "user": {\n    "name": "John",\n    "age": 25,\n    "isAdmin": true\n  }\n}`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    spellCheck={false}
                  />
                  {isDrag && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/10 border-2 border-dashed border-primary/60 pointer-events-none">
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-primary font-semibold text-sm">Drop your .json file here</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error display */}
                {error && (
                  <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono">
                    ⚠ {error}
                  </div>
                )}

                {/* File upload hint */}
                <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
                <p className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>Drag &amp; drop a .json file or{' '}
                    <button onClick={() => fileRef.current?.click()} className="text-primary hover:underline">browse</button>
                  </span>
                  <span className="opacity-60">Ctrl+Enter = Format &nbsp;·&nbsp; Ctrl+Shift+C = Copy</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── OUTPUT PANEL ────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <Card className="shadow-lg flex-1">
              <CardContent className="pt-4 pb-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
                  <div className="flex items-center justify-between mb-3">
                    <TabsList className="h-8">
                      {TABS.map(tab => (
                        <TabsTrigger key={tab.id} value={tab.id} className="text-xs px-2.5 h-7 gap-1">
                          <tab.icon className="w-3 h-3" />{tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {hasOutput && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Copy"
                          onClick={() => doCopy(output[activeTab], activeTab)}>
                          {copiedTab === activeTab ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Download"
                          onClick={() => doDownload(activeTab)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {TABS.map(tab => (
                    <TabsContent key={tab.id} value={tab.id} className="mt-0">
                      {output[tab.id] ? (
                        <div className="relative group">
                          <pre className="w-full h-[420px] lg:h-[500px] p-4 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-mono leading-relaxed overflow-auto whitespace-pre">
                            <code>{output[tab.id]}</code>
                          </pre>
                          {/* Floating copy/download in code block */}
                          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-background/90 border border-border hover:bg-muted transition-colors"
                              onClick={() => doCopy(output[tab.id], tab.id)}>
                              {copiedTab === tab.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              {copiedTab === tab.id ? 'Copied!' : 'Copy'}
                            </button>
                            <button
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-background/90 border border-border hover:bg-muted transition-colors"
                              onClick={() => doDownload(tab.id)}>
                              <Download className="w-3 h-3" /> .{tab.ext}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[420px] lg:h-[500px] flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-dashed border-border">
                          <tab.icon className="w-10 h-10 text-muted-foreground/30 mb-3" />
                          <p className="text-sm text-muted-foreground font-medium">
                            {input && error ? 'Fix the JSON error to see output' : 'Paste JSON on the left to generate'}
                          </p>
                          {!input && (
                            <button
                              onClick={() => setInput(SAMPLE)}
                              className="mt-3 text-xs text-primary hover:underline font-medium">
                              Load sample JSON →
                            </button>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── ADVANCED OPTIONS ────────────────────────────────────── */}
        <div className="mt-4">
          <button
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
            onClick={() => setShowAdv(v => !v)}>
            <Settings2 className="w-4 h-4" />
            Advanced Options
            {showAdv
              ? <ChevronUp className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />
              : <ChevronDown className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />}
          </button>

          {showAdv && (
            <Card className="mt-3 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Root name */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Root Interface Name</label>
                    <input
                      type="text"
                      value={opts.rootName}
                      onChange={e => setOpts(o => ({ ...o, rootName: e.target.value || 'Root' }))}
                      className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Root"
                    />
                  </div>
                  {/* Toggles */}
                  {[
                    { key: 'useType',        label: 'Use type alias',   desc: 'Use type instead of interface' },
                    { key: 'optionalFields', label: 'Optional fields',  desc: 'Add ? to all fields' },
                    { key: 'readonlyFields', label: 'Readonly fields',  desc: 'Add readonly modifier' },
                  ].map(opt => (
                    <div key={opt.key}>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">{opt.label}</label>
                      <button
                        onClick={() => setOpts(o => ({ ...o, [opt.key]: !o[opt.key as keyof Opts] }))}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                          opts[opt.key as keyof Opts]
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'bg-muted/40 border-border text-muted-foreground',
                        )}>
                        <span className={cn('w-4 h-4 rounded flex items-center justify-center text-[10px] border shrink-0 transition-all',
                          opts[opt.key as keyof Opts] ? 'bg-primary border-primary text-white' : 'border-muted-foreground')}>
                          {opts[opt.key as keyof Opts] ? '✓' : ''}
                        </span>
                        {opt.desc}
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── PRIVACY NOTE ────────────────────────────────────────── */}
        <div className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <Shield className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% Private.</span>{' '}
            All processing happens locally in your browser using JavaScript. Your JSON data is never uploaded, stored, or shared with anyone.
          </p>
        </div>

        {/* ── RELATED TOOLS ───────────────────────────────────────── */}
        <div className="mt-10">
          <h2 className="text-lg font-bold mb-4">More Free Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {RELATED.map(t => (
              <Link key={t.path} to={t.path} className="group block rounded-xl p-4 border border-border bg-card hover:border-primary/30 hover:bg-muted/40 transition-all">
                <div className="w-8 h-8 rounded-lg mb-2.5 shrink-0"
                  style={{ background: `linear-gradient(135deg,${t.from},${t.to})` }} />
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{t.desc}</p>
                <div className="flex items-center gap-1 mt-2 text-xs font-semibold" style={{ backgroundImage: `linear-gradient(90deg,${t.from},${t.to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Open <ArrowRight className="w-3 h-3 shrink-0" style={{ color: t.to }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <div className="mt-10 max-w-2xl">
          <h2 className="text-lg font-bold mb-4">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-4 overflow-hidden">
                <AccordionTrigger className="text-sm font-semibold text-left py-4 hover:no-underline hover:text-primary transition-colors">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Free developer tools by{' '}
          <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            HowAutomate
          </a>
        </div>
      </footer>
    </div>
  );
};

export default JsonToTypescript;
