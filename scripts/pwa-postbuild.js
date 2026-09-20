const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIST = 'dist';
const NAVY = '#101E36';
const SRC = 'assets/icon.png';

const SW = `const CACHE = 'valorize-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }
  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
  }
});
`;

async function main() {
  fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true });

  for (const size of [192, 512]) {
    await sharp(SRC).resize(size, size).png().toFile(path.join(DIST, 'icons', 'icon-' + size + '.png'));
  }

  const inner = Math.round(512 * 0.72);
  const innerBuf = await sharp(SRC).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: NAVY } })
    .composite([{ input: innerBuf, gravity: 'center' }])
    .png()
    .toFile(path.join(DIST, 'icons', 'maskable-512.png'));

  await sharp(SRC)
    .resize(180, 180)
    .flatten({ background: NAVY })
    .png()
    .toFile(path.join(DIST, 'icons', 'apple-touch-icon.png'));

  const manifest = {
    name: 'Valorize',
    short_name: 'Valorize',
    description: 'Calcule o preço justo dos seus serviços e veja seu lucro em tempo real.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'pt-BR',
    background_color: NAVY,
    theme_color: NAVY,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
  fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(DIST, 'sw.js'), SW);

  const htmlPath = path.join(DIST, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  if (!html.includes('rel="manifest"')) {
    const tags = [
      '<link rel="manifest" href="/manifest.json">',
      '<meta name="theme-color" content="' + NAVY + '">',
      '<meta name="mobile-web-app-capable" content="yes">',
      '<meta name="apple-mobile-web-app-capable" content="yes">',
      '<meta name="apple-mobile-web-app-status-bar-style" content="black">',
      '<meta name="apple-mobile-web-app-title" content="Valorize">',
      '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">',
      '<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js")})}</script>'
    ].join('\n');
    html = html.replace('</head>', tags + '\n</head>');
  }
  html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">');
  html = html.replace(/<html lang="[^"]*"/, '<html lang="pt-BR"');
  fs.writeFileSync(htmlPath, html);

  console.log('PWA ok: manifest, icones, service worker e index.html prontos em dist/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
