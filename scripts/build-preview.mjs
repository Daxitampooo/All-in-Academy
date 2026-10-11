// Builds a single self-contained HTML page from the Expo web export, for
// previews hosted somewhere we don't control the URL path (a private
// claude.ai artifact). The JS bundle is inlined, fonts become data: URIs, and
// the router starts at "/" whatever path the page is served from.
//
// Usage (after `pnpm --filter @all-in-academy/mobile export:web`):
//   node scripts/build-preview.mjs [outFile]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = join(root, 'apps/mobile');
const dist = join(mobile, 'dist');
const outFile = process.argv[2] ?? join(dist, 'preview.html');
const require = createRequire(join(mobile, 'package.json'));

// Must match the names passed to useFonts() in src/app/_layout.tsx.
const fonts = {
  Inter_400Regular: '@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
  Inter_500Medium: '@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
  Inter_600SemiBold: '@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
  Unbounded_600SemiBold: '@expo-google-fonts/unbounded/600SemiBold/Unbounded_600SemiBold.ttf',
  Unbounded_700Bold: '@expo-google-fonts/unbounded/700Bold/Unbounded_700Bold.ttf',
};

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');
const bundlePath = indexHtml.match(/<script src="\/?(_expo\/static\/js\/web\/[^"]+\.js)"/)?.[1];
if (!bundlePath) throw new Error('Bundle <script> not found in dist/index.html');
const bundle = readFileSync(join(dist, bundlePath), 'utf8').replace(/<\/script/gi, '<\\/script');

// expo-font treats fonts declared in this style element as already loaded.
const fontFaces = Object.entries(fonts)
  .map(([family, file]) => {
    const data = readFileSync(require.resolve(file)).toString('base64');
    return `@font-face{font-family:"${family}";src:url(data:font/ttf;base64,${data}) format("truetype");}`;
  })
  .join('\n');

const html = `<title>All-in Academy</title>
<meta name="theme-color" content="#07070D">
<style id="expo-generated-fonts">
${fontFaces}
</style>
<style>
  :root { color-scheme: dark; }
  html, body { height: 100%; }
  body { margin: 0; overflow: hidden; background: #07070D; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<script>
  // Expo Router reads the URL path; the preview host serves the page from its own path.
  try { if (location.pathname !== '/') history.replaceState(history.state, '', '/'); } catch (e) {}
</script>
<div id="root"></div>
<script>
${bundle}
</script>
`;

writeFileSync(outFile, html);
console.log(`Preview written to ${outFile} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
