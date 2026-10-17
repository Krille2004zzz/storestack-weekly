// Vercel serverless function: adds an email to the Resend audience; sends one welcome email to NEW contacts only.
import { welcomeEmail } from '../lib/mail.js';
const hits = new Map(); // best-effort per-instance rate limit
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000, max = 5;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (body && body.website) return res.status(200).json({ ok: true }); // honeypot: bots fill hidden field
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'Too many attempts. Please try again in a few minutes.' });
  const email = String((body && body.email) || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Please enter a valid email address.' });
  const key = process.env.RESEND_API_KEY, audience = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audience) return res.status(503).json({ error: 'Signups are not open yet. Please try again soon.' });
  const H = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const base = `https://api.resend.com/audiences/${audience}/contacts`;
  try {
    const g = await fetch(`${base}/${encodeURIComponent(email)}`, { headers: H });
    if (g.ok) { // existing contact: no welcome email; re-subscribe if they had unsubscribed
      const c = await g.json().catch(() => ({}));
      if (c.unsubscribed) await fetch(`${base}/${encodeURIComponent(email)}`, { method: 'PATCH', headers: H, body: JSON.stringify({ unsubscribed: false }) });
      return res.status(200).json({ ok: true });
    }
    const r = await fetch(base, { method: 'POST', headers: H, body: JSON.stringify({ email, unsubscribed: false }) });
    if (r.status === 409) return res.status(200).json({ ok: true });
    if (!r.ok) { console.error('Resend error', r.status, await r.text()); return res.status(502).json({ error: 'Something went wrong. Please try again.' }); }
    try { // welcome email; a failure here never fails the signup
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
      const e = await fetch('https://api.resend.com/emails', { method: 'POST', headers: H, body: JSON.stringify(welcomeEmail(email)), signal: ctl.signal });
      clearTimeout(t);
      if (!e.ok) console.error('Welcome email failed', e.status, await e.text());
    } catch (err) { console.error('Welcome email error', err); }
    return res.status(200).json({ ok: true });
  } catch (e) { console.error(e); return res.status(502).json({ error: 'Something went wrong. Please try again.' }); }
}
