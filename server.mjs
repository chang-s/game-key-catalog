import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number.parseInt(process.env.PORT ?? '3000', 10);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.cur': 'image/x-icon',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function resolveRequestPath(url = '/') {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const relativePath = normalize(pathname).replace(/^([/\\])+/, '');
  const candidate = join(root, relativePath || 'index.html');

  try {
    return statSync(candidate).isFile() ? candidate : join(root, 'index.html');
  } catch {
    return join(root, 'index.html');
  }
}

createServer((request, response) => {
  const filePath = resolveRequestPath(request.url);
  response.setHeader('Content-Type', contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  const stream = createReadStream(filePath);
  stream.on('error', () => {
    response.writeHead(500);
    response.end('Unable to serve the application.');
  });
  stream.pipe(response);
}).listen(port, '0.0.0.0', () => {
  console.log(`Game Key Bakery is listening on port ${port}`);
});
