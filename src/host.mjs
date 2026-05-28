import 'dotenv/config';

const OWNER = process.env.GITHUB_OWNER || 'luke-skywalker01';
const REPO = process.env.GITHUB_REPO || 'linkedin-buffer-scheduler';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;

// Committet einen PNG-Buffer nach images/<filename> via GitHub Contents API
// und gibt die öffentliche Raw-URL zurück (die Buffer dann laden kann).
export async function commitImage(buffer, filename) {
  if (!TOKEN) throw new Error('GITHUB_TOKEN fehlt (als Railway-Secret setzen).');
  const repoPath = `images/${filename}`;
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${repoPath}`;
  const headers = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' };

  // Existiert die Datei schon? Dann sha für Update holen (sonst 422).
  let sha;
  const getRes = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers });
  if (getRes.status === 200) sha = (await getRes.json()).sha;

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `card: ${filename}`,
      content: Buffer.from(buffer).toString('base64'),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!putRes.ok) throw new Error(`GitHub commit fehlgeschlagen (${putRes.status}): ${await putRes.text()}`);
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${repoPath}`;
}
