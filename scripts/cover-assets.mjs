import fs from 'node:fs';
import path from 'node:path';

const imageExtensionPattern = /\.(?:avif|gif|jpe?g|png|webp)$/i;

export function buildCoverIndex(coverDir) {
  const files = fs.readdirSync(coverDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && imageExtensionPattern.test(entry.name))
    .map(entry => entry.name);
  const exact = new Set(files);
  const lower = new Map();
  const stems = new Map();

  for (const file of files) {
    lower.set(file.toLowerCase(), file);
    const stem = coverStem(file);
    stems.set(stem, [...(stems.get(stem) ?? []), file]);
  }

  return { coverDir, exact, lower, stems };
}

export function normalizeCoverFilename(rawFilename, index, context = {}) {
  const original = String(rawFilename ?? '').trim();
  if (!original) return '';

  const filename = path.basename(original);
  if (!imageExtensionPattern.test(filename)) {
    throw new Error(`${labelFor(context)} has unsupported image extension: ${original}`);
  }

  if (index.exact.has(filename)) return filename;

  const caseMatch = index.lower.get(filename.toLowerCase());
  if (caseMatch) return caseMatch;

  const extensionMatches = index.stems.get(coverStem(filename)) ?? [];
  if (extensionMatches.length === 1) return extensionMatches[0];
  if (extensionMatches.length > 1) {
    throw new Error(`${labelFor(context)} has ambiguous cover filename ${original}; matches ${extensionMatches.join(', ')}`);
  }

  throw new Error(`${labelFor(context)} references missing cover image: ${original}`);
}

export function validateGameCoverReferences(games, index) {
  const errors = [];

  for (const game of games) {
    const original = String(game.imageFilename ?? '').trim();
    if (!original) continue;

    if (original.includes('/') || original.includes('\\')) {
      errors.push(`${labelFor(game)} uses a path instead of a filename: ${original}`);
      continue;
    }

    let normalized;
    try {
      normalized = normalizeCoverFilename(original, index, game);
    } catch (error) {
      errors.push(error.message);
      continue;
    }

    if (normalized !== original) {
      errors.push(`${labelFor(game)} references ${original}, but the repository asset is ${normalized}`);
    }
  }

  return errors;
}

function coverStem(filename) {
  return filename.replace(/\.[^.]+$/, '').toLowerCase();
}

function labelFor(context) {
  const id = context.id ? `${context.id} ` : '';
  const title = context.title ? `${context.title}` : 'inventory item';
  return `${id}${title}`.trim();
}
