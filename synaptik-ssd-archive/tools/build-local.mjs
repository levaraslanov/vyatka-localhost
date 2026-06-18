import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.tmp/synaptik-ssd-archive');
const sourceDir = path.join(root, 'source-html');
const siteDir = path.join(root, 'site');
const assetsDir = path.join(root, 'assets');

const captures = [
  {
    id: 'ssd2022_20220816061157',
    title: 'SSD 2022 main page, 2022-08-16',
    timestamp: '20220816061157',
    original: 'https://synaptik.ru/ssd2022/',
    sourceFile: 'ssd2022_20220816061157.raw.html',
    outputDir: '20220816061157-ssd2022',
    outputFile: 'index.html',
  },
  {
    id: 'ssd2022_20221005042650',
    title: 'SSD 2022 main page, 2022-10-05',
    timestamp: '20221005042650',
    original: 'https://synaptik.ru/ssd2022/',
    sourceFile: 'ssd2022_20221005042650.raw.html',
    outputDir: '20221005042650-ssd2022',
    outputFile: 'index.html',
  },
  {
    id: 'ssd2022_pamyatka_20220816061030',
    title: 'SSD 2022 memo page, 2022-08-16',
    timestamp: '20220816061030',
    original: 'https://synaptik.ru/ssd2022_pamyatka/',
    sourceFile: 'ssd2022_pamyatka_20220816061030.raw.html',
    outputDir: '20220816061030-ssd2022-pamyatka',
    outputFile: 'index.html',
  },
  {
    id: 'ssd2022_pamyatka_20221005055115',
    title: 'SSD 2022 memo page, 2022-10-05',
    timestamp: '20221005055115',
    original: 'https://synaptik.ru/ssd2022_pamyatka/',
    sourceFile: 'ssd2022_pamyatka_20221005055115.raw.html',
    outputDir: '20221005055115-ssd2022-pamyatka',
    outputFile: 'index.html',
  },
];

const cdxRecords = [
  ['20220816061157', 'https://synaptik.ru/ssd2022/', '200', 'text/html', 'OMTHG76QEL62C6X6LTD35NFDEDVDNNSK', '33705'],
  ['20221005042650', 'https://synaptik.ru/ssd2022/', '200', 'text/html', 'CO6W3V2CHP4D4BWJW3QMVRTRGOBY52R5', '33860'],
  ['20251109092723', 'https://synaptik.ru/ssd2022/', '308', 'unk', '4XCTFG7BIGNFRSZ5GDYIJC2LMNHJQTB6', '327'],
  ['20251109111627', 'https://synaptik.ru/ssd2022', '404', 'text/html', '7QEK4GOLQEL77LF3D2DZVIXXSDMIVZKC', '6368'],
  ['20220816061030', 'https://synaptik.ru/ssd2022_pamyatka/', '200', 'text/html', 'WM7XUT3PG5VE2AWBFTNTVODSGAEXCSDO', '18818'],
  ['20221005055115', 'https://synaptik.ru/ssd2022_pamyatka/', '200', 'text/html', 'NHQQII5UXV5CKDZDOAE2NCF4PTXHCQ7M', '18917'],
].map(([timestamp, original, statuscode, mimetype, digest, length]) => ({
  timestamp,
  original,
  statuscode,
  mimetype,
  digest,
  length,
}));

const assetPrefixes = [
  '/_app/',
  '/_s/',
  '/files/',
  '/img/',
  '/js/',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeBasicEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&#x3A;', ':')
    .replaceAll('&#x2F;', '/')
    .replaceAll('&#x3F;', '?')
    .replaceAll('&#x3D;', '=')
    .replaceAll('&#x26;', '&');
}

