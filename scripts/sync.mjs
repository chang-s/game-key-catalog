import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
if (!input || process.argv.length > 3) throw new Error('Usage: npm run sync -- path/to/export.csv');

const runScript = (scriptPath, args = []) => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(scriptPath, import.meta.url)), ...args], {
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.signal) throw new Error(`${scriptPath} exited with signal ${result.signal}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
};

runScript('./sync-inventory.mjs', [input]);
runScript('./validate-cover-images.mjs');
