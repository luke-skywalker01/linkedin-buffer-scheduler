import 'dotenv/config';
import http from 'node:http';
import crypto from 'node:crypto';
import { weeklySlots, scheduleDraft } from './core.mjs';

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.INGEST_SECRET;
const CHANNEL_ID = process.env.BUFFER_CHANNEL_ID;
const MAX_BODY = 256 * 1024; // 256 KB reicht für 2 Text-Posts dicke

// Konstantzeit-Vergleich (verhindert Timing-Leaks beim Secret-Check).
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function authorized(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : (req.headers['x-ingest-secret'] || '');
  return SECRET && safeEqual(token, SECRET);
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('Body zu groß')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Plant die übergebenen Entwürfe in die Wochen-Slots (order 1 -> Mo, 2 -> Mi).
async function ingest(posts) {
  if (!CHANNEL_ID) throw new Error('BUFFER_CHANNEL_ID fehlt (Railway-Secret).');
  if (!Array.isArray(posts) || posts.length === 0) throw new Error('posts[] fehlt oder leer.');
  const slots = weeklySlots();
  const sorted = [...posts].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const results = [];
  for (let i = 0; i < Math.min(sorted.length, slots.length); i += 1) {
    const p = sorted[i];
    const when = slots[i];
    const text = String(p.text || '').trim();
    if (!text) throw new Error(`Entwurf #${i + 1}: leerer Text.`);
    const slug = `card-${when.toFormat('yyyyLLdd')}-${p.order ?? i + 1}`;
    const r = await scheduleDraft({
      channelId: CHANNEL_ID,
      text,
      image: p.image || null,
      card: p.card || null,
      when,
      slug,
    });
    results.push({ order: p.order ?? i + 1, ...r });
  }
  return results;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
    return send(res, 200, { ok: true, service: 'buffer-scheduler ingest', slots: weeklySlots().map((s) => s.toISO()) });
  }
  if (req.method === 'POST' && req.url === '/ingest') {
    if (!authorized(req)) return send(res, 401, { error: 'unauthorized' });
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const scheduled = await ingest(payload.posts);
      return send(res, 200, { ok: true, scheduled });
    } catch (e) {
      return send(res, 400, { ok: false, error: e.message });
    }
  }
  return send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`ingest-server läuft auf :${PORT} (POST /ingest, GET /health)`);
});
