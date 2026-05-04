/**
 * Extract the React source code from "Layout CEDIS Lerma - Standalone.html"
 * The bundler uses base64 + gzip. This writes all assets to ./cedis-extracted/
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SRC = path.join(__dirname, '..', '..', 'Layout CEDIS Lerma - Standalone.html');
const OUT = path.join(__dirname, 'cedis-extracted');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const html = fs.readFileSync(SRC, 'utf8');

// Extract manifest
const manifestMatch = html.match(/<script type="__bundler\/manifest">([\s\S]+?)<\/script>/);
const templateMatch = html.match(/<script type="__bundler\/template">([\s\S]+?)<\/script>/);

if (!manifestMatch || !templateMatch) {
  console.error('Could not find bundler scripts');
  process.exit(1);
}

const manifest = JSON.parse(manifestMatch[1]);
const template = JSON.parse(templateMatch[1]);

console.log('UUIDs in manifest:', Object.keys(manifest).length);

// Decode assets
const uuids = Object.keys(manifest);
const assetMap = {}; // uuid → { mime, content }

for (const uuid of uuids) {
  const entry = manifest[uuid];
  const buf = Buffer.from(entry.data, 'base64');
  const decompressed = entry.compressed ? zlib.gunzipSync(buf) : buf;
  assetMap[uuid] = { mime: entry.mime, content: decompressed };

  // Save by index + mime
  const ext = entry.mime.includes('javascript') ? 'js'
            : entry.mime.includes('font') ? 'woff2'
            : entry.mime.includes('css') ? 'css'
            : entry.mime.includes('html') ? 'html'
            : 'bin';
  fs.writeFileSync(path.join(OUT, `${uuid}.${ext}`), decompressed);
}

// Save template
fs.writeFileSync(path.join(OUT, '_template.html'), template);

// Also save the raw file list
const summary = Object.entries(assetMap).map(([uuid, a]) => ({
  uuid, mime: a.mime, size: a.content.length, preview: a.mime.includes('javascript') ? a.content.toString('utf8').slice(0, 120) : ''
}));
fs.writeFileSync(path.join(OUT, '_summary.json'), JSON.stringify(summary, null, 2));

console.log('Extracted to:', OUT);
console.log('Summary:');
summary.forEach(s => console.log(' ', s.uuid.slice(0, 8), s.mime, s.size, 'bytes'));
