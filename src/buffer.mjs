import 'dotenv/config';

const API_URL = process.env.BUFFER_API_URL || 'https://graph.buffer.com/';
const TOKEN = process.env.BUFFER_TOKEN;

// Generischer GraphQL-Request mit Bearer-Auth (laut Buffer-Docs).
export async function gql(query, variables = {}) {
  if (!TOKEN) throw new Error('BUFFER_TOKEN fehlt — in .env / Railway-Secret setzen.');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error('Buffer GraphQL Fehler:\n' + JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

// Listet Mutations/Queries des Live-Schemas — DAMIT finalisieren wir die exakten
// Mutation-Namen/Felder (createScheduledPost unten), sobald der Token gesetzt ist.
export async function introspect() {
  const q = `{
    __schema {
      mutationType { fields { name } }
      queryType { fields { name } }
    }
  }`;
  return gql(q);
}

// Verbundene Kanäle holen, um die LinkedIn-Channel-ID zu finden.
// HINWEIS: Feldnamen ggf. via introspect bestätigen.
export async function channels() {
  const orgId = process.env.BUFFER_ORG_ID;
  if (!orgId) throw new Error('BUFFER_ORG_ID fehlt (in .env setzen).');
  const q = `query Ch($input: ChannelsInput!) { channels(input: $input) { id service name } }`;
  return gql(q, { input: { organizationId: orgId } });
}

// Geplanten Post anlegen (gegen Live-Schema verifiziert 2026-05-28).
// createPost(input: CreatePostInput!) -> PostActionPayload (Union).
// assets: [] = Text-only. Bild-Assets folgen als nächster Schritt (Buffer-Medienformat 25.05.2026).
const POST_RESULT = `
  __typename
  ... on PostActionSuccess { post { id } }
  ... on InvalidInputError { message }
  ... on UnauthorizedError { message }
  ... on NotFoundError { message }
  ... on LimitReachedError { message }
  ... on UnexpectedError { message }
  ... on RestProxyError { message }`;

export async function createScheduledPost({ channelId, text, scheduledAtISO, imageUrl = null }) {
  // Bild muss als ÖFFENTLICHE URL vorliegen (ImageAssetInput.url ist Pflicht; Buffer zieht sich die URL).
  const assets = imageUrl ? [{ image: { url: imageUrl } }] : [];
  const m = `mutation Create($input: CreatePostInput!) { createPost(input: $input) { ${POST_RESULT} } }`;
  const input = {
    channelId,
    text,
    schedulingType: 'automatic',
    mode: 'customScheduled',
    dueAt: scheduledAtISO,
    assets,
  };
  const data = await gql(m, { input });
  const r = data.createPost;
  if (r.__typename !== 'PostActionSuccess') {
    throw new Error(`createPost fehlgeschlagen (${r.__typename}): ${r.message || 'unbekannt'}`);
  }
  return r.post; // { id }
}

export async function deletePost(id) {
  const m = `mutation Del($input: DeletePostInput!) {
    deletePost(input: $input) { __typename ... on VoidMutationError { message } }
  }`;
  const data = await gql(m, { input: { id } });
  return data.deletePost;
}

// Argumente einer Mutation (z. B. createPost) inkl. Typnamen.
export async function mutationArgs(name) {
  const q = `{ __type(name: "Mutation") { fields { name type { kind name ofType { kind name } } args { name type { kind name ofType { kind name ofType { kind name } } } } } } }`;
  const d = await gql(q);
  return (d.__type.fields || []).find((f) => f.name === name) || null;
}

// Felder eines (Input-)Typs.
export async function typeFields(name) {
  const q = `query T($n: String!) {
    __type(name: $n) {
      name kind
      enumValues { name }
      possibleTypes { name }
      inputFields { name type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } }
      fields { name }
    }
  }`;
  return gql(q, { n: name });
}

// Mini-CLI: `node src/buffer.mjs introspect|channels|args <Mutation>|type <TypeName>`
const cmd = process.argv[2];
const run = (p) => p.then((d) => console.log(JSON.stringify(d, null, 2))).catch((e) => { console.error(e.message); process.exit(1); });
if (cmd === 'introspect') run(introspect());
else if (cmd === 'channels') run(channels());
else if (cmd === 'args') run(mutationArgs(process.argv[3]));
else if (cmd === 'type') run(typeFields(process.argv[3]));
else if (cmd === 'selftest') run((async () => {
  const channelId = process.env.BUFFER_CHANNEL_ID;
  if (!channelId) throw new Error('BUFFER_CHANNEL_ID fehlt.');
  const post = await createScheduledPost({
    channelId,
    text: '[[selftest]] Buffer-API Verbindungstest – bitte ignorieren.',
    scheduledAtISO: '2030-01-09T07:00:00.000Z',
  });
  const deleted = await deletePost(post.id);
  return { created: post, deleted };
})());
else if (cmd === 'selftest-image') run((async () => {
  const channelId = process.env.BUFFER_CHANNEL_ID;
  if (!channelId) throw new Error('BUFFER_CHANNEL_ID fehlt.');
  const post = await createScheduledPost({
    channelId,
    text: '[[selftest-image]] Bild-Asset-Test – bitte ignorieren.',
    scheduledAtISO: '2030-01-09T07:00:00.000Z',
    imageUrl: 'https://www.myclimate.org/fileadmin/_processed_/c/6/csm_LLB_alter-hauptsitz-rzl_f07497a83d.png',
  });
  const deleted = await deletePost(post.id);
  return { created: post, deleted };
})());
