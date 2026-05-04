/**
 * patch-cedis-bundle.cjs
 *
 * Patches the bundled CEDIS layout HTML to:
 *   1. Add `data-ubic={loc.ubicacion}` attribute to each rendered position rect
 *      (so external CSS can target specific positions).
 *   2. Preserve the original bundle structure (base64+gzip manifest).
 *
 * The patch is idempotent — running it multiple times produces the same result.
 *
 * Run after any time the standalone HTML is re-copied from source:
 *   node scripts/patch-cedis-bundle.cjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const HTML_PATH = path.join(__dirname, '..', 'public', 'cedis-layout', 'index.html');

// The two JS files in the bundle (by UUID prefix). Mapped to their patches.
const TARGET_FILES = {
  'fd3233eb': [
    // Plan view rect
    {
      find: `className={'pos' + (selected && selected.ubicacion===loc.ubicacion?' sel':'') + (hi?' hi':'') + (dim?' dim':'')}`,
      replace: `data-ubic={loc.ubicacion} className={'pos' + (selected && selected.ubicacion===loc.ubicacion?' sel':'') + (hi?' hi':'') + (dim?' dim':'')}`,
    },
    // Elevation view rect
    {
      find: `className={'pos' + (selected && selected.ubicacion===loc.ubicacion?' sel':'') + (hi?' hi':'') + (!visible?' dim':'')}`,
      replace: `data-ubic={loc.ubicacion} className={'pos' + (selected && selected.ubicacion===loc.ubicacion?' sel':'') + (hi?' hi':'') + (!visible?' dim':'')}`,
    },
    // Costilla "COST." text overflow — shrink font + widen rect
    {
      find: `<rect x={c.x - 10} y={yTop} width={20} height={yBot - yTop}`,
      replace: `<rect x={c.x - 14} y={yTop} width={28} height={yBot - yTop}`,
    },
    {
      find: `<text x={c.x} y={(yTop+yBot)/2 - 4} fontSize="7" fill={COLORS.staging} fontFamily="Inter" fontWeight="700" textAnchor="middle" letterSpacing=".1em">COST.</text>`,
      replace: `<text x={c.x} y={(yTop+yBot)/2 - 4} fontSize="5" fill={COLORS.staging} fontFamily="Inter" fontWeight="700" textAnchor="middle" letterSpacing=".04em">COST.</text>`,
    },
    {
      find: `<text x={c.x} y={(yTop+yBot)/2 + 7} fontSize="8" fill={COLORS.staging} fontFamily="JetBrains Mono" fontWeight="600" textAnchor="middle">{c.label}</text>`,
      replace: `<text x={c.x} y={(yTop+yBot)/2 + 7} fontSize="6" fill={COLORS.staging} fontFamily="JetBrains Mono" fontWeight="600" textAnchor="middle">{c.label}</text>`,
    },
  ],
};

function run() {
  let html = fs.readFileSync(HTML_PATH, 'utf8');

  const manifestMatch = html.match(/<script type="__bundler\/manifest">([\s\S]+?)<\/script>/);
  if (!manifestMatch) throw new Error('manifest not found');

  const manifest = JSON.parse(manifestMatch[1]);
  let patchedCount = 0;

  for (const [uuid, entry] of Object.entries(manifest)) {
    const uuidPrefix = uuid.slice(0, 8);
    const patches = TARGET_FILES[uuidPrefix];
    if (!patches) continue;

    // Decode
    const buf = Buffer.from(entry.data, 'base64');
    const decompressed = entry.compressed ? zlib.gunzipSync(buf) : buf;
    let js = decompressed.toString('utf8');

    let changed = false;
    for (const p of patches) {
      if (js.includes(p.replace)) {
        // Already patched — skip
        continue;
      }
      if (!js.includes(p.find)) {
        console.warn(`  Pattern not found in ${uuidPrefix}: ${p.find.slice(0, 60)}...`);
        continue;
      }
      js = js.replace(p.find, p.replace);
      changed = true;
      patchedCount++;
    }

    if (!changed) {
      console.log(`  ${uuidPrefix}: already patched or no changes needed`);
      continue;
    }

    // Re-encode
    const newBuf = Buffer.from(js, 'utf8');
    const newCompressed = zlib.gzipSync(newBuf);
    entry.data = newCompressed.toString('base64');
    entry.compressed = true;
    console.log(`  ✓ Patched ${uuidPrefix}: ${newBuf.length} bytes → ${newCompressed.length} bytes gzipped`);
  }

  if (patchedCount === 0) {
    console.log('Nothing to patch (already applied).');
    return;
  }

  // Serialize manifest back into HTML (replace the script tag content)
  const newManifestStr = JSON.stringify(manifest);
  html = html.replace(
    /<script type="__bundler\/manifest">[\s\S]+?<\/script>/,
    `<script type="__bundler/manifest">${newManifestStr}</script>`
  );

  fs.writeFileSync(HTML_PATH, html);
  console.log(`✓ Wrote patched HTML (${patchedCount} patches applied)`);
}

run();