function toAbsoluteUrl(raw, base = 'https://synaptik.ru/') {
  const value = decodeBasicEntities(raw.trim()).replace(/^['"]|['"]$/g, '');
  if (!value || value.startsWith('data:') || value.startsWith('javascript:') || value.startsWith('mailto:') || value.startsWith('tel:')) {
    return null;
  }
  if (value.startsWith('#')) {
    return null;
  }
  try {
    if (value.startsWith('//')) {
      return new URL(`https:${value}`);
    }
    return new URL(value, base);
  } catch {
    return null;
  }
}

function isSynaptikAsset(url) {
  return url.hostname === 'synaptik.ru' && assetPrefixes.some((prefix) => url.pathname.startsWith(prefix));
}

function withoutHash(url) {
  const clean = new URL(url.href);
  clean.hash = '';
  return clean.href;
}

function localAssetPath(url, record) {
  const original = new URL(record?.original ?? withoutHash(url));
  const suffix = original.search
    ? `__q_${createHash('sha1').update(original.search).digest('hex').slice(0, 10)}`
    : '';
  const parsedPath = original.pathname.replace(/^\/+/, '');
  const ext = path.extname(parsedPath);
  const base = ext ? parsedPath.slice(0, -ext.length) : parsedPath;
  const filePath = `${base}${suffix}${ext || '.bin'}`;
  return path.join(assetsDir, original.hostname, filePath);
}

function relativeUrl(fromFile, toFile, hash = '') {
  let rel = path.relative(path.dirname(fromFile), toFile).replaceAll(path.sep, '/');
  if (!rel.startsWith('.')) {
    rel = `./${rel}`;
  }
  return `${rel}${hash}`;
}

function archiveUrl(timestamp, original, modifier = 'id_') {
  return `https://web.archive.org/web/${timestamp}${modifier}/${original}`;
}

function dateDistance(a, b) {
  return Math.abs(Number(a.slice(0, 14)) - Number(b.slice(0, 14)));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; Codex archive recovery)',
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function queryCdx(url, refTimestamp) {
  const noHash = new URL(withoutHash(url));
  const candidates = [];
  if (noHash.search) {
    candidates.push(`${noHash.hostname}${noHash.pathname}${noHash.search}`);
  }
  candidates.push(`${noHash.hostname}${noHash.pathname}`);
  candidates.push(`${noHash.hostname}${noHash.pathname}*`);

  for (const candidate of candidates) {
    const endpoint = new URL('https://web.archive.org/cdx/search/cdx');
    endpoint.searchParams.set('url', candidate);
    endpoint.searchParams.set('output', 'json');
    endpoint.searchParams.set('fl', 'timestamp,original,statuscode,mimetype,digest,length');
    endpoint.searchParams.append('filter', 'statuscode:200');
    endpoint.searchParams.set('collapse', 'digest');

    let response;
    try {
      response = await fetchWithTimeout(endpoint.href, {}, 35000);
    } catch {
      continue;
    }
    if (!response.ok) {
      continue;
    }
    let rows;
    try {
      rows = await response.json();
    } catch {
      continue;
    }
    if (!Array.isArray(rows) || rows.length < 2) {
      continue;
    }
    const records = rows.slice(1).map(([timestamp, original, statuscode, mimetype, digest, length]) => ({
      timestamp,
      original,
      statuscode,
      mimetype,
      digest,
      length,
      cdxCandidate: candidate,
    }));
    records.sort((left, right) => dateDistance(left.timestamp, refTimestamp) - dateDistance(right.timestamp, refTimestamp));
    return records[0];
  }
  return null;
}

async function queryBulkCdx(candidate) {
  const endpoint = new URL('https://web.archive.org/cdx/search/cdx');
  endpoint.searchParams.set('url', candidate);
  endpoint.searchParams.set('output', 'json');
  endpoint.searchParams.set('fl', 'timestamp,original,statuscode,mimetype,digest,length');
  endpoint.searchParams.append('filter', 'statuscode:200');
  endpoint.searchParams.set('collapse', 'urlkey');

  let response;
  try {
    response = await fetchWithTimeout(endpoint.href, {}, 45000);
  } catch {
    return [];
  }
  if (!response.ok) {
    return [];
  }
  let rows;
  try {
    rows = await response.json();
  } catch {
    return [];
  }
  if (!Array.isArray(rows) || rows.length < 2) {
    return [];
  }
  return rows.slice(1).map(([timestamp, original, statuscode, mimetype, digest, length]) => ({
    timestamp,
    original,
    statuscode,
    mimetype,
    digest,
    length,
    cdxCandidate: candidate,
  }));
}

async function loadBulkCdx() {
  const candidates = [
    'synaptik.ru/_s/*',
    'synaptik.ru/_app/*',
    'synaptik.ru/files/*',
    'synaptik.ru/img/*',
    'synaptik.ru/js/*',
  ];
  const records = [];
  for (const candidate of candidates) {
    const rows = await queryBulkCdx(candidate);
    console.log(`CDX ${candidate}: ${rows.length}`);
    records.push(...rows);
    await sleep(250);
  }
  return records;
}

function findBulkRecord(records, url, refTimestamp) {
  const target = new URL(withoutHash(url));
  const scored = [];
  for (const record of records) {
    const original = new URL(record.original);
    let score = Number.POSITIVE_INFINITY;
    if (original.href === target.href) {
      score = 0;
    } else if (original.pathname === target.pathname && original.search === target.search) {
      score = 1;
    } else if (original.pathname === target.pathname && !original.search) {
      score = 2;
    } else if (original.pathname === target.pathname) {
      score = 3;
    } else {
      continue;
    }
    scored.push({ record, score });
  }
  scored.sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }
    return dateDistance(left.record.timestamp, refTimestamp) - dateDistance(right.record.timestamp, refTimestamp);
  });
  return scored[0]?.record ?? null;
}

