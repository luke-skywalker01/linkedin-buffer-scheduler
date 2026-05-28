// Standalone (KEINE Dependencies, nur node built-ins): plant EINEN Post in Buffer.
// Aufruf: node scripts/post-to-buffer.mjs <textFile> <imageUrl|-> <dueAtISO>
// Env:   BUFFER_TOKEN (Pflicht), BUFFER_CHANNEL_ID (Pflicht), BUFFER_API_URL (optional)
import { readFile } from 'node:fs/promises';

const [textFile, imageUrlArg, dueAt] = process.argv.slice(2);
const token = process.env.BUFFER_TOKEN;
const channelId = process.env.BUFFER_CHANNEL_ID;
const apiUrl = process.env.BUFFER_API_URL || 'https://api.buffer.com/';
if (!token || !channelId) { console.error('FEHLER: BUFFER_TOKEN/BUFFER_CHANNEL_ID fehlt'); process.exit(1); }
if (!textFile || !dueAt) { console.error('usage: node scripts/post-to-buffer.mjs <textFile> <imageUrl|-> <dueAtISO>'); process.exit(1); }

const text = (await readFile(textFile, 'utf8')).trim();
const imageUrl = (imageUrlArg && imageUrlArg !== '-') ? imageUrlArg : null;
const assets = imageUrl ? [{ image: { url: imageUrl } }] : [];
const query = 'mutation Create($input: CreatePostInput!){createPost(input:$input){__typename ... on PostActionSuccess{post{id}} ... on InvalidInputError{message} ... on UnauthorizedError{message} ... on NotFoundError{message} ... on LimitReachedError{message} ... on UnexpectedError{message}}}';
const input = { channelId, text, schedulingType: 'automatic', mode: 'customScheduled', dueAt, assets };

const res = await fetch(apiUrl, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { input } }),
});
const json = await res.json().catch(() => null);
const r = json && json.data && json.data.createPost;
if (!r || r.__typename !== 'PostActionSuccess') {
  console.error('FEHLER beim Einplanen:', JSON.stringify(json));
  process.exit(1);
}
console.log('OK', r.post.id);
