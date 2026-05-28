import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { weeklySlots, scheduleDraft } from './core.mjs';

const QUEUE_DIR = path.resolve('queue');
const CHANNEL_ID = process.env.BUFFER_CHANNEL_ID;

// Lädt alle freigegebenen Posts (status: approved) aus queue/, sortiert nach `order`.
async function loadApproved() {
  const files = (await readdir(QUEUE_DIR)).filter((f) => f.endsWith('.md'));
  const posts = [];
  for (const f of files) {
    const { data, content } = matter(await readFile(path.join(QUEUE_DIR, f), 'utf8'));
    if (String(data.status || '').toLowerCase() === 'approved') {
      posts.push({ file: f, text: content.trim(), image: data.image || null, card: data.card || null, order: data.order ?? 99 });
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
  const slots = weeklySlots();
  for (let i = 0; i < Math.min(approved.length, slots.length); i += 1) {
    const p = approved[i];
    const when = slots[i];
    console.log(`Plane "${p.file}" -> ${when.toFormat('ccc dd.LL.yyyy HH:mm')} (${when.zoneName})`);
    const r = await scheduleDraft({
      channelId: CHANNEL_ID,
      text: p.text,
      image: p.image,
      card: p.card,
      when,
      slug: p.file.replace(/\.md$/, ''),
    });
    if (r.imageUrl) console.log(`  Bild: ${r.imageUrl}`);
    console.log(`  ✓ eingeplant (id ${r.id})`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
