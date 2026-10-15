// Vercel serverless function: adds an email to the Resend audience. Sends no email.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const email = String((body && body.email) || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Please enter a valid email address.' });
  const key = process.env.RESEND_API_KEY, audience = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audience) return res.status(503).json({ error: 'Signups are not open yet. Please try again soon.' });
  try {
    const r = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, unsubscribed: false })
    });
    if (r.ok || r.status === 409) return res.status(200).json({ ok: true });
    console.error('Resend error', r.status, await r.text());
    return res.status(502).json({ error: 'Something went wrong. Please try again.' });
  } catch (e) { console.error(e); return res.status(502).json({ error: 'Something went wrong. Please try again.' }); }
}
