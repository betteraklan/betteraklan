import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { buildRecords } from '../../src/lib/tourism/explore';
import {
  fetchImage,
  pruneOwnedFiles,
  sniffImage,
} from './fetch-tourism-images.mjs';
import {
  CONTENT_HEADERS,
  IMAGE_HEADERS,
  ccLicence,
  evaluateImage,
  readXlsx,
  runImport,
  twinScore,
} from './import-tourism-workbook.mjs';

// --- a tiny synthetic .xlsx -------------------------------------------------

function zip(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text, 'utf8');
    const data = deflateRawSync(raw);
    const n = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(8, 8);
    head.writeUInt32LE(data.length, 18);
    head.writeUInt32LE(raw.length, 22);
    head.writeUInt16LE(n.length, 26);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(n.length, 28);
    cd.writeUInt32LE(offset, 42);
    parts.push(head, n, data);
    central.push(cd, n);
    offset += 30 + n.length + data.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cdBuf, end]);
}

const esc = s =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = i => String.fromCharCode(65 + i);
// Rows of cells; `undefined` leaves the cell out (sparse references).
function sheetXml(rows) {
  const body = rows
    .map((cells, r) => {
      const cs = cells
        .map((v, c) =>
          v === undefined
            ? ''
            : `<c r="${col(c)}${r + 1}" t="str"><v>${esc(v)}</v></c>`
        )
        .join('');
      return `<row r="${r + 1}">${cs}</row>`;
    })
    .join('');
  return `<?xml version="1.0"?><worksheet xmlns="x"><sheetData>${body}</sheetData></worksheet>`;
}
function xlsx(content, images) {
  return zip({
    'xl/workbook.xml':
      '<workbook xmlns:r="r"><sheets><sheet name="Municaplity Contents" r:id="rId1"/><sheet name="Image Sources" r:id="rId2"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheetXml([CONTENT_HEADERS, ...content]),
    'xl/worksheets/sheet2.xml': sheetXml([IMAGE_HEADERS, ...images]),
  });
}

const PD = 'Photo by Someone; public domain (Wikimedia Commons).';
const goodImage = (id, muni, name, over = {}) => {
  const o = {
    'Record ID': id,
    Municipality: muni,
    'Item name': name,
    'Image URL or source': `https://upload.wikimedia.org/x/${id}.jpg`,
    'Photo source page': '',
    'What the image shows': `Photo of ${name}.`,
    'Download result':
      'Image downloaded and verified (2026-11-18): HTTP 200, JPEG signature.',
    'HTTP status': '200',
    'Content type': 'image/jpeg',
    'Downloaded bytes': '1000',
    'Credit and reuse terms': PD,
    'Unavailable or held URL': '',
    'Open image/source': 'Open image',
    ...over,
  };
  return IMAGE_HEADERS.map(h => o[h]);
};
const noImage = (id, muni, name) =>
  IMAGE_HEADERS.map(h =>
    h === 'Record ID'
      ? id
      : h === 'Municipality'
        ? muni
        : h === 'Item name'
          ? name
          : ''
  );

// Content rows: Municipality, Category, Item name, Description, Location, Source URL, Record ID.
const CONTENT = [
  [
    'Altavas',
    'Description',
    'Altavas municipal overview',
    'An inland town &amp; more — “quoted”.',
    '',
    'https://src/1',
    'AKL-001',
  ],
  [
    'Altavas',
    'Spots & Attractions',
    'Tigayon Hill and caves',
    '  Leading and trailing spaces stay.  ',
    'Barangay Tigayon',
    'https://src/2',
    'AKL-002',
  ],
  [
    'Altavas',
    'Spots & Attractions',
    'Freedom Shrine',
    'A shrine.',
    'Poblacion',
    'https://src/3',
    'AKL-003',
  ],
  [
    'Altavas',
    'Spots & Attractions',
    'Talon Falls',
    'Falls in Talon. Second sentence in June.',
    'Talon',
    '',
    'AKL-005',
  ],
  [
    'Altavas',
    'Festivals & Events',
    'Pag-Aeaw-Aeaw',
    'Held every January.',
    'Poblacion',
    'https://src/6',
    'AKL-006',
  ],
  [],
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined],
];
const IMAGES = [
  goodImage('AKL-001', 'Altavas', 'Altavas municipal overview'),
  goodImage('AKL-002', 'Altavas', 'Tigayon Hill and caves'),
  goodImage('AKL-003', 'Altavas', 'Freedom Shrine'),
  noImage('AKL-005', 'Altavas', 'Talon Falls'),
  noImage('AKL-006', 'Altavas', 'Pag-Aeaw-Aeaw'),
];
const BASELINE = [
  {
    slug: 'altavas',
    name: 'Altavas',
    festivals: [{ name: null, description: 'A paragraph.' }],
    attractions: [
      { name: 'TIGAYON HILL & CAVES', description: 'Old text.' },
      { name: 'AKLAN FREEDOM SHRINE', description: 'Old shrine text.' },
    ],
    products: [],
  },
];
const CENTROIDS = [{ slug: 'altavas', name: 'Altavas', lat: 11.5, lon: 122.5 }];

