import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const dictPath = 'src/dictionaries';
for (const name of readdirSync(dictPath)) {
  if (!name.endsWith('.txt')) {
    continue;
  }
  const filePath = `${dictPath}/${name}`;
  const lines = readFileSync(filePath, 'utf8').trim().split('\n');
  const comments = lines.filter((it) => it.startsWith('#'));
  const words = lines.map((it) => it.trim()).filter((it) => !it.startsWith('#'));
  const result =
    [
      ...comments,
      ...words.toSorted((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), 'en')),
    ].join('\n') + '\n';
  writeFileSync(filePath, result);
}
