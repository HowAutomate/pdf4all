/**
 * Builds the text encoded inside a QR code for each kind of code. These
 * formats are what phones and payment apps recognise when they scan.
 */

/** UPI IDs look like name@bank (e.g. 9876543210@ybl, shop.name@okhdfcbank). */
export const UPI_ID = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;

export interface UpiInput { upiId: string; name: string; amount?: string; note?: string }

/** NPCI UPI deep link: upi://pay?pa=…&pn=…&am=…&cu=INR&tn=… */
export function upiPayload(u: UpiInput): { text: string; error?: string } {
  const pa = u.upiId.trim();
  if (!UPI_ID.test(pa)) return { text: '', error: 'Enter a valid UPI ID, like yourname@okhdfcbank or 9876543210@ybl.' };
  const params: [string, string][] = [['pa', pa], ['pn', u.name.trim() || pa]];
  const amt = (u.amount ?? '').trim();
  if (amt) {
    if (!/^\d+(\.\d{1,2})?$/.test(amt) || Number(amt) <= 0) return { text: '', error: 'Amount must be a number like 250 or 99.50.' };
    params.push(['am', Number(amt).toFixed(2)]);
  }
  params.push(['cu', 'INR']);
  if (u.note?.trim()) params.push(['tn', u.note.trim().slice(0, 50)]);
  return { text: `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` };
}

/** wa.me link. A bare 10-digit Indian mobile number gets +91 added. */
export function whatsappPayload(phone: string, message: string): { text: string; error?: string } {
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11 || digits.length > 15) return { text: '', error: 'Enter the WhatsApp number with country code, e.g. 9876543210 or +91 98765 43210.' };
  return { text: `https://wa.me/${digits}${message.trim() ? `?text=${encodeURIComponent(message.trim())}` : ''}` };
}

const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');

/** Wi-Fi join code understood by Android and iPhone cameras. */
export function wifiPayload(ssid: string, password: string, security: 'WPA' | 'WEP' | 'nopass', hidden = false): { text: string; error?: string } {
  if (!ssid.trim()) return { text: '', error: 'Enter the Wi-Fi network name.' };
  const p = security === 'nopass' ? '' : `P:${wifiEscape(password)};`;
  return { text: `WIFI:T:${security};S:${wifiEscape(ssid)};${p}${hidden ? 'H:true;' : ''};` };
}

const vEscape = (s: string) => s.replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');

/** vCard 3.0 contact card. */
export function vcardPayload(c: { name: string; phone?: string; email?: string; org?: string; url?: string }): { text: string; error?: string } {
  if (!c.name.trim()) return { text: '', error: 'Enter a name for the contact.' };
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${vEscape(c.name.trim())}`, `N:${vEscape(c.name.trim())};;;;`];
  if (c.org?.trim()) lines.push(`ORG:${vEscape(c.org.trim())}`);
  if (c.phone?.trim()) lines.push(`TEL;TYPE=CELL:${c.phone.trim()}`);
  if (c.email?.trim()) lines.push(`EMAIL:${c.email.trim()}`);
  if (c.url?.trim()) lines.push(`URL:${c.url.trim()}`);
  lines.push('END:VCARD');
  return { text: lines.join('\r\n') };
}

/** Adds https:// to bare domains so scanners open them as links. */
export function linkPayload(s: string): { text: string; error?: string } {
  const t = s.trim();
  if (!t) return { text: '', error: 'Enter a link or some text.' };
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(t)) return { text: `https://${t}` };
  return { text: t };
}
