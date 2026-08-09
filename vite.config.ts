import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';

const lastUpdated = (()=>{
  try {
    return execFileSync('git',['log','-1','--format=%cI'],{encoding:'utf8'}).trim();
  } catch {
    return new Date().toISOString();
  }
})();

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: { __LAST_UPDATED__: JSON.stringify(lastUpdated) },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.ts' }
});
