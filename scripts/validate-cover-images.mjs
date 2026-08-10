import fs from 'node:fs';
import { buildCoverIndex, validateGameCoverReferences } from './cover-assets.mjs';

const gamesUrl = new URL('../src/data/games.json', import.meta.url);
const coverDir = new URL('../public/covers', import.meta.url);
const games = JSON.parse(fs.readFileSync(gamesUrl, 'utf8'));
const errors = validateGameCoverReferences(games, buildCoverIndex(coverDir));

if (errors.length) {
  console.error(`Found ${errors.length} invalid cover image reference${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${games.length} cover image references.`);