function extractUrlsFromText(text, baseUrl, captureId, refTimestamp, assets) {
  const patterns = [
    /(?:href|src|data-src|data-lazy-bg|data-svg-url)=["']([^"']+)["']/g,
    /url\(([^)]+)\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) {
      const raw = match[1].trim();
      const absolute = toAbsoluteUrl(raw, baseUrl);
      if (!absolute || !isSynaptikAsset(absolute)) {
        continue;
      }
      addAsset(assets, absolute, raw, captureId, refTimestamp);
    }
  }
}

function extractSyntheticImageIds(html, captureId, refTimestamp, assets) {
  const pattern = /data-img-id=["'](\d+)["'][^>]*data-img-ext=["']([a-zA-Z0-9]+)["']/g;
  let match;
  while ((match = pattern.exec(html))) {
    const absolute = new URL(`/img/${match[1]}.${match[2]}`, 'https://synaptik.ru/');
    addAsset(assets, absolute, absolute.pathname, captureId, refTimestamp, { synthetic: 'data-img-id' });
  }
}

function addAsset(assets, absoluteUrl, raw, captureId, refTimestamp, extra = {}) {
  const key = withoutHash(absoluteUrl);
  const existing = assets.get(key) ?? {
    key,
    url: new URL(key),
    refs: [],
    status: 'pending',
  };
  existing.refs.push({
    raw,
    captureId,
    refTimestamp,
    hash: absoluteUrl.hash,
    ...extra,
  });
  assets.set(key, existing);
}

async function downloadAsset(asset, cdxRecordsBulk = null) {
  const refTimestamp = asset.refs[0]?.refTimestamp ?? '20221005042650';
  const record = cdxRecordsBulk
    ? findBulkRecord(cdxRecordsBulk, asset.url, refTimestamp)
    : await queryCdx(asset.url, refTimestamp);
  asset.cdxRecord = record;
  if (!record) {
    asset.status = 'missing-cdx';
    return asset;
  }

  const source = archiveUrl(record.timestamp, record.original);
  let response;
  try {
    response = await fetchWithTimeout(source, {}, 45000);
  } catch (error) {
    asset.status = 'download-error';
    asset.error = `${error.name}: ${error.message}`;
    return asset;
  }
  if (!response.ok) {
    asset.status = `http-${response.status}`;
    asset.archiveUrl = source;
    return asset;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html') && !record.mimetype.includes('html') && bytes.length < 10000) {
    asset.status = 'unexpected-html';
    asset.archiveUrl = source;
    return asset;
  }
  const filePath = localAssetPath(asset.url, record);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  asset.status = 'downloaded';
  asset.archiveUrl = source;
  asset.localPath = filePath;
  asset.size = bytes.length;
  asset.contentType = contentType;
  return asset;
}

function shouldInspectAsCss(asset) {
  const pathName = new URL(asset.cdxRecord?.original ?? asset.key).pathname;
  return asset.status === 'downloaded' && (asset.contentType?.includes('text/css') || pathName.endsWith('.css'));
}

async function rewriteCss(asset, assets) {
  if (!shouldInspectAsCss(asset)) {
    return;
  }
  const css = await readFile(asset.localPath, 'utf8');
  extractUrlsFromText(css, asset.cdxRecord.original, asset.key, asset.cdxRecord.timestamp, assets);
}

async function finalizeCss(asset, assets) {
  if (!shouldInspectAsCss(asset)) {
    return;
  }
  const css = await readFile(asset.localPath, 'utf8');
  const rewritten = css.replace(/url\(([^)]+)\)/g, (full, raw) => {
    const cleanRaw = raw.trim().replace(/^['"]|['"]$/g, '');
    const absolute = toAbsoluteUrl(cleanRaw, asset.cdxRecord.original);
    if (!absolute || !isSynaptikAsset(absolute)) {
      return full;
    }
    const target = assets.get(withoutHash(absolute));
    if (target?.status === 'downloaded') {
      return `url("${relativeUrl(asset.localPath, target.localPath, absolute.hash)}")`;
    }
    return `url("${archiveUrl(asset.cdxRecord.timestamp, withoutHash(absolute))}${absolute.hash}")`;
  });
  if (rewritten !== css) {
    await writeFile(asset.localPath, rewritten);
  }
}

function replacementForRaw(raw, baseUrl, capture, outputFile, assets) {
  const absolute = toAbsoluteUrl(raw, baseUrl);
  if (!absolute) {
    return raw;
  }

  if (absolute.href === 'https://synaptik.ru/ssd2022/' || absolute.href === 'https://synaptik.ru/ssd2022/#338211731') {
    return '../20221005042650-ssd2022/index.html' + (absolute.hash || '');
  }
  if (absolute.href === 'https://synaptik.ru/ssd2022_pamyatka/') {
    return '../20221005055115-ssd2022-pamyatka/index.html';
  }

  if (!isSynaptikAsset(absolute)) {
    return raw;
  }

  const target = assets.get(withoutHash(absolute));
  if (target?.status === 'downloaded') {
    return relativeUrl(outputFile, target.localPath, absolute.hash);
  }
  return archiveUrl(capture.timestamp, withoutHash(absolute)) + absolute.hash;
}

function rewriteHtml(html, capture, outputFile, assets) {
  const base = capture.original;
  let rewritten = html.replace(/((?:href|src|data-src|data-lazy-bg|data-svg-url)=["'])([^"']+)(["'])/g, (full, prefix, raw, suffix) => {
    const replacement = replacementForRaw(raw, base, capture, outputFile, assets);
    return `${prefix}${replacement}${suffix}`;
  });

  rewritten = rewritten.replace(/url\(([^)]+)\)/g, (full, raw) => {
    const replacement = replacementForRaw(raw, base, capture, outputFile, assets);
    if (replacement === raw) {
      return full;
    }
    return `url("${replacement}")`;
  });

  rewritten = rewritten.replace(/<script src="\/\/code\.jivo\.ru\/widget\/RuJQHfDUDE" async><\/script>/g, '<!-- Jivo widget removed for offline reconstruction. -->');
  rewritten = rewritten.replace(/<script[^>]+mc\.yandex\.ru\/watch\/40515565[^>]*><\/script>/g, '<!-- Yandex metric removed for offline reconstruction. -->');
  return rewritten;
}

async function dirSize(dir) {
  let total = 0;
  async function walk(current) {
    let entries = [];
    try {
      entries = await readdir(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry);
      const info = await stat(full);
      if (info.isDirectory()) {
        await walk(full);
      } else {
        total += info.size;
      }
    }
  }
  await walk(dir);
  return total;
}

async function main() {
  await mkdir(siteDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const assets = new Map();
  const htmlByCapture = new Map();
  const cdxRecordsBulk = await loadBulkCdx();

  for (const capture of captures) {
    const html = await readFile(path.join(sourceDir, capture.sourceFile), 'utf8');
    htmlByCapture.set(capture.id, html);
    extractUrlsFromText(html, capture.original, capture.id, capture.timestamp, assets);
    extractSyntheticImageIds(html, capture.id, capture.timestamp, assets);
  }

  const initialAssets = [...assets.values()];
  console.log(`Initial assets: ${initialAssets.length}`);
  for (let index = 0; index < initialAssets.length; index += 1) {
    const asset = initialAssets[index];
    await downloadAsset(asset, cdxRecordsBulk);
    console.log(`${index + 1}/${initialAssets.length} ${asset.status} ${asset.key}`);
    await sleep(150);
  }

  for (const asset of [...assets.values()]) {
    await rewriteCss(asset, assets);
  }

  const discoveredAssets = [...assets.values()].filter((asset) => asset.status === 'pending');
  if (discoveredAssets.length) {
    console.log(`CSS-discovered assets: ${discoveredAssets.length}`);
  }
  for (let index = 0; index < discoveredAssets.length; index += 1) {
    const asset = discoveredAssets[index];
    await downloadAsset(asset, cdxRecordsBulk);
    console.log(`css ${index + 1}/${discoveredAssets.length} ${asset.status} ${asset.key}`);
    await sleep(150);
  }

  for (const asset of [...assets.values()]) {
    await finalizeCss(asset, assets);
  }

  for (const capture of captures) {
    const outDir = path.join(siteDir, capture.outputDir);
    const outFile = path.join(outDir, capture.outputFile);
    await mkdir(outDir, { recursive: true });
    const html = rewriteHtml(htmlByCapture.get(capture.id), capture, outFile, assets);
    await writeFile(outFile, html);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: {
      requestedUrl: 'https://synaptik.ru/ssd2022/',
      cdxUrl: 'https://web.archive.org/cdx/search/cdx?url=synaptik.ru/ssd2022/*&output=json',
      cdxRecords,
      searchesWithNoConference2023Matches: [
        'https://web.archive.org/cdx/search/cdx?url=synaptik.ru/ssd2023*&output=json',
        'https://web.archive.org/cdx/search/cdx?url=synaptik.ru/*2023*&output=json&filter=statuscode:200',
      ],
    },
    captures: captures.map((capture) => ({
      ...capture,
      rawArchiveUrl: archiveUrl(capture.timestamp, capture.original),
      localHtml: path.relative(root, path.join(siteDir, capture.outputDir, capture.outputFile)),
      rawHtml: path.relative(root, path.join(sourceDir, capture.sourceFile)),
    })),
    assets: [...assets.values()].map((asset) => ({
      key: asset.key,
      status: asset.status,
      archiveUrl: asset.archiveUrl,
      localPath: asset.localPath ? path.relative(root, asset.localPath) : undefined,
      size: asset.size,
      contentType: asset.contentType,
      cdxRecord: asset.cdxRecord,
      refs: asset.refs,
    })),
    counts: {
      assetsTotal: assets.size,
      assetsDownloaded: [...assets.values()].filter((asset) => asset.status === 'downloaded').length,
      assetsMissing: [...assets.values()].filter((asset) => asset.status !== 'downloaded').length,
      bytesInAssets: await dirSize(assetsDir),
    },
  };

  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const missing = manifest.assets.filter((asset) => asset.status !== 'downloaded');
  const readme = `# Synaptik SSD 2022 Wayback Recovery

This package contains raw and locally rewritten captures for the conference pages under \`synaptik.ru/ssd2022\`.

## Best inputs for an LLM

1. \`LLM_HANDOFF.md\` - concise Russian brief with exact archive facts and reconstruction notes.
2. \`site/20221005042650-ssd2022/index.html\` - latest recovered main page, rewritten to local assets where available.
3. \`site/20221005055115-ssd2022-pamyatka/index.html\` - latest recovered memo page.
4. \`source-html/*.raw.html\` - raw Wayback \`id_\` HTML without toolbar rewriting.
5. \`manifest.json\` - exact CDX records, asset download status, and source archive URLs.

## Captures

${captures.map((capture) => `- ${capture.title}: ${archiveUrl(capture.timestamp, capture.original)} -> \`${path.relative(root, path.join(siteDir, capture.outputDir, capture.outputFile))}\``).join('\n')}

## Asset Status

- Downloaded assets: ${manifest.counts.assetsDownloaded}
- Missing assets: ${manifest.counts.assetsMissing}
- Asset bytes: ${manifest.counts.bytesInAssets}

Important: some page-specific CSS and many \`/img/25...\` images were referenced by HTML but were not present in Wayback CDX and returned 404 from both Wayback and the live domain. These missing files are listed in \`manifest.json\`.
`;
  await writeFile(path.join(root, 'README.md'), readme);

  const handoff = `# Бриф для LLM: восстановление сайта Synaptik Summer Day 2022

Нужно воссоздать внешний вид конференционного лендинга Synaptik Summer Day 2022 по архивным данным из этого пакета.

## Что найдено в Wayback

Основной URL: \`https://synaptik.ru/ssd2022/\`

Рабочие raw-ссылки без Wayback toolbar:

1. Главная, 16 августа 2022: ${archiveUrl('20220816061157', 'https://synaptik.ru/ssd2022/')}
2. Главная, 5 октября 2022: ${archiveUrl('20221005042650', 'https://synaptik.ru/ssd2022/')}
3. Памятка, 16 августа 2022: ${archiveUrl('20220816061030', 'https://synaptik.ru/ssd2022_pamyatka/')}
4. Памятка, 5 октября 2022: ${archiveUrl('20221005055115', 'https://synaptik.ru/ssd2022_pamyatka/')}

По CDX для \`synaptik.ru/ssd2023*\`, \`synaptik.ru/*2023*\` и широкому поиску по \`ssd\` на домене отдельных страниц конференции 2023 года не найдено. В архиве по этому домену видны только \`ssd2022\` и \`ssd2022_pamyatka\`.

## Локальные файлы

Лучше всего начать с:

1. \`site/20221005042650-ssd2022/index.html\` - главная страница.
2. \`site/20221005055115-ssd2022-pamyatka/index.html\` - памятка участника.
3. \`source-html/ssd2022_20221005042650.raw.html\` и \`source-html/ssd2022_pamyatka_20221005055115.raw.html\` - исходный HTML без переписывания.
4. \`assets/\` - доступные CSS/JS/SVG/часть изображений, скачанные из Wayback.
5. \`manifest.json\` - полный список найденных ассетов и отсутствующих файлов.

## Визуальный стиль по исходникам

- Конструктор: Flexbe. Верстка состоит из блоков \`b_block\`, \`container-fluid\`, \`content-zone\`, \`elements-list\`.
- Шрифт: Montserrat для заголовков, подзаголовков и основного текста.
- Первый экран: темный/контрастный hero с белым текстом, верхнее меню, кнопка регистрации, фоновое видео/изображение YouTube \`Hq8jCl8_Rno\`.
- Навигация главной: «Программа», «Спикеры», «Как добраться», «Стоимость», «FAQ».
- Контент главной: место проведения, программа, спикеры, дорога/карта, стоимость, FAQ, формы/модалки регистрации.
- Палитра: белый текст на темных/фото-фонах, черный/темный текст на светлых секциях, акцентные filled-кнопки Flexbe, квадратные/почти прямоугольные кнопки.
- Страница памятки: более утилитарная структура для участника, с тем же header/footer, контактами и блоками с важной информацией.

## Ограничения восстановления

Некоторые важные ассеты отсутствуют в Wayback:

- page-specific CSS \`/_app/lp/1493692_1659011756.css\` и \`/_app/lp/1506719_1659155113.css\`;
- многие изображения \`/img/256...\`, \`/img/257...\`, \`/img/258...\`.

Поэтому при точном редизайне используй HTML-структуру, inline styles, доступные общие CSS Flexbe и текстовый контент как основной источник, а недостающие фоновые фото/аватары можно заменить близкими по функции изображениями.

## Проверенные CDX-записи страниц

\`\`\`json
${JSON.stringify(cdxRecords, null, 2)}
\`\`\`
`;
  await writeFile(path.join(root, 'LLM_HANDOFF.md'), handoff);

  console.log(JSON.stringify(manifest.counts, null, 2));
  if (missing.length) {
    console.log(`Missing sample:\n${missing.slice(0, 20).map((asset) => `${asset.status} ${asset.key}`).join('\n')}`);
  }
}

await main();
