import { DateTime } from 'luxon';

// weekday: 1=Mo ... 7=So (Luxon). Liefert das nächste Vorkommen von `weekday`
// um `hour` Uhr in der Zukunft, als Luxon-DateTime in `zone`.
export function nextWeekdayAt(weekday, hour = 8, zone = 'Europe/Vienna') {
  const now = DateTime.now().setZone(zone);
  let dt = now.set({ hour, minute: 0, second: 0, millisecond: 0 });
  let guard = 0;
  while ((dt.weekday !== weekday || dt <= now) && guard < 15) {
    dt = dt.plus({ days: 1 }).set({ hour, minute: 0, second: 0, millisecond: 0 });
    guard += 1;
  }
  return dt;
}
