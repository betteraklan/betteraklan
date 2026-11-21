#!/usr/bin/env node
// Downloads workbook images that passed rules 1 to 5 for live records with a
// photo slot, using only the recorded URL. Run after the live import, then
// re-run the importer so it attaches the images from the manifest.
// Usage: node scripts/data-prep/fetch-tourism-images.mjs
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Image type and size from the file's own bytes, or null if not JPEG/PNG/WebP. */
export function sniffImage(b) {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47)
    return {
      type: 'image/png',
      ext: 'png',
      width: b.readUInt32BE(16),
      height: b.readUInt32BE(20),
    };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let p = 2;
    while (p + 9 < b.length) {
      if (b[p] !== 0xff) return null;
      const marker = b[p + 1];
      const len = b.readUInt16BE(p + 2);
      // SOF0..SOF15 except DHT (C4), JPG (C8), DAC (CC).
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marker)
      )
        return {
          type: 'image/jpeg',
          ext: 'jpg',
          height: b.readUInt16BE(p + 5),
          width: b.readUInt16BE(p + 7),
        };
      p += 2 + len;
    }
    return null;
  }
  if (
    b.length > 30 &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X')
      return {
        type: 'image/webp',
        ext: 'webp',
        width: 1 + b.readUIntLE(24, 3),
        height: 1 + b.readUIntLE(27, 3),
      };
    if (chunk === 'VP8 ')
      return {
        type: 'image/webp',
        ext: 'webp',
        width: b.readUInt16LE(26) & 0x3fff,
        height: b.readUInt16LE(28) & 0x3fff,
      };
    if (chunk === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return {
        type: 'image/webp',
        ext: 'webp',
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
  }
  return null;
}

const OWNED_FILE = /^AKL-\d{3}\.(jpg|png|webp)$/;

/** Deletes importer-owned files in `dir` that the manifest does not list. */
export function pruneOwnedFiles(dir, manifest) {
  if (!existsSync(dir)) return [];
  const keep = new Set(manifest.map(f => f.src.split('/').pop()));
  const removed = [];
  for (const f of readdirSync(dir))
    if (OWNED_FILE.test(f) && !keep.has(f)) {
      rmSync(join(dir, f));
      removed.push(f);
    }
  return removed;
}

/** Fetches one recorded URL; returns a manifest entry or throws why not. */
export async function fetchImage(recordId, url, fetchImpl = fetch) {
  // Wikimedia answers 429 to clients without a descriptive User-Agent.
  const res = await fetchImpl(url, {
    redirect: 'manual',
    headers: {
      'User-Agent':
        'BetterAklan-tourism-image-fetch/1.0 (https://github.com/betteraklan/betteraklan)',
    },
  });
  if (res.status !== 200)
    throw new Error(`HTTP ${res.status} (no redirects followed)`);
  const body = Buffer.from(await res.arrayBuffer());
  const declared = res.headers.get('content-length');
  if (declared !== null && Number(declared) !== body.length)
    throw new Error(`Incomplete body: ${body.length} of ${declared} bytes`);
  const img = sniffImage(body);
  if (!img) throw new Error('Response is not a JPEG, PNG or WebP image');
  return {
    entry: {
      recordId,
      file: `${recordId}.${img.ext}`,
      contentType: img.type,
      bytes: body.length,
      sha256: createHash('sha256').update(body).digest('hex'),
      width: img.width,
      height: img.height,
      overBudget: body.length > 500 * 1024,
      url,
    },
    body,
  };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const recon = JSON.parse(
    readFileSync(
      join(root, 'src/data/tourism/workbook-reconciliation.json'),
      'utf8'
    )
  );
  const dir = join(root, 'public/tourism');
  const manifest = [];
  for (const r of recon.records) {
    if (r.image.verdict !== 'pass' || !r.live || !r.image.hasPhotoSlot)
      continue;
    try {
      const { entry, body } = await fetchImage(
        r.recordId,
        r.image.row['Image URL or source']
      );
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, entry.file), body);
      // Manifest entry: alt and credit are copied from the workbook, verbatim.
      manifest.push({
        recordId: r.recordId,
        src: `/tourism/${entry.file}`,
        alt: `${r.itemName}, ${r.municipality}`,
        credit: r.image.row['Credit and reuse terms'],
      });
      r.image.file = entry;
      console.log(
        `${r.recordId}: saved ${entry.file} ${entry.width}x${entry.height}${entry.overBudget ? ' (over 500 KB)' : ''}`
      );
    } catch (e) {
      console.log(`${r.recordId}: not saved: ${e.message}`);
    }
  }
  manifest.sort((a, b) => a.recordId.localeCompare(b.recordId));
  const removed = pruneOwnedFiles(dir, manifest);
  if (removed.length) console.log(`Removed stale files: ${removed.join(', ')}`);
  writeFileSync(
    join(root, 'src/data/tourism/tourism-images.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  // Digest, size and dimensions go to the reconciliation file, not the manifest.
  writeFileSync(
    join(root, 'src/data/tourism/workbook-reconciliation.json'),
    `${JSON.stringify(recon, null, 2)}\n`
  );
  console.log(
    `${manifest.length} image(s) in the manifest. Re-run the importer to attach them.`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
