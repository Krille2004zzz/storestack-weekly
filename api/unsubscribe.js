// One-click unsubscribe: marks the contact unsubscribed in the Resend audience.
import { validToken, esc } from '../lib/mail.js';
const page = (title, msg) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | StoreStack Weekly</title></head><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:48px 16px"><div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px"><h1 style="font-size:1.4rem;margin:0 0 12px">${title}</h1><p>${msg}</p><p><a href="https://www.storestackweekly.com" style="color:#16a34a">Back to StoreStack Weekly</a></p></div></body></html>`;
export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return res.status(405).send('Method not allowed'); }
  const email = String(req.query.email || '').trim().toLowerCase(), token = String(req.query.token || '');
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
  if (!email || !validToken(email, token)) return res.status(400).send(page('Invalid link', 'This unsubscribe link is invalid or incomplete. Reply to any of our emails and we will remove you by hand.'));
  const key = process.env.RESEND_API_KEY, audience = process.env.RESEND_AUDIENCE_ID;
  try {
    const r = await fetch(`https://api.resend.com/audiences/${audience}/contacts/${encodeURIComponent(email)}`, { method: 'PATCH', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ unsubscribed: true }) });
    if (!r.ok && r.status !== 404) { console.error('Unsubscribe failed', r.status, await r.text()); return res.status(502).send(page('Something went wrong', 'Please try again in a minute, or reply to any of our emails to be removed.')); }
  } catch (e) { console.error(e); return res.status(502).send(page('Something went wrong', 'Please try again in a minute, or reply to any of our emails to be removed.')); }
  return res.status(200).send(page("You're unsubscribed", `${esc(email)} won't get any more emails from StoreStack Weekly. Changed your mind? You can sign up again on the site any time.`));
}