const sheets = readXlsx(xlsx(CONTENT, IMAGES));
const run = (over = {}) =>
  runImport({
    sheets,
    baseline: BASELINE,
    baselineRevision: 'test',
    workbookSha256: 'sha',
    ...over,
  });
const records = muni =>
  buildRecords({
    municipalities: muni,
    resorts: [],
    accommodations: [],
    centroids: CENTROIDS,
    boundaries: [],
  });

describe('workbook parsing', () => {
  it('decodes entities once and keeps cell text verbatim', () => {
    const row = sheets['Municaplity Contents'][1].cells;
    expect(row[3]).toBe('An inland town &amp; more — “quoted”.');
    expect(sheets['Municaplity Contents'][2].cells[3]).toBe(
      '  Leading and trailing spaces stay.  '
    );
  });

  it('reads shared strings with rich runs and skips phonetic runs', () => {
    const book = zip({
      'xl/workbook.xml':
        '<workbook><sheets><sheet name="S" r:id="a"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':
        '<Relationships><Relationship Id="a" Target="s.xml"/></Relationships>',
      'xl/sharedStrings.xml':
        '<sst><si><r><t>Pi</t></r><r><t>ña</t></r><rPh><t>x</t></rPh></si></sst>',
      'xl/s.xml':
        '<worksheet><sheetData><row r="3"><c r="C3" t="s"><v>0</v></c></row></sheetData></worksheet>',
    });
    expect(readXlsx(book).S).toEqual([{ row: 3, cells: ['', '', 'Piña'] }]);
  });
});

