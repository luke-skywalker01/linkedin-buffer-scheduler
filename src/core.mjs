import { nextWeekdayAt } from './dates.mjs';
import { createScheduledPost } from './buffer.mjs';
import { renderCardPng } from './card.mjs';
import { commitImage } from './host.mjs';

const HOUR = Number(process.env.POST_HOUR || 8);

// Die beiden Wochen-Slots: [0] = nächster Montag, [1] = nächster Mittwoch (HOUR Uhr Wien).
// Reihenfolge entspricht dem `order`-Feld der Entwürfe (1 -> Mo, 2 -> Mi).
export function weeklySlots() {
  return [nextWeekdayAt(1, HOUR), nextWeekdayAt(3, HOUR)];
}

// Plant EINEN Entwurf in Buffer ein: Bild bestimmen (feste URL ODER Zitatkarte
// rendern + ins Repo hosten), dann createScheduledPost. Liefert Infos zum Loggen.
export async function scheduleDraft({ channelId, text, image = null, card = null, when, slug }) {
  let imageUrl = image || null;
  if (!imageUrl && card && card.quote) {
    const png = await renderCardPng(card);
    imageUrl = await commitImage(png, `${slug}.png`);
  }
  const res = await createScheduledPost({
    channelId,
    text,
    scheduledAtISO: when.toUTC().toISO(),
    imageUrl,
  });
  return {
    id: res.id,
    imageUrl,
    whenISO: when.toISO(),
    whenLabel: when.toFormat('ccc dd.LL.yyyy HH:mm'),
    zone: when.zoneName,
  };
}
