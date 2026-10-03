import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import { upiPayload, whatsappPayload, wifiPayload, vcardPayload, linkPayload } from '@/lib/qrPayload';

describe('QR payloads', () => {
  it('builds a UPI payment link with amount and note', () => {
    expect(upiPayload({ upiId: 'sharma.store@okhdfcbank', name: 'Sharma Store', amount: '250', note: 'Order 42' }).text)
      .toBe('upi://pay?pa=sharma.store%40okhdfcbank&pn=Sharma%20Store&am=250.00&cu=INR&tn=Order%2042');
  });

  it('leaves the amount open when none is given, and rejects bad input', () => {
    expect(upiPayload({ upiId: '9876543210@ybl', name: '' }).text).toBe('upi://pay?pa=9876543210%40ybl&pn=9876543210%40ybl&cu=INR');
    expect(upiPayload({ upiId: 'not-a-upi-id', name: 'X' }).error).toBeTruthy();
    expect(upiPayload({ upiId: 'a@ybl', name: 'X', amount: '-5' }).error).toBeTruthy();
    expect(upiPayload({ upiId: 'ab@ybl', name: 'X', amount: '10.555' }).error).toBeTruthy();
  });

  it('adds +91 to 10-digit WhatsApp numbers', () => {
    expect(whatsappPayload('98765 43210', 'Hi, I want to order').text).toBe('https://wa.me/919876543210?text=Hi%2C%20I%20want%20to%20order');
    expect(whatsappPayload('+1 415 555 0100', '').text).toBe('https://wa.me/14155550100');
    expect(whatsappPayload('123', '').error).toBeTruthy();
  });

  it('escapes Wi-Fi special characters', () => {
    expect(wifiPayload('Cafe;Guest', 'pa:ss"1', 'WPA').text).toBe('WIFI:T:WPA;S:Cafe\\;Guest;P:pa\\:ss\\"1;;');
    expect(wifiPayload('Open', 'ignored', 'nopass').text).toBe('WIFI:T:nopass;S:Open;;');
  });

  it('builds a vCard and normalises bare links', () => {
    const v = vcardPayload({ name: 'Amit Singh', phone: '+919602094213', org: 'HowAutomate' }).text;
    expect(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Amit Singh')).toBe(true);
    expect(v).toContain('TEL;TYPE=CELL:+919602094213');
    expect(linkPayload('howautomate.com/tools').text).toBe('https://howautomate.com/tools');
    expect(linkPayload('Just some text').text).toBe('Just some text');
  });

  it('produces a scannable-size QR for a typical UPI link', async () => {
    const qr = QRCode.create(upiPayload({ upiId: 'sharma.store@okhdfcbank', name: 'Sharma Store', amount: '250' }).text, { errorCorrectionLevel: 'M' });
    expect(qr.modules.size).toBeLessThanOrEqual(45); // version ≤ 7 — easy to scan from print
  });
});
