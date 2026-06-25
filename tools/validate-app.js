const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'service-worker.js',
  'README.md',
  'CHANGELOG.md',
  'package.json',
  'data/sources.json',
  'data/keywords.json',
  'data/playbooks.json',
  'assets/icon.svg'
];
const forbidden = ['.env.local', '.vercel', 'node_modules'];
const requiredKeys = ['pccc_radar_settings', 'pccc_radar_version', 'pccc_radar_history'];
const cacheName = 'pccc-news-radar-cache-v1.0.0';
let failed = false;

function fail(message) {
  failed = true;
  console.error(`FAIL: ${message}`);
}
function pass(message) {
  console.log(`PASS: ${message}`);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing required file ${file}`);
}
if (!failed) pass('Required files exist');

for (const item of forbidden) {
  if (fs.existsSync(path.join(root, item))) fail(`Forbidden item exists: ${item}`);
}
pass('Forbidden folders/files not present');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
if (!manifest.name || !manifest.short_name || !manifest.start_url || !manifest.icons?.length) fail('Manifest is incomplete');
else pass('Manifest looks valid');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!html.includes('id="appRoot"')) fail('index.html missing appRoot');
if (!html.includes('manifest.json')) fail('index.html missing manifest link');
else pass('HTML root and manifest link present');

const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
if (!sw.includes(cacheName)) fail(`service-worker.js missing cache name ${cacheName}`);
else pass('Service worker cache name is versioned');

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
for (const key of requiredKeys) {
  if (!app.includes(key)) fail(`app.js missing localStorage key ${key}`);
}
if (!app.includes('indexedDB.open')) fail('app.js missing IndexedDB usage');
if (!app.includes('window.print')) fail('app.js missing PDF print flow');
if (!app.includes('navigator.share')) fail('app.js missing Web Share API fallback flow');
pass('Core app features present');

const allText = requiredFiles
  .filter(file => ['.html', '.css', '.js', '.md', '.json'].includes(path.extname(file)))
  .map(file => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');
const placeholders = ['[TÊN APP]', '[MÔ TẢ', 'TODO:', 'FIXME:', 'YOUR_API_KEY', '.env.local'];
for (const ph of placeholders) {
  if (allText.includes(ph)) fail(`Placeholder or sensitive marker found: ${ph}`);
}
pass('No obvious placeholders or sensitive markers');

for (const dataFile of ['data/sources.json', 'data/keywords.json', 'data/playbooks.json']) {
  JSON.parse(fs.readFileSync(path.join(root, dataFile), 'utf8'));
}
pass('Data JSON files parse correctly');

if (failed) process.exit(1);
console.log('============================================');
console.log('PCCC NEWS RADAR V1.0.0 VALIDATION PASS');
console.log('============================================');
