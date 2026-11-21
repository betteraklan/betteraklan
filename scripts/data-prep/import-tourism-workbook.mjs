#!/usr/bin/env node
// Imports the approved Aklan tourism workbook into src/data/tourism/.
// Usage: node scripts/data-prep/import-tourism-workbook.mjs --xlsx <path>
//          [--dry-run] [--no-pins] [--baseline <git revision>]
// Offline: reads the workbook, the pinned baseline (municipalities.json at a
// git revision), saved owner decisions and the image manifest. No network.
// Content is copied verbatim: no trimming, re-casing or other edits.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';

// ---------------------------------------------------------------- xlsx ----

/** Reads a zip archive into a Map of entry name -> Buffer. */
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip file (no end of central directory)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50)
      throw new Error('Bad zip central directory');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start =
      local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data));
    else throw new Error(`Unsupported zip compression ${method} for ${name}`);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#')
      return String.fromCodePoint(
        e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      );
    if (!(e in ENTITIES)) throw new Error(`Unknown XML entity ${m}`);
    return ENTITIES[e];
  });
}

/** Minimal well-formedness-checking XML parser: { name, attrs, children }. */
export function parseXml(xml) {
  const root = { name: '#root', attrs: {}, children: [] };
  const stack = [root];
  let i = 0;
  const text = t => {
    if (t) stack[stack.length - 1].children.push(decodeEntities(t));
  };
  while (i < xml.length) {
    const lt = xml.indexOf('<', i);
    if (lt < 0) {
      text(xml.slice(i));
      break;
    }
    text(xml.slice(i, lt));
    if (xml.startsWith('<?', lt)) i = xml.indexOf('?>', lt) + 2;
    else if (xml.startsWith('<!--', lt)) i = xml.indexOf('-->', lt) + 3;
    else if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt);
      stack[stack.length - 1].children.push(xml.slice(lt + 9, end));
      i = end + 3;
    } else if (xml.startsWith('<!', lt)) i = xml.indexOf('>', lt) + 1;
    else if (xml[lt + 1] === '/') {
      const end = xml.indexOf('>', lt);
      const name = xml.slice(lt + 2, end).trim();
      const top = stack.pop();
      if (!top || top.name !== name)
        throw new Error(`Mismatched XML close tag </${name}>`);
      i = end + 1;
    } else {
      // Find the tag end outside quoted attribute values.
      let j = lt + 1;
      let q = null;
      for (; j < xml.length; j++) {
        const c = xml[j];
        if (q) {
          if (c === q) q = null;
        } else if (c === '"' || c === "'") q = c;
        else if (c === '>') break;
      }
      let body = xml.slice(lt + 1, j);
      const selfClose = body.endsWith('/');
      if (selfClose) body = body.slice(0, -1);
      const m = body.match(/^([^\s]+)/);
      const node = { name: m[1], attrs: {}, children: [] };
      const re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let a;
      while ((a = re.exec(body.slice(m[1].length))))
        node.attrs[a[1]] = decodeEntities(a[3] ?? a[4]);
      stack[stack.length - 1].children.push(node);
      if (!selfClose) stack.push(node);
      i = j + 1;
    }
    if (i <= 0) throw new Error('Unterminated XML construct');
  }
  if (stack.length !== 1) throw new Error('Unclosed XML element');
  return root;
}

const local = n => n.name.replace(/^.*:/, '');
const kids = (n, name) =>
  n.children.filter(c => typeof c !== 'string' && local(c) === name);
const kid = (n, name) => kids(n, name)[0];
const textOf = n =>
  n.children.map(c => (typeof c === 'string' ? c : textOf(c))).join('');
// Rich-text runs concatenate; phonetic runs (rPh) are not cell text.
const richText = n =>
  n.children
    .filter(c => typeof c !== 'string')
    .map(c =>
      local(c) === 't' ? textOf(c) : local(c) === 'r' ? richText(c) : ''
    )
    .join('');

const colIndex = ref => {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
};

/** Returns { sheetName: [{ row, cells: string[] }] } with exact cell text. */
export function readXlsx(buf) {
  const zip = readZip(buf);
  const xmlOf = path => {
    const b = zip.get(path);
    if (!b) throw new Error(`Workbook part missing: ${path}`);
    return parseXml(b.toString('utf8'));
  };
  const wb = xmlOf('xl/workbook.xml');
  const rels = xmlOf('xl/_rels/workbook.xml.rels');
  const target = new Map(
    kids(kid(rels, 'Relationships'), 'Relationship').map(r => [
      r.attrs.Id,
      r.attrs.Target,
    ])
  );
  const shared = zip.has('xl/sharedStrings.xml')
    ? kids(kid(xmlOf('xl/sharedStrings.xml'), 'sst'), 'si').map(richText)
    : [];
  const sheets = {};
  for (const s of kids(kid(kid(wb, 'workbook'), 'sheets'), 'sheet')) {
    const rid = Object.entries(s.attrs).find(([k]) => /(^|:)id$/.test(k))?.[1];
    const t = target.get(rid);
    if (!t) throw new Error(`No relationship for sheet ${s.attrs.name}`);
    const path = t.startsWith('/') ? t.slice(1) : posix.join('xl', t);
    const data = kid(kid(xmlOf(path), 'worksheet'), 'sheetData');
    let rowNo = 0;
    sheets[s.attrs.name] = kids(data, 'row').map(r => {
      rowNo = r.attrs.r ? Number(r.attrs.r) : rowNo + 1;
      const cells = [];
      let col = -1;
      for (const c of kids(r, 'c')) {
        col = c.attrs.r ? colIndex(c.attrs.r) : col + 1;
        const v = kid(c, 'v');
        const type = c.attrs.t;
        cells[col] =
          type === 's'
            ? shared[Number(textOf(v))]
            : type === 'inlineStr'
              ? richText(kid(c, 'is'))
              : v
                ? textOf(v)
                : '';
      }
      return { row: rowNo, cells: Array.from(cells, x => x ?? '') };
    });
  }
  return sheets;
}

