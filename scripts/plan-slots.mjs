// Plant die Wochen-Slots (Mo/Mi 08:00 Wien) UND prüft, ob bei Buffer für den
// jeweiligen Wiener Kalendertag schon ein Post geplant ist (kein Doppel-Posten).
// Env: BUFFER_TOKEN, BUFFER_ORG_ID, BUFFER_CHANNEL_ID (BUFFER_API_URL optional).
// Ausgabe JSON: {mon:{dueAt,local,occupied}, wed:{dueAt,local,occupied}}
import { nextSlots } from './next-slots.mjs';

const token = process.env.BUFFER_TOKEN;
const org = process.env.BUFFER_ORG_ID;
const ch = process.env.BUFFER_CHANNEL_ID;
const apiUrl = process.env.BUFFER_API_URL || 'https://api.buffer.com/';
const TZ = 'Europe/Vienna';
const vDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

const s = nextSlots();
const occupiedDays = new Set();
if (token && org && ch) {
  const query = 'query($input:PostsInput!,$first:Int){posts(input:$input,first:$first){edges{node{status dueAt}}}}';
  const variables = { input: { organizationId: org, filter: { channelIds: [ch] } }, first: 100 };
  try {
    const res = await fetch(apiUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    const j = await res.json();
    const edges = (j && j.data && j.data.posts && j.data.posts.edges) || [];
    for (const e of edges) {
      const n = e.node;
      if (n && n.dueAt && String(n.status).toLowerCase() === 'scheduled') occupiedDays.add(vDay(n.dueAt));
    }
  } catch { /* Bei Query-Fehler: keine Belegung annehmen (lieber posten als Slot fälschlich überspringen). */ }
}

const out = {
  mon: { dueAt: s.mon, local: s.monLocal, occupied: occupiedDays.has(vDay(s.mon)) },
  wed: { dueAt: s.wed, local: s.wedLocal, occupied: occupiedDays.has(vDay(s.wed)) },
};
console.log(JSON.stringify(out));
