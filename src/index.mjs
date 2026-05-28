import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { nextWeekdayAt } from './dates.mjs';
import { createScheduledPost } from './buffer.mjs';

const QUEUE_DIR = path.resolve('queue');
const CHANNEL_ID = process.env.BUFFER_CHANNEL_ID;
const HOUR = Number(process.env.POST_HOUR || 8);

// Lädt alle freigegebenen Posts (status: approved) aus queue/, sortiert nach `order`.
async function loadApproved() {
  const files = (await readdir(QUEUE_DIR)).filter((f) => f.endsWith('.md'));
  const posts = [];
  for (const f of files) {
    const { data, content } = matter(await readFile(path.join(QUEUE_DIR, f), 'utf8'));
    if (String(data.status || '').toLowerCase() === 'approved') {
      posts.push({ file: f, text: content.trim(), image: data.image || null, order: data.order ?? 99 });
    }
  }
  return posts.sort((a, b) => a.order - b.order);
}

async function main() {
  if (!CHANNEL_ID) throw new Error('BUFFER_CHANNEL_ID fehlt — `npm run channels` ausführen.');
  const approved = await loadApproved();
  if (approved.length === 0) {
    console.log('Keine freigegebenen Posts in queue/ (status: approved). Nichts zu tun.');
    return;
  }
  // Slot 1 = nächster Montag, Slot 2 = nächster Mittwoch, jeweils HOUR Uhr Wien.
  const slots = [nextWeekdayAt(1, HOUR), nextWeekdayAt(3, HOUR)];
  for (let i = 0; i < Math.min(approved.length, slots.length); i += 1) {
    const p = approved[i];
    const when = slots[i];
    console.log(`Plane "${p.file}" -> ${when.toFormat('ccc dd.LL.yyyy HH:mm')} (${when.zoneName})`);
    if (p.image) console.log(`  Bild: ${p.image}`);
    const res = await createScheduledPost({
      channelId: CHANNEL_ID,
      text: p.text,
      scheduledAtISO: when.toUTC().toISO(),
      imageUrl: p.image || null, // öffentliche Bild-URL (z. B. Zitatkarte auf R2/GitHub)
    });
    console.log(`  ✓ eingeplant (id ${res.id})`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
