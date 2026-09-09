// Minimal static file server for the architecture diagram tab.
//
// The Kotlin image used `jwebserver`, which ships with the JDK. There is no JDK
// here, and adding python3 or an npm package for one static directory is more
// moving parts than this. Node's own http module is enough.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = '/opt/diagrams';
const PORT = 8090;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

createServer(async (req, res) => {
  // Strip the query string, then normalize before joining so ../ cannot escape ROOT.
  const rel = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const path = join(ROOT, rel === '/' ? 'parked-workflow.html' : rel);
  if (!path.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, '0.0.0.0', () => console.log(`diagrams on ${PORT} from ${ROOT}`));