// ------------------------------------------------------------ matching ----

export const CONTENT_TAB = 'Municaplity Contents';
export const IMAGE_TAB = 'Image Sources';
export const CONTENT_HEADERS = [
  'Municipality',
  'Category',
  'Item name',
  'Content Description',
  'Location/barangay',
  'Source URL',
  'Record ID',
];
export const IMAGE_HEADERS = [
  'Record ID',
  'Municipality',
  'Item name',
  'Image URL or source',
  'Photo source page',
  'What the image shows',
  'Download result',
  'HTTP status',
  'Content type',
  'Downloaded bytes',
  'Credit and reuse terms',
  'Unavailable or held URL',
  'Open image/source',
];
export const CATEGORY = {
  'Spots & Attractions': { array: 'attractions', prefix: 'place' },
  'Festivals & Events': { array: 'festivals', prefix: 'event' },
  'Products & Local Delicacies': { array: 'products', prefix: 'product' },
  Description: null,
};
const ARRAYS = ['attractions', 'festivals', 'products'];
const PREFIX = {
  attractions: 'place',
  festivals: 'event',
  products: 'product',
};
const STOP = new Set('the of and in at de ng sa a an to'.split(' '));

/** Exact-match key: NFKD, no diacritics, lowercase, & -> and, alnum only. */
export const matchKey = s =>
  s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}]/gu, '');
const tokens = s =>
  s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(t => t && !STOP.has(t));

/** Candidate-twin score, or null when the names don't qualify. */
export function twinScore(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return null;
  const inter = [...A].filter(t => B.has(t)).length;
  const jaccard = inter / (A.size + B.size - inter);
  const [small, big] = A.size <= B.size ? [A, B] : [B, A];
  const contained = [...small].every(t => big.has(t));
  const strong = small.size >= 2 || [...small][0].length >= 6;
  if (jaccard >= 0.5 || (contained && strong))
    return Math.round(jaccard * 1000) / 1000;
  return null;
}

// ---------------------------------------------------------- image rules ----

const NOT_VERIFIED =
  /\bnot\s+(independently\s+)?(verified|checked|confirmed)\b/i;