describe('runImport', () => {
  const r = run();
  const rec = id => r.reconciliation.records.find(x => x.recordId === id);

  it('skips blank rows and lists them and the ID gaps', () => {
    expect(r.reconciliation.blankRows['Municaplity Contents']).toEqual([7, 8]);
    expect(r.reconciliation.idGaps).toEqual(['AKL-004']);
    expect(r.reconciliation.records).toHaveLength(5);
  });

  it('stores fields exactly as parsed', () => {
    const a = r.municipalities[0].attractions[0];
    expect(a).toMatchObject({
      name: 'Tigayon Hill and caves',
      description: '  Leading and trailing spaces stay.  ',
      recordId: 'AKL-002',
      location: 'Barangay Tigayon',
      sourceUrl: 'https://src/2',
    });
    expect(r.municipalities[0].overview).toEqual({
      recordId: 'AKL-001',
      itemName: 'Altavas municipal overview',
      text: 'An inland town &amp; more — “quoted”.',
      sourceUrl: 'https://src/1',
    });
  });

  it('refuses tabs that disagree', () => {
    const bad = readXlsx(
      xlsx(CONTENT, [
        ...IMAGES.slice(0, 4),
        noImage('AKL-006', 'Altavas', 'Other'),
      ])
    );
    expect(() => run({ sheets: bad })).toThrow(/differs between tabs/);
  });

  it('never turns an overview into a record, pin or count', () => {
    const recs = records(r.municipalities);
    expect(recs.some(x => x.recordId === 'AKL-001')).toBe(false);
    expect(r.reconciliation.counts.after.namedTotal).toBe(recs.length);
  });

  it('leaves festival dates empty even when the text names a month', () => {
    const f = r.municipalities[0].festivals.find(e => e.recordId === 'AKL-006');
    expect(f.dates).toBeUndefined();
  });

  it('withholds candidate twins as pending and never picks replace', () => {
    expect(r.twinPairs.pairs).toEqual([
      expect.objectContaining({
        recordId: 'AKL-003',
        siteId: 'place-altavas-1',
        decision: 'pending',
      }),
    ]);
    expect(rec('AKL-003').live).toBe(false);
    expect(r.municipalities[0].attractions[1].name).toBe(
      'AKLAN FREEDOM SHRINE'
    );
  });

  it('keeps old ids pointing at the same entity', () => {
    const ids = new Map(records(r.municipalities).map(x => [x.id, x]));
    expect(ids.get('place-altavas-0').recordId).toBe('AKL-002'); // exact match
    expect(ids.get('place-altavas-1').name).toBe('AKLAN FREEDOM SHRINE');
    expect(ids.get('place-altavas-2').recordId).toBe('AKL-005'); // appended
  });

  it('applies owner decisions: replace in place, keep-both appends', () => {
    const pair = r.twinPairs.pairs[0];
    const rep = run({
      saved: { pairs: [{ ...pair, decision: 'replace' }], heldRecords: [] },
    });
    expect(rep.municipalities[0].attractions[1].recordId).toBe('AKL-003');
    expect(rep.municipalities[0].attractions).toHaveLength(3);
    const keep = run({
      saved: { pairs: [{ ...pair, decision: 'keep-both' }], heldRecords: [] },
    });
    expect(keep.municipalities[0].attractions[1].name).toBe(
      'AKLAN FREEDOM SHRINE'
    );
    // First run, no saved slots: appends follow sheet order.
    expect(keep.municipalities[0].attractions[2].recordId).toBe('AKL-003');
  });

  it('has no retire option and refuses stale or mismatched decisions', () => {
    const pair = r.twinPairs.pairs[0];
    const go = p => () => run({ saved: { pairs: [p], heldRecords: [] } });
    expect(go({ ...pair, decision: 'retire' })).toThrow(/must be pending/);
    expect(go({ ...pair, siteName: 'Renamed', decision: 'replace' })).toThrow(
      /no longer match/
    );
    expect(
      go({ ...pair, siteId: 'place-altavas-9', decision: 'replace' })
    ).toThrow(/Stale/);
  });

  it('a late decision keeps earlier appended slots (no renumbering)', () => {
    const first = run();
    const pair = first.twinPairs.pairs[0];
    const late = run({
      slots: first.slots,
      saved: { pairs: [{ ...pair, decision: 'keep-both' }], heldRecords: [] },
    });
    expect(late.slots['AKL-005']).toEqual(first.slots['AKL-005']);
    expect(late.slots['AKL-003'].index).toBe(3);
    // Withdrawing a decision that already holds a slot is refused.
    expect(() =>
      run({ slots: late.slots, saved: { pairs: [pair], heldRecords: [] } })
    ).toThrow(/renumber/);
  });

  it('keeps the site description when the owner chose it, and refuses stale ones', () => {
    const keep = run({
      saved: {
        pairs: [],
        heldRecords: [],
        descriptionOverrides: [
          {
            recordId: 'AKL-002',
            siteId: 'place-altavas-0',
            decision: 'site-description',
          },
        ],
      },
    });
    expect(keep.municipalities[0].attractions[0]).toMatchObject({
      name: 'Tigayon Hill and caves',
      description: 'Old text.',
      recordId: 'AKL-002',
      location: 'Barangay Tigayon',
    });
    expect(
      keep.reconciliation.records.find(x => x.recordId === 'AKL-002')
        .descriptionSource
    ).toBe('site');
    expect(() =>
      run({
        saved: {
          pairs: [],
          heldRecords: [],
          descriptionOverrides: [
            {
              recordId: 'AKL-005',
              siteId: 'place-altavas-0',
              decision: 'site-description',
            },
          ],
        },
      })
    ).toThrow(/Stale description override/);
  });

  it('is deterministic across runs with the same inputs', () => {
    const a = run();
    const b = run({ slots: a.slots, current: a.municipalities });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('--no-pins leaves added records off the map, existing ones pinned', () => {
    const np = run({ noPins: true });
    const recs = records(np.municipalities);
    const added = recs.find(x => x.recordId === 'AKL-005');
    expect(added).toMatchObject({
      lat: null,
      lon: null,
      placementNote: null,
      placement: 'none',
    });
    expect(recs.find(x => x.id === 'place-altavas-0').lat).toBe(11.5);
  });

  it('holds records whose description repeats another record', () => {
    const dup = readXlsx(
      xlsx(
        [
          ...CONTENT.slice(0, 4),
          [
            'Altavas',
            'Festivals & Events',
            'Pag-Aeaw-Aeaw',
            'A shrine.',
            'X',
            '',
            'AKL-006',
          ],
        ],
        IMAGES
      )
    );
    const d = run({ sheets: dup });
    expect(d.twinPairs.heldRecords.map(h => h.recordId)).toEqual([
      'AKL-003',
      'AKL-006',
    ]);
    expect(
      d.reconciliation.records.find(x => x.recordId === 'AKL-006').live
    ).toBe(false);
  });

  it('refuses a manifest whose alt or credit differs from the workbook', () => {
    const wrongAlt = () =>
      run({
        manifest: [
          {
            recordId: 'AKL-002',
            src: '/tourism/AKL-002.jpg',
            alt: 'Tigayon Hill, Altavas',
            credit: PD,
          },
        ],
      });
    expect(wrongAlt).toThrow(/manifest alt or credit differs/);
  });

  it('attaches only passing, fetched images with verbatim alt and credit', () => {
    const withFile = run({
      manifest: [
        {
          recordId: 'AKL-002',
          src: '/tourism/AKL-002.jpg',
          alt: 'Tigayon Hill and caves, Altavas',
          credit: PD,
        },
      ],
    });
    expect(withFile.municipalities[0].attractions[0].image).toEqual({
      src: '/tourism/AKL-002.jpg',
      alt: 'Tigayon Hill and caves, Altavas',
      credit: PD,
    });
    expect(run().municipalities[0].attractions[0].image).toBeUndefined();
  });
});

describe('image rules', () => {
  const ev = over =>
    evaluateImage(
      Object.fromEntries(
        IMAGE_HEADERS.map((h, i) => [
          h,
          goodImage('AKL-009', 'A', 'B', over)[i],
        ])
      )
    );
  it('passes a verified public-domain direct image', () =>
    expect(ev({}).verdict).toBe('pass'));
  it('held URL: fails only when it is the current URL', () => {
    expect(ev({ 'Unavailable or held URL': 'https://old/x.jpg' }).verdict).toBe(
      'pass'
    );
    expect(
      ev({
        'Unavailable or held URL': 'https://upload.wikimedia.org/x/AKL-009.jpg',
      }).verdict
    ).toBe('fail');
  });
  it('fails a PARTIAL match', () =>
    expect(
      ev({
        'Download result':
          'PARTIAL match. Image downloaded and verified, JPEG signature.',
      }).verdict
    ).toBe('fail'));
  it('fails an illustrative photo', () =>
    expect(
      ev({ 'What the image shows': 'Illustrative photo, not Batan-specific.' })
        .verdict
    ).toBe('fail'));
  it('fails a PDF', () =>
    expect(
      ev({
        'Image URL or source': 'https://x/doc.pdf',
        'Content type': 'application/pdf',
      }).verdict
    ).toBe('fail'));
  it('fails a Google Images page', () =>
    expect(
      ev({
        'Image URL or source': 'https://www.google.com/search?tbm=isch&q=x',
      }).verdict
    ).toBe('fail'));
  it('fails an expiring link', () =>
    expect(
      ev({
        'Image URL or source': 'https://scontent.fbcdn.net/v/x.jpg?oe=6740',
      }).verdict
    ).toBe('fail'));
  // Owner decision 2026-11-21: CC BY and CC BY-SA photos may be used when the
  // credit can link the licence and the photo's source page.
  const SOURCE = 'https://commons.wikimedia.org/wiki/File:X.jpg';
  it('passes CC BY / BY-SA with a source page (real credits from the workbook)', () => {
    for (const credit of [
      'Heinrich Balbuena; CC BY 3.0 (Wikimedia Commons).',
      'Gibough; CC BY-SA 4.0 (Wikimedia Commons).',
      'Photographer Ree Dexter; Wikimedia Commons lists the image under CC BY 3.0. Attribute the photographer and link the license when reusing.',
    ])
      expect(
        ev({
          'Credit and reuse terms': credit,
          'Photo source page': SOURCE,
        }).verdict
      ).toBe('pass');
  });
  it('fails a CC photo without a source page to credit', () => {
    const r = ev({ 'Credit and reuse terms': 'Photo by X, CC BY-SA 4.0.' });
    expect(r.verdict).toBe('fail');
    expect(r.reasons.join()).toMatch(/source page/);
  });
  it('holds NonCommercial and NoDerivatives licences', () => {
    for (const credit of [
      'Photo by X, CC BY-NC 4.0.',
      'Photo by X, CC BY-ND 4.0.',
      'Photo by X, CC BY-NC-SA 2.0.',
    ]) {
      const r = ev({
        'Credit and reuse terms': credit,
        'Photo source page': SOURCE,
      });
      expect(r.verdict).toBe('fail');
      expect(r.reasons.join()).toMatch(/not CC BY or CC BY-SA/);
    }
  });
  it('names the licence and links its deed', () => {
    expect(
      ccLicence('Elmer B. Domingo; CC BY-SA 4.0 (Wikimedia Commons).')
    ).toEqual({
      name: 'CC BY-SA 4.0',
      url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    });
    expect(
      ccLicence(
        'ShmilyDigital; Creative Commons Attribution-ShareAlike 4.0. Credit the author.'
      )?.url
    ).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
    expect(ccLicence('Photo by X; public domain.')).toBeNull();
  });
  it('fails a licence that is not stated', () =>
    expect(
      ev({ 'Credit and reuse terms': 'Licence not stated.' }).verdict
    ).toBe('fail'));
  it('scores twins', () => {
    expect(twinScore('Freedom Shrine', 'AKLAN FREEDOM SHRINE')).toBeCloseTo(
      0.667
    );
    expect(
      twinScore('Diokno marker', 'HISTORICAL MARKER OF GENERAL ANANIAS DIOKNO')
    ).toBe(0.4);
    expect(
      twinScore('ALTAVAS STO. NIÑO FESTIVAL', 'Santo Niño Festival')
    ).toBeNull();
  });
});

describe('image files', () => {
  const png = Buffer.alloc(33);
  png.writeUInt32BE(0x89504e47, 0);
  png.writeUInt32BE(640, 16);
  png.writeUInt32BE(480, 20);

  it('reads PNG and JPEG sizes from the bytes', () => {
    expect(sniffImage(png)).toMatchObject({
      ext: 'png',
      width: 640,
      height: 480,
    });
    const jpg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0, 0, 0xff, 0xc0, 0x00, 0x11, 8, 0x01,
      0x2c, 0x01, 0x90, 3, 0, 0, 0, 0, 0, 0,
    ]);
    expect(sniffImage(jpg)).toMatchObject({
      ext: 'jpg',
      width: 400,
      height: 300,
    });
    expect(sniffImage(Buffer.from('<html></html>'))).toBeNull();
  });

  it('rejects redirects, incomplete bodies and non-images', async () => {
    const res = (status, body, len) => ({
      status,
      headers: { get: () => (len === undefined ? null : String(len)) },
      arrayBuffer: async () => body,
    });
    await expect(
      fetchImage('AKL-001', 'u', async () => res(302, png))
    ).rejects.toThrow(/302/);
    await expect(
      fetchImage('AKL-001', 'u', async () => res(200, png, 999))
    ).rejects.toThrow(/Incomplete/);
    await expect(
      fetchImage('AKL-001', 'u', async () => res(200, Buffer.from('<html>')))
    ).rejects.toThrow(/not a JPEG/);
    const ok = await fetchImage('AKL-001', 'u', async () =>
      res(200, png, png.length)
    );
    expect(ok.entry).toMatchObject({ file: 'AKL-001.png', width: 640 });
  });

  it('never leaves an importer-owned file that the manifest does not list', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'tourism-')), 'tourism');
    mkdirSync(dir);
    for (const f of ['AKL-001.jpg', 'AKL-002.png', 'other.jpg'])
      writeFileSync(join(dir, f), 'x');
    pruneOwnedFiles(dir, [{ src: '/tourism/AKL-001.jpg' }]);
    expect(readdirSync(dir).sort()).toEqual(['AKL-001.jpg', 'other.jpg']);
  });
});
