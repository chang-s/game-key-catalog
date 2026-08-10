import fs from 'node:fs';
import path from 'node:path';
import { buildCoverIndex, normalizeCoverFilename } from './cover-assets.mjs';

const input = process.argv[2];
if (!input) throw new Error('Usage: npm run sync -- path/to/export.csv');

const text = fs.readFileSync(input, 'utf8');
const rows = [];
let row = [], cell = '', quoted = false;
for (let i = 0; i < text.length; i++) {
  const c = text[i], n = text[i + 1];
  if (c === '"' && quoted && n === '"') {
    cell += '"';
    i++;
  } else if (c === '"') quoted = !quoted;
  else if (c === ',' && !quoted) {
    row.push(cell);
    cell = '';
  } else if ((c === '\n' || c === '\r') && !quoted) {
    if (c === '\r' && n === '\n') i++;
    row.push(cell);
    if (row.some(Boolean)) rows.push(row);
    row = [];
    cell = '';
  } else cell += c;
}
row.push(cell);
if (row.some(Boolean)) rows.push(row);

const headers = rows.shift();
const required = ['Item ID', 'Title', 'Offer Type', 'Genre', 'Image Filename', 'Primary Keys', 'Other Region Keys', 'Date Added', 'Active'];
for (const h of required) if (!headers.includes(h)) throw new Error(`Missing required column: ${h}`);

const platforms = ['Xbox Play Anywhere', 'Xbox', 'Windows 10', 'Game Pass', 'Steam', 'Oculus', 'Battlenet', 'PlayStation 5', 'Mobile'];
const platformAliases = new Map([['PS5', 'PlayStation 5']]);
const normalizePlatform = platform => platformAliases.get(platform.trim()) ?? platform.trim();
const get = (r, h) => r[headers.indexOf(h)]?.trim() || '';
const num = (r, h) => Number(get(r, h) || 0);
const coverIndex = buildCoverIndex(new URL('../public/covers', import.meta.url));
const parseOtherRegionInventory = details => details.split(';').flatMap(group => {
  const [platform, ...regions] = group.split(':');
  return regions.join(':').split(',').map(value => {
    const match = value.trim().match(/^(.*?)\s*[x×]\s*(\d+)$/i);
    return match ? { platform: normalizePlatform(platform), region: match[1].trim(), quantity: Number(match[2]) } : null;
  }).filter(Boolean);
});

const sumQuantities = quantities => Object.values(quantities).reduce((total, quantity) => total + quantity, 0);
const deriveAvailability = ({ platformQuantities, otherRegionInventory, otherRegionKeys }) => {
  if (sumQuantities(platformQuantities) > 0) return 'Available';
  if ((otherRegionInventory || []).some(item => item.quantity > 0) || otherRegionKeys > 0) return 'Other Regions Only';
  return 'Out of Stock';
};

const games = rows.filter(r => get(r, 'Item ID')).map(r => {
  const otherRegionDetails = get(r, 'Other Region Details');
  const platformQuantities = Object.fromEntries(platforms.map(p => [p, num(r, p)]).filter(([, v]) => v > 0));
  const otherRegionInventory = otherRegionDetails ? parseOtherRegionInventory(otherRegionDetails) : undefined;
  const otherRegionKeys = num(r, 'Other Region Keys');
  return {
    id: get(r, 'Item ID').padStart(3, '0'),
    title: get(r, 'Title'),
    offerType: get(r, 'Offer Type'),
    genre: get(r, 'Genre'),
    ...(get(r, 'Edition / Item') && { edition: get(r, 'Edition / Item') }),
    imageFilename: normalizeCoverFilename(path.basename(get(r, 'Image Filename')), coverIndex, { id: get(r, 'Item ID').padStart(3, '0'), title: get(r, 'Title') }),
    platformQuantities,
    primaryKeys: num(r, 'Primary Keys'),
    otherRegionKeys,
    ...(otherRegionInventory && { otherRegionInventory }),
    availability: deriveAvailability({ platformQuantities, otherRegionInventory, otherRegionKeys }),
    ...(get(r, 'Region / Restrictions') && { regionRestrictions: get(r, 'Region / Restrictions') }),
    ...(get(r, 'Notes') && { notes: get(r, 'Notes') }),
    dateAdded: get(r, 'Date Added'),
    active: /^(true|yes|1)$/i.test(get(r, 'Active')),
  };
});

const serialized = JSON.stringify(games, null, 2);
const tokenPattern = /\b[A-Z0-9]{5}(?:-[A-Z0-9]{5}){4}\b/i;
if (tokenPattern.test(serialized)) throw new Error('Possible redemption token found. Output was not written.');
for (const g of games) {
  if (!/^\d{3}$/.test(g.id)) throw new Error(`Invalid Item ID: ${g.id}`);
  if (g.imageFilename.includes('/') || g.imageFilename.includes('\\')) throw new Error(`Unsafe image filename for ${g.id}`);
  const primaryTotal = sumQuantities(g.platformQuantities);
  if (primaryTotal !== g.primaryKeys) throw new Error(`Primary Keys total does not match platform quantities for ${g.id}`);
  const regionalTotal = (g.otherRegionInventory || []).reduce((total, item) => total + item.quantity, 0);
  if (regionalTotal !== g.otherRegionKeys) throw new Error(`Other Region Details total does not match Other Region Keys for ${g.id}`);
  if (g.availability !== deriveAvailability(g)) throw new Error(`Availability does not match inventory quantities for ${g.id}`);
}

const gamesUrl = new URL('../src/data/games.json', import.meta.url);
const metaUrl = new URL('../src/data/inventory-meta.json', import.meta.url);
const previousGames = fs.existsSync(gamesUrl) ? fs.readFileSync(gamesUrl, 'utf8').trimEnd() : '';
let lastUpdated;
if (previousGames === serialized) {
  try {
    lastUpdated = JSON.parse(fs.readFileSync(metaUrl, 'utf8')).lastUpdated;
  } catch {
    lastUpdated = new Date().toISOString();
  }
} else lastUpdated = new Date().toISOString();

fs.writeFileSync(gamesUrl, serialized + '\n');
fs.writeFileSync(metaUrl, JSON.stringify({ lastUpdated }, null, 2) + '\n');
console.log(`Wrote ${games.length} sanitized inventory items.`);