const PAGE_URL =
  /google\.[a-z.]+\/(search|imgres)|[?&]tbm=isch|\.pdf($|[?#])|\.html?($|[?#])/i;
const EXPIRING_URL =
  /[?&](oe|_nc_[a-z_]*|expires?|x-amz-expires|x-goog-expires|exp|sig|signature|token)=|fbcdn\.net/i;
const SUBJECT_FAIL =
  /\b(partial|name[- ]only|illustrative|generic|not\s+specific|not\s+[a-z-]+-specific)\b/i;
// Human judgements recorded by the integrating agent, not computed.
export const SUBJECT_HOLDS = {
  'AKL-026':
    'Shows a single landmark standing for the whole municipality overview; needs an owner decision that it represents Banga.',
};

/** Licence-note class, first match wins (prompt section 3). */
export function licenceClass(note) {
  const weak = /not stated|not confirmed|confirm|not specified/i;
  const explicit =
    /public domain|creative commons|\bcc[ -]?(by|0)\b/i.test(note) &&
    !/see source for credit and reuse terms/i.test(note) &&
    !weak.test(note) &&
    !NOT_VERIFIED.test(note) &&
    !/not verified/i.test(note);
  if (explicit) return 'explicit';
  if (/see source for credit and reuse terms/i.test(note)) return 'see-source';
  if (weak.test(note)) return 'not-stated';
  return 'other';
}

/**
 * The Creative Commons licence a credit names, when it is one the site can
 * use as-is: Attribution (BY) or Attribution-ShareAlike (BY-SA), versions 2.0
 * to 4.0. NonCommercial and NoDerivatives licences are not accepted. Returns
 * the licence name and its deed URL, or null.
 */
export function ccLicence(note) {
  if (/\bNC\b|non-?commercial|\bND\b|no-?deriv/i.test(note)) return null;
  const m =
    /\bCC[ -]BY(-SA)?[ -]([234]\.0)\b/i.exec(note) ??
    /creative commons attribution(-share-?alike)?[ -]([234]\.0)\b/i.exec(note);
  if (!m) return null;
  const sa = !!m[1];
  return {
    name: `CC BY${sa ? '-SA' : ''} ${m[2]}`,
    url: `https://creativecommons.org/licenses/by${sa ? '-sa' : ''}/${m[2]}/`,
  };
}

/** Applies image rules 1 to 5 to the recorded row. Returns { verdict, reasons }. */
export function evaluateImage(img) {
  const url = img['Image URL or source'];
  const held = img['Unavailable or held URL'];
  const result = img['Download result'];
  const shows = img['What the image shows'];
  const type = img['Content type'];
  const status = img['HTTP status'];
  const credit = img['Credit and reuse terms'];
  const reasons = [];
  if (!url) return { verdict: 'none', reasons: ['No image URL recorded'] };
  // Rule 1: a direct image file.
  const directEvidence =
    /^image\//i.test(type) ||
    /\b(jpe?g|png|webp)\s+signature\b/i.test(result) ||
    /direct image\b.*\b(opened|rendered)\b/i.test(result);
  if (!/^https?:\/\//i.test(url)) reasons.push('1: not an http(s) URL');
  if (PAGE_URL.test(url))
    reasons.push('1: URL is a page, search result or PDF, not an image file');
  if (/^(text\/html|application\/pdf)/i.test(type))
    reasons.push(`1: recorded content type is ${type}`);
  if (!directEvidence)
    reasons.push('1: no recorded evidence that the URL is a direct image');
  if (held && held === url) reasons.push('1: URL is the retired held link');
  // Rule 2: recorded verification, without conflicting evidence.
  if (
    !/(downloaded and verified|signature|opened and rendered|rendered)/i.test(
      result
    )
  )
    reasons.push('2: result does not record verification of an image');
  if (NOT_VERIFIED.test(result) || /not verified/i.test(result))
    reasons.push('2: result says the image was not verified');
  if (status === '200' && /^text\//i.test(type))
    reasons.push('2: HTTP 200 with a non-image content type');
  // Rule 3: the subject matches.
  if (!shows) reasons.push('3: "What the image shows" is blank');
  if (SUBJECT_FAIL.test(shows))
    reasons.push(
      '3: subject note says partial, name-only, illustrative or generic'
    );
  if (/\b(partial|name[- ]only)\b/i.test(result))
    reasons.push('3: download result says PARTIAL or NAME-ONLY');
  // Rule 4: public domain, or CC BY / BY-SA shown with a link to the licence
  // and to the photo's source page (owner decision, 2026-11-21).
  const cls = licenceClass(credit);
  if (cls !== 'explicit')
    reasons.push(`4: licence ${cls === 'other' ? 'unclear' : cls}`);
  else if (!/public domain/i.test(credit)) {
    if (!ccLicence(credit))
      reasons.push(
        '4: Creative Commons licence is not CC BY or CC BY-SA 2.0 to 4.0 (held)'
      );
    else if (!/^https?:\/\//i.test(img['Photo source page'] ?? ''))
      reasons.push('4: CC photo needs its source page for attribution');
  }
  // Rule 5: no signed or expiring link.
  if (EXPIRING_URL.test(url) || /expir/i.test(`${result} ${shows}`))
    reasons.push('5: signed or expiring link');
  if (reasons.length) return { verdict: 'fail', reasons };
  if (SUBJECT_HOLDS[img['Record ID']])
    return {
      verdict: 'hold',
      reasons: [`3: ${SUBJECT_HOLDS[img['Record ID']]}`],
    };
  return { verdict: 'pass', reasons: [] };
}

// -------------------------------------------------------------- import ----

const clone = x => JSON.parse(JSON.stringify(x));
const rowObj = (headers, cells) =>
  Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));

function checkHeaders(rows, expected, tab) {
  const got = rows[0]?.cells.slice(0, expected.length) ?? [];
  if (got.join('\u0000') !== expected.join('\u0000'))
    throw new Error(`${tab}: unexpected headers ${JSON.stringify(got)}`);
}

/**
 * Pure import. Inputs are parsed data; returns the files to write.
 * `saved` = { pairs, heldRecords } from twin-pairs.json; `slots` from
 * workbook-slots.json; `manifest` from tourism-images.json.
 */
export function runImport({
  sheets,
  baseline,
  baselineRevision,
  workbookSha256,
  saved = { pairs: [], heldRecords: [] },
  slots = {},
  manifest = [],
  current = null,
  noPins = false,
}) {
  const content = sheets[CONTENT_TAB];
  const images = sheets[IMAGE_TAB];
  if (!content || !images)
    throw new Error(`Workbook needs tabs "${CONTENT_TAB}" and "${IMAGE_TAB}"`);
  checkHeaders(content, CONTENT_HEADERS, CONTENT_TAB);
  checkHeaders(images, IMAGE_HEADERS, IMAGE_TAB);

  const isBlank = cells => cells.every(c => c === '');
  const blankRows = [];
  const records = [];
  for (const r of content.slice(1)) {
    if (isBlank(r.cells)) {
      blankRows.push(r.row);
      continue;
    }
    records.push({ sheetRow: r.row, ...rowObj(CONTENT_HEADERS, r.cells) });
  }
  const imageRows = new Map();
  const imageBlankRows = [];
  for (const r of images.slice(1)) {
    if (isBlank(r.cells)) {
      imageBlankRows.push(r.row);
      continue;
    }
    const o = rowObj(IMAGE_HEADERS, r.cells);
    if (imageRows.has(o['Record ID']))
      throw new Error(`${IMAGE_TAB}: duplicate Record ID ${o['Record ID']}`);
    imageRows.set(o['Record ID'], o);
  }

  // Validate IDs and tab agreement before merging anything.
  const ids = new Set();
  for (const r of records) {
    const id = r['Record ID'];
    if (!/^AKL-\d{3}$/.test(id))
      throw new Error(`Row ${r.sheetRow}: bad Record ID "${id}"`);
    if (ids.has(id)) throw new Error(`Duplicate Record ID ${id}`);
    ids.add(id);
    const img = imageRows.get(id);
    if (!img) throw new Error(`${id} is missing from ${IMAGE_TAB}`);
    if (
      img.Municipality !== r.Municipality ||
      img['Item name'] !== r['Item name']
    )
      throw new Error(`${id}: municipality or item name differs between tabs`);
    if (!(r.Category in CATEGORY))
      throw new Error(`${id}: unknown category "${r.Category}"`);
  }
  for (const id of imageRows.keys())
    if (!ids.has(id)) throw new Error(`${id} is only in ${IMAGE_TAB}`);
  const nums = [...ids].map(id => Number(id.slice(4))).sort((a, b) => a - b);
  const idGaps = [];
  for (let n = nums[0]; n <= nums[nums.length - 1]; n++)
    if (!ids.has(`AKL-${String(n).padStart(3, '0')}`))
      idGaps.push(`AKL-${String(n).padStart(3, '0')}`);

  const out = clone(baseline);
  const muniByName = new Map(out.map(m => [m.name, m]));
  for (const r of records)
    if (!muniByName.has(r.Municipality))
      throw new Error(
        `${r['Record ID']}: unknown municipality ${r.Municipality}`
      );

  // Per-record flags. Blank or duplicated copy holds the record.
  const flags = new Map(records.map(r => [r['Record ID'], []]));
  const hold = new Map();
  const byDesc = new Map();
  for (const r of records) {
    const id = r['Record ID'];
    for (const f of [
      'Municipality',
      'Category',
      'Item name',
      'Content Description',
    ])
      if (r[f] === '') {
        flags.get(id).push(`Blank ${f}`);
        hold.set(id, `Blank ${f}`);
      }
    if (r['Location/barangay'] === '')
      flags.get(id).push('Blank Location/barangay');
    if (r['Content Description'])
      byDesc.set(r['Content Description'], [
        ...(byDesc.get(r['Content Description']) ?? []),
        id,
      ]);
  }
  const repeatedDescriptions = [...byDesc.values()].filter(g => g.length > 1);
  for (const g of repeatedDescriptions)
    for (const id of g) {
      const why = `Identical Content Description shared by ${g.join(', ')}: doubtful copy`;
      flags.get(id).push(why);
      hold.set(id, why);
    }
  const savedHeld = new Map(
    (saved.heldRecords ?? []).map(h => [h.recordId, h])
  );
  for (const [id, h] of savedHeld) {
    if (!hold.has(id) && h.decision !== 'pending')
      throw new Error(`Stale held-record decision for ${id}`);
    if (!['pending', 'publish'].includes(h.decision))
      throw new Error(`${id}: held-record decision must be pending or publish`);
  }
  const heldRecords = [...hold].map(([recordId, reason]) => ({
    recordId,
    reason,
    decision: savedHeld.get(recordId)?.decision ?? 'pending',
  }));
  const released = new Set(
    heldRecords.filter(h => h.decision === 'publish').map(h => h.recordId)
  );
  const isHeld = id => hold.has(id) && !released.has(id);

  // Exact matches against the baseline's named entries.
  const status = new Map(); // recordId -> { status, siteId? }
  const siteTaken = new Set(); // `${slug}:${array}:${index}`
  const siteName = (m, a, i) =>
    baseline.find(b => b.slug === m.slug)[a][i].name;
  for (const r of records) {
    const cat = CATEGORY[r.Category];
    if (!cat) continue;
    const m = muniByName.get(r.Municipality);
    const key = matchKey(r['Item name']);
    const i = m[cat.array].findIndex(
      (e, idx) =>
        e.name &&
        !siteTaken.has(`${m.slug}:${cat.array}:${idx}`) &&
        matchKey(e.name) === key
    );
    if (i >= 0) {
      siteTaken.add(`${m.slug}:${cat.array}:${i}`);
      status.set(r['Record ID'], {
        status: 'exact',
        array: cat.array,
        index: i,
        siteId: `${cat.prefix}-${m.slug}-${i}`,
        siteName: siteName(m, cat.array, i),
      });
    }
  }
  const siteOnly = [];
  for (const m of baseline)
    for (const a of ARRAYS)
      m[a].forEach((e, i) => {
        if (e.name && !siteTaken.has(`${m.slug}:${a}:${i}`))
          siteOnly.push({
            municipality: m.name,
            slug: m.slug,
            array: a,
            index: i,
            siteId: `${PREFIX[a]}-${m.slug}-${i}`,
            name: e.name,
          });
      });

  // Candidate twins: greedy one-to-one by score among unmatched names.
  const wbOnly = records.filter(
    r => CATEGORY[r.Category] && !status.has(r['Record ID'])
  );
  const cands = [];
  for (const r of wbOnly)
    for (const s of siteOnly) {
      if (s.municipality !== r.Municipality) continue;
      if (s.array !== CATEGORY[r.Category].array) continue;
      const score = twinScore(r['Item name'], s.name);
      if (score !== null) cands.push({ r, s, score });
    }
  cands.sort(
    (a, b) =>
      b.score - a.score ||
      a.r['Record ID'].localeCompare(b.r['Record ID']) ||
      a.s.siteId.localeCompare(b.s.siteId)
  );
  const pairedR = new Set();
  const pairedS = new Set();
  const pairs = [];
  for (const { r, s, score } of cands) {
    if (pairedR.has(r['Record ID']) || pairedS.has(s.siteId)) continue;
    pairedR.add(r['Record ID']);
    pairedS.add(s.siteId);
    pairs.push({ r, s, score, source: 'heuristic' });
  }
  // Owner-named aliases (source: "owner") join the heuristic pairs.
  const recById = new Map(records.map(r => [r['Record ID'], r]));
  for (const p of saved.pairs ?? []) {
    if (p.source !== 'owner') continue;
    const r = recById.get(p.recordId);
    const s = siteOnly.find(x => x.siteId === p.siteId);
    if (!r || !s || r['Item name'] !== p.workbookName || s.name !== p.siteName)
      throw new Error(
        `Owner alias ${p.recordId}/${p.siteId}: names or IDs no longer match`
      );
    if (
      status.has(p.recordId) ||
      pairedR.has(p.recordId) ||
      pairedS.has(p.siteId)
    )
      throw new Error(
        `Owner alias ${p.recordId}/${p.siteId} conflicts with another match`
      );
    if (
      s.municipality !== r.Municipality ||
      s.array !== CATEGORY[r.Category]?.array
    )
      throw new Error(
        `Owner alias ${p.recordId}/${p.siteId}: different municipality or category`
      );
    pairedR.add(r['Record ID']);
    pairedS.add(s.siteId);
    pairs.push({ r, s, score: p.score ?? null, source: 'owner' });
  }
  const savedByKey = new Map(
    (saved.pairs ?? []).map(p => [`${p.recordId}|${p.siteId}`, p])
  );
  const pairKeys = new Set(pairs.map(p => `${p.r['Record ID']}|${p.s.siteId}`));
  for (const p of saved.pairs ?? []) {
    if (!['pending', 'keep-both', 'replace'].includes(p.decision))
      throw new Error(
        `${p.recordId}/${p.siteId}: decision must be pending, keep-both or replace`
      );
    if (!pairKeys.has(`${p.recordId}|${p.siteId}`) && p.decision !== 'pending')
      throw new Error(
        `Stale twin decision ${p.recordId}/${p.siteId}: the pair no longer exists`
      );
  }
  const twinPairs = pairs.map(({ r, s, score, source }) => {
    const prev = savedByKey.get(`${r['Record ID']}|${s.siteId}`);
    if (
      prev &&
      (prev.workbookName !== r['Item name'] || prev.siteName !== s.name)
    )
      throw new Error(
        `Twin decision ${r['Record ID']}/${s.siteId}: names no longer match`
      );
    return {
      recordId: r['Record ID'],
      workbookName: r['Item name'],
      siteId: s.siteId,
      siteName: s.name,
      municipality: r.Municipality,
      category: r.Category,
      score,
      source,
      decision: prev?.decision ?? 'pending',
    };
  });
  for (const p of twinPairs) {
    const s = siteOnly.find(x => x.siteId === p.siteId);
    status.set(p.recordId, {
      status: `twin-${p.decision}`,
      array: s.array,
      index: p.decision === 'replace' ? s.index : undefined,
      siteId: p.siteId,
      siteName: p.siteName,
    });
  }
  for (const r of wbOnly)
    if (!status.has(r['Record ID']))
      status.set(r['Record ID'], { status: 'new' });

  // Owner decisions to keep a site description on an in-place update.
  const descriptionOverrides = [...(saved.descriptionOverrides ?? [])].sort(
    (a, b) => a.recordId.localeCompare(b.recordId)
  );
  for (const o of descriptionOverrides) {
    const st = status.get(o.recordId);
    if (o.decision !== 'site-description')
      throw new Error(
        `${o.recordId}: description override must be site-description`
      );
    if (
      !st ||
      !['exact', 'twin-replace'].includes(st.status) ||
      st.siteId !== o.siteId
    )
      throw new Error(
        `Stale description override ${o.recordId}/${o.siteId}: not an in-place update of that entry`
      );
  }
  const keepSiteText = new Set(descriptionOverrides.map(o => o.recordId));

  // Images: rules on recorded data, then the fetched-file manifest.
  const manifestById = new Map(manifest.map(f => [f.recordId, f]));
  const imageEval = new Map(
    records.map(r => [
      r['Record ID'],
      evaluateImage(imageRows.get(r['Record ID'])),
    ])
  );
  const imageFor = r => {
    const ev = imageEval.get(r['Record ID']);
    const f = manifestById.get(r['Record ID']);
    if (ev.verdict !== 'pass' || !f) return undefined;
    // The manifest copy must match the workbook exactly; alt and credit are never edited.
    const alt = `${r['Item name']}, ${r.Municipality}`;
    const credit = imageRows.get(r['Record ID'])['Credit and reuse terms'];
    if (f.alt !== alt || f.credit !== credit)
      throw new Error(
        `${r['Record ID']}: manifest alt or credit differs from the workbook; re-run fetch-tourism-images`
      );
    if (!/^\/tourism\/AKL-\d{3}\.(jpg|png|webp)$/.test(f.src))
      throw new Error(
        `${r['Record ID']}: manifest src must be /tourism/<Record ID>.<ext>`
      );
    // A CC photo carries its licence and source page so the credit can link both.
    const cc = ccLicence(credit);
    return cc
      ? {
          src: f.src,
          alt,
          credit,
          licence: cc.name,
          licenceUrl: cc.url,
          sourcePage: imageRows.get(r['Record ID'])['Photo source page'],
        }
      : { src: f.src, alt, credit };
  };
  const workbookEntry = (r, base = {}) => {
    const e = {
      ...base,
      name: r['Item name'],
      description: r['Content Description'],
    };
    delete e.image;
    e.recordId = r['Record ID'];
    if (r['Location/barangay'] !== '') e.location = r['Location/barangay'];
    else delete e.location;
    if (r['Source URL'] !== '') e.sourceUrl = r['Source URL'];
    else delete e.sourceUrl;
    const img = imageFor(r);
    if (img) e.image = img;
    return e;
  };

  // In-place updates (exact, approved replace) and overviews.
  const live = new Set();
  const appended = [];
  for (const r of records) {
    const id = r['Record ID'];
    const m = muniByName.get(r.Municipality);
    if (isHeld(id)) continue;
    if (r.Category === 'Description') {
      if (m.overview) throw new Error(`${id}: second overview for ${m.name}`);
      m.overview = {
        recordId: id,
        itemName: r['Item name'],
        text: r['Content Description'],
        sourceUrl: r['Source URL'],
      };
      // The overview's photo is the town page hero.
      const heroImg = imageFor(r);
      if (heroImg) m.overview.image = heroImg;
      continue;
    }
    const st = status.get(id);
    if (st.status === 'exact' || st.status === 'twin-replace') {
      const prior = baseline.find(b => b.slug === m.slug)[st.array][st.index];
      m[st.array][st.index] = workbookEntry(r, m[st.array][st.index]);
      // Owner decision: keep the site's own description where the workbook
      // copy drops facts it had. Name, location and Record ID stay workbook.
      if (keepSiteText.has(id))
        m[st.array][st.index].description = prior.description;
      live.add(id);
    } else if (st.status === 'new' || st.status === 'twin-keep-both') {
      appended.push(r);
      live.add(id);
    }
  }

  // Appends: saved slots are reused; new ones go at the end in sheet order.
  const appendedIds = new Set(appended.map(r => r['Record ID']));
  for (const id of Object.keys(slots))
    if (!appendedIds.has(id))
      throw new Error(
        `${id} holds an appended slot but would no longer be appended; that would renumber shared links`
      );
  const nextSlots = {};
  const used = new Map(); // `${slug}:${array}` -> Set of indices
  const place = (m, array, index, id) => {
    const k = `${m.slug}:${array}`;
    if (!used.has(k)) used.set(k, new Set());
    if (
      used.get(k).has(index) ||
      index < baseline.find(b => b.slug === m.slug)[array].length
    )
      throw new Error(`Slot conflict at ${k}:${index} for ${id}`);
    used.get(k).add(index);
    nextSlots[id] = { municipality: m.slug, array, index };
  };
  for (const r of appended) {
    const id = r['Record ID'];
    const s = slots[id];
    if (!s) continue;
    const m = muniByName.get(r.Municipality);
    if (s.municipality !== m.slug || s.array !== CATEGORY[r.Category].array)
      throw new Error(`${id}: saved slot is in a different list`);
    place(m, s.array, s.index, id);
  }
  for (const r of appended) {
    const id = r['Record ID'];
    if (nextSlots[id]) continue;
    const m = muniByName.get(r.Municipality);
    const array = CATEGORY[r.Category].array;
    const taken = used.get(`${m.slug}:${array}`) ?? new Set();
    const index = Math.max(
      baseline.find(b => b.slug === m.slug)[array].length,
      ...[...taken].map(i => i + 1)
    );
    place(m, array, index, id);
  }
  for (const r of appended) {
    const id = r['Record ID'];
    const { array, index } = nextSlots[id];
    const m = muniByName.get(r.Municipality);
    const e = workbookEntry(r);
    if (noPins) e.pin = false;
    m[array][index] = e;
  }
  for (const m of out)
    for (const a of ARRAYS)
      for (let i = 0; i < m[a].length; i++)
        if (!m[a][i]) throw new Error(`Gap in ${m.slug}.${a} at ${i}`);

  // Existing images on non-workbook entries are kept; workbook entries only
  // carry images that passed. Carry over fields the importer does not own
  // (for example dates added later) from the current file, slot by slot.
  const OWNED = new Set([
    'name',
    'description',
    'recordId',
    'location',
    'sourceUrl',
    'image',
    'pin',
  ]);
  if (current)
    for (const m of out) {
      const cm = current.find(c => c.slug === m.slug);
      if (!cm) continue;
      for (const a of ARRAYS) {
        if (cm[a].length > m[a].length)
          throw new Error(
            `${m.slug}.${a} has entries the importer did not write; add them to the baseline first`
          );
        cm[a].forEach((ce, i) => {
          const e = m[a][i];
          const same = e.recordId
            ? ce.recordId === e.recordId
            : ce.name === e.name;
          if (!same) return;
          for (const [k, v] of Object.entries(ce))
            if (!(k in e) && !(e.recordId && OWNED.has(k))) e[k] = v;
        });
      }
    }

  // Names-null paragraphs that may describe a workbook record.
  const nullOverlaps = [];
  for (const m of baseline)
    for (const a of ARRAYS)
      m[a].forEach((e, i) => {
        if (e.name) return;
        const text = ` ${tokens(e.description).join(' ')} `;
        for (const r of records) {
          if (r.Municipality !== m.name || !CATEGORY[r.Category]) continue;
          const t = tokens(r['Item name']);
          if (t.length && text.includes(` ${t.join(' ')} `))
            nullOverlaps.push({
              recordId: r['Record ID'],
              itemName: r['Item name'],
              paragraph: `${m.slug}.${a}[${i}]`,
            });
        }
      });

  // Counts.
  const countsOf = data => {
    const raw = { attractions: 0, festivals: 0, products: 0, nameless: 0 };
    const named = {};
    for (const m of data) {
      named[m.slug] = 0;
      for (const a of ARRAYS)
        for (const e of m[a]) {
          raw[a]++;
          if (e.name) named[m.slug]++;
          else raw.nameless++;
        }
    }
    const namedTotal = Object.values(named).reduce((x, y) => x + y, 0);
    return { raw, named, namedTotal };
  };
  const pinned = data => {
    const n = {};
    for (const m of data)
      n[m.slug] = ARRAYS.reduce(
        (s, a) => s + m[a].filter(e => e.name && e.pin !== false).length,
        0
      );
    return n;
  };

  const recon = {
    baselineRevision,
    workbookSha256,
    noPins,
    blankRows: { [CONTENT_TAB]: blankRows, [IMAGE_TAB]: imageBlankRows },
    idGaps,
    counts: {
      records: records.length,
      byCategory: Object.fromEntries(
        Object.keys(CATEGORY).map(c => [
          c,
          records.filter(r => r.Category === c).length,
        ])
      ),
      exact: [...status.values()].filter(s => s.status === 'exact').length,
      workbookOnly: wbOnly.length,
      siteOnly: siteOnly.length,
      candidatePairs: twinPairs.length,
      unmatchedSiteEntries: siteOnly.length - twinPairs.length,
      before: countsOf(baseline),
      after: countsOf(out),
      recordsPerMunicipalityPin: pinned(out),
    },
    repeatedDescriptions,
    nullParagraphOverlaps: nullOverlaps,
    siteOnly: siteOnly.map(s => ({
      ...s,
      pairedWith: twinPairs.find(p => p.siteId === s.siteId)?.recordId ?? null,
    })),
    records: records.map(r => {
      const id = r['Record ID'];
      const st =
        r.Category === 'Description' ? { status: 'overview' } : status.get(id);
      const ev = imageEval.get(id);
      const img = imageRows.get(id);
      return {
        recordId: id,
        sheetRow: r.sheetRow,
        municipality: r.Municipality,
        category: r.Category,
        itemName: r['Item name'],
        description: r['Content Description'],
        location: r['Location/barangay'],
        sourceUrl: r['Source URL'],
        status: isHeld(id) ? 'held' : st.status,
        descriptionSource: keepSiteText.has(id) ? 'site' : 'workbook',
        live: live.has(id) || (r.Category === 'Description' && !isHeld(id)),
        siteId: st.siteId ?? null,
        siteName: st.siteName ?? null,
        slot: nextSlots[id] ?? null,
        flags: flags.get(id),
        image: {
          row: img,
          licenceClass: licenceClass(img['Credit and reuse terms']),
          verdict: ev.verdict,
          reasons: ev.reasons,
          // Every record has a slot: cards for places, the hero for overviews.
          hasPhotoSlot: true,
          file: manifestById.get(id)?.src ?? null,
        },
      };
    }),
  };

  return {
    municipalities: out,
    reconciliation: recon,
    twinPairs: { pairs: twinPairs, heldRecords, descriptionOverrides },
    slots: Object.fromEntries(
      Object.entries(nextSlots).sort(([a], [b]) => a.localeCompare(b))
    ),
    review: reviewMarkdown(recon, twinPairs, heldRecords),
  };
}

function reviewMarkdown(recon, pairs, held) {
  const L = [];
  const esc = s => String(s ?? '').replace(/\|/g, '\\|');
  L.push('# Tourism workbook review (owner decisions needed)', '');
  L.push(`Workbook SHA-256: \`${recon.workbookSha256}\``);
  L.push(`Baseline revision: \`${recon.baselineRevision}\``, '');
  L.push(
    'Edit `src/data/tourism/twin-pairs.json`, then tell the agent to run the live import.',
    '',
    '- For each pair set `decision` to `keep-both` (show both), `replace` (the workbook record takes over the site entry, same link) or leave `pending` (the workbook record stays hidden).',
    '- To name an alias the heuristic missed, add a pair with `"source": "owner"`, both IDs and both names exactly as listed below.',
    '- For each held record set `decision` to `publish` or leave `pending`.',
    ''
  );
  L.push(`## Candidate twin pairs (${pairs.length})`, '');
  L.push(
    '| Record ID | Workbook name | Site ID | Site name | Score | Decision |'
  );
  L.push('| --- | --- | --- | --- | --- | --- |');
  for (const p of pairs)
    L.push(
      `| ${p.recordId} | ${esc(p.workbookName)} | ${p.siteId} | ${esc(p.siteName)} | ${p.score ?? 'owner'} | ${p.decision} |`
    );
  const unmatched = recon.siteOnly.filter(s => !s.pairedWith);
  L.push(
    '',
    `## Site entries with no candidate (${unmatched.length}): possible aliases`,
    ''
  );
  L.push(
    'Each is shown next to the NEW workbook records in the same municipality and category.',
    ''
  );
  for (const s of unmatched) {
    const cat = Object.keys(CATEGORY).find(c => CATEGORY[c]?.array === s.array);
    const news = recon.records.filter(
      r =>
        r.municipality === s.municipality &&
        r.category === cat &&
        r.status === 'new'
    );
    L.push(`### ${s.siteId}: ${esc(s.name)} (${s.municipality}, ${cat})`, '');
    L.push(
      news.length
        ? news.map(r => `- ${r.recordId}: ${esc(r.itemName)}`).join('\n')
        : '- No NEW workbook records in this list.',
      ''
    );
  }
  L.push(`## Held records (${held.length})`, '');
  for (const h of held)
    L.push(`- ${h.recordId}: ${esc(h.reason)} (decision: ${h.decision})`);
  L.push('');
  return L.join('\n');
}

// ----------------------------------------------------------------- CLI ----

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = join(ROOT, 'src/data/tourism');
const P = {
  municipalities: join(DATA, 'municipalities.json'),
  reconciliation: join(DATA, 'workbook-reconciliation.json'),
  twinPairs: join(DATA, 'twin-pairs.json'),
  slots: join(DATA, 'workbook-slots.json'),
  manifest: join(DATA, 'tourism-images.json'),
  review: join(ROOT, 'docs/tourism-workbook-review.md'),
};
const readJson = (p, fallback) =>
  existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback;

async function writeFormatted(path, data) {
  let text =
    typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`;
  if (path.endsWith('.json')) {
    const prettier = await import('prettier');
    const options = (await prettier.resolveConfig(path)) ?? {};
    text = await prettier.format(text, { ...options, filepath: path });
  }
  writeFileSync(path, text, 'utf8');
}

async function main(argv) {
  const arg = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const xlsx = arg('--xlsx');
  if (!xlsx)
    throw new Error(
      'Usage: --xlsx <path> [--dry-run] [--no-pins] [--baseline <rev>]'
    );
  const dryRun = argv.includes('--dry-run');
  const prior = readJson(P.reconciliation, null);
  const baselineRevision = arg('--baseline') ?? prior?.baselineRevision;
  if (!baselineRevision)
    throw new Error(
      'First run needs --baseline <git revision> of the pre-import municipalities.json'
    );
  const baseline = JSON.parse(
    execFileSync(
      'git',
      ['show', `${baselineRevision}:src/data/tourism/municipalities.json`],
      {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      }
    )
  );
  const buf = readFileSync(xlsx);
  const result = runImport({
    sheets: readXlsx(buf),
    baseline,
    baselineRevision,
    workbookSha256: createHash('sha256').update(buf).digest('hex'),
    saved: readJson(P.twinPairs, { pairs: [], heldRecords: [] }),
    slots: readJson(P.slots, {}),
    manifest: readJson(P.manifest, []),
    current: readJson(P.municipalities, null),
    noPins: argv.includes('--no-pins'),
  });
  await writeFormatted(P.reconciliation, result.reconciliation);
  await writeFormatted(P.twinPairs, result.twinPairs);
  await writeFormatted(P.review, result.review);
  if (!dryRun) {
    await writeFormatted(P.municipalities, result.municipalities);
    await writeFormatted(P.slots, result.slots);
  }
  const c = result.reconciliation.counts;
  console.log(
    `${dryRun ? 'Dry run' : 'Import'}: ${c.records} records, ${c.exact} exact, ` +
      `${c.workbookOnly} workbook-only, ${c.siteOnly} site-only, ${c.candidatePairs} candidate pairs, ` +
      `named ${c.before.namedTotal} -> ${c.after.namedTotal}`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main(process.argv.slice(2)).catch(e => {
    console.error(e.message);
    process.exit(1);
  });
