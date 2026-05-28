// Berechnet die nächsten Slots Montag + Mittwoch, 08:00 Europe/Vienna, als
// UTC-ISO (Buffer `dueAt`). Nur eingebautes Intl — keine Dependencies, kein Shell-tz.
// Als Modul: import { nextSlots }. Direkt: `node scripts/next-slots.mjs` -> JSON.
const TZ = 'Europe/Vienna';
const HOUR = 8;
const WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function tzParts(date) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const o = {};
  for (const p of f.formatToParts(date)) if (p.type !== 'literal') o[p.type] = Number(p.value);
  if (o.hour === 24) o.hour = 0;
  return o;
}

function viennaWeekday(date) {
  return WD[new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(date)];
}

// UTC-Instant (ms) für eine Wiener Wanduhrzeit Y-M-D HH:00:00.
function viennaWallToUTC(y, m, d, hour) {
  const guess = Date.UTC(y, m - 1, d, hour, 0, 0);
  const p = tzParts(new Date(guess));
  const wallAsUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = wallAsUTC - guess; // tz-Offset zum Zeitpunkt guess
  return guess - offset;
}

function nextSlot(targetWd) {
  const now = Date.now();
  for (let add = 0; add <= 16; add += 1) {
    const day = tzParts(new Date(now + add * 86400000)); // Wiener Kalendertag in `add` Tagen
    const utc = viennaWallToUTC(day.year, day.month, day.day, HOUR);
    if (utc > now && viennaWeekday(new Date(utc)) === targetWd) return utc;
  }
  throw new Error(`kein Slot fuer weekday ${targetWd}`);
}

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const local = (ms) => new Intl.DateTimeFormat('de-AT', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));

export function nextSlots() {
  const monMs = nextSlot(1);
  const wedMs = nextSlot(3);
  return { mon: iso(monMs), wed: iso(wedMs), monLocal: local(monMs), wedLocal: local(wedMs) };
}

// Direkter Aufruf (nicht beim Import).
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('next-slots.mjs')) {
  console.log(JSON.stringify(nextSlots()));
}
