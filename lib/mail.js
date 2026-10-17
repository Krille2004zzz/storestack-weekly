import crypto from 'node:crypto';
export const SITE_URL = 'https://www.storestackweekly.com';
const secret = () => process.env.UNSUBSCRIBE_SECRET || crypto.createHash('sha256').update('ssw-unsub:' + (process.env.RESEND_API_KEY || '')).digest();
export const unsubToken = email => crypto.createHmac('sha256', secret()).update(String(email).trim().toLowerCase()).digest('hex').slice(0, 32);
export function validToken(email, token) {
  const a = Buffer.from(unsubToken(email)), b = Buffer.from(String(token || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const unsubUrl = email => `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubToken(email)}`;
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ADDRESS = 'StoreStack Weekly, Svedjevägen 34A, 645 44 Strängnäs, Sweden';
const BODY = `Hey,

Thanks for subscribing to StoreStack Weekly.

Every week you'll get 3 hand-picked Shopify apps and tools, with real prices and who they're actually for. No fluff, no 40-app roundups.

While you wait for the next issue, the directory has 95 tools and 27 head-to-head comparisons:
https://www.storestackweekly.com

Got a tool you love or one that burned you? Just reply, I read every email.

Kristian
StoreStack Weekly`;
export function welcomeEmail(email) {
  const u = unsubUrl(email);
  const text = `${BODY}\n\n--\n${ADDRESS}\nUnsubscribe: ${u}\n`;
  const paras = BODY.split('\n\n').map(p => `<p style="margin:0 0 16px">${esc(p).replace('https://www.storestackweekly.com', '<a href="https://www.storestackweekly.com" style="color:#16a34a">https://www.storestackweekly.com</a>').replace(/\n/g, '<br>')}</p>`).join('');
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;font-size:16px;line-height:1.55"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px">${paras}</div><p style="max-width:560px;margin:16px auto 0;color:#64748b;font-size:12px;text-align:center">${esc(ADDRESS)}<br><a href="${esc(u)}" style="color:#64748b">Unsubscribe</a></p></body></html>`;
  return {
    from: 'StoreStack Weekly <hello@storestackweekly.com>', to: [email], reply_to: 'hello@storestackweekly.com',
    subject: "You're in: StoreStack Weekly", html, text,
    headers: { 'List-Unsubscribe': `<${u}>, <mailto:hello@storestackweekly.com?subject=Unsubscribe>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
  };
}
