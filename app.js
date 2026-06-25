/* PCCC News Radar V1.0.0 - Static PWA */
const APP_VERSION = '1.0.0';
const CACHE_NAME = 'pccc-news-radar-cache-v1.0.0';
const DB_NAME = 'pccc_news_radar_db';
const DB_VERSION = 1;
const LS_SETTINGS = 'pccc_radar_settings';
const LS_VERSION = 'pccc_radar_version';
const LS_HISTORY = 'pccc_radar_history';

const state = {
  tab: 'all',
  severity: 'all',
  query: '',
  settings: { theme: 'light', fontSize: 16 },
  feed: [],
  saved: [],
  equipment: [],
  sources: [],
  keywords: [],
  currentArticle: null,
  online: navigator.onLine,
  lastFetchNote: ''
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() { return new Date().toISOString(); }
function formatDate(value) {
  if (!value) return 'Chưa rõ thời gian';
  try { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
  catch { return value; }
}
function stripHtml(html = '') {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}
function escapeHtml(text = '') {
  return String(text).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
function categoryLabel(category) {
  const map = { all: 'Tất cả', incident: 'Cháy nổ', rescue: 'CNCH', law: 'Pháp quy', facebook: 'Facebook', tech: 'Công nghệ', model: 'Mô hình', equipment: 'Trang bị', data: 'Dữ liệu PCCC', saved: 'Đã lưu' };
  return map[category] || category || 'Khác';
}
function severityLabel(severity) {
  const map = { red: 'Đỏ', orange: 'Cam', yellow: 'Vàng', green: 'Xanh', all: 'Tất cả' };
  return map[severity] || 'Xanh';
}
function severityClass(severity) { return ['red', 'orange', 'yellow', 'green'].includes(severity) ? severity : 'green'; }
function sloganByStatus(status) {
  const map = {
    LIVE_RADAR: 'Tin nhanh, nguồn sạch, lưu bài học.',
    QUIET: 'Không có tin nóng cũng là lúc học sâu.',
    OFFLINE: 'Không mạng vẫn còn sổ tay.',
    ARTICLE_SAVED: 'Đã lưu là còn dùng được.',
    PDF_READY: 'Một bài hay, thành một hồ sơ đẹp.',
    SOURCE_ERROR: 'Nguồn lỗi, tay nghề vẫn không dừng.',
    READY: 'Mở radar, giữ nghề tỉnh.'
  };
  return map[status] || map.READY;
}
function setStatus(status, detail = '') {
  $('#statusLabel').textContent = status;
  $('#statusSlogan').textContent = detail || sloganByStatus(status);
}
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2300);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('articles')) {
        const articles = db.createObjectStore('articles', { keyPath: 'id' });
        articles.createIndex('savedAt', 'savedAt');
        articles.createIndex('category', 'category');
      }
      if (!db.objectStoreNames.contains('equipment')) {
        const equipment = db.createObjectStore('equipment', { keyPath: 'id' });
        equipment.createIndex('createdAt', 'createdAt');
        equipment.createIndex('type', 'type');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbAll(storeName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function dbPut(storeName, item) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}
async function dbDelete(storeName, id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function dbClear(storeName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

function loadSettings() {
  localStorage.setItem(LS_VERSION, APP_VERSION);
  try {
    state.settings = { ...state.settings, ...JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}') };
  } catch { /* keep defaults */ }
  applySettings();
}
function saveSettings() {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(state.settings));
  localStorage.setItem(LS_VERSION, APP_VERSION);
}
function applySettings() {
  document.documentElement.dataset.theme = state.settings.theme;
  document.documentElement.style.setProperty('--font-size', `${state.settings.fontSize || 16}px`);
}
function addHistory(action, payload = {}) {
  const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  history.unshift({ at: nowIso(), action, payload });
  localStorage.setItem(LS_HISTORY, JSON.stringify(history.slice(0, 100)));
}

async function loadStaticData() {
  const [sourceRes, keywordRes, playbookRes] = await Promise.all([
    fetch('data/sources.json'),
    fetch('data/keywords.json'),
    fetch('data/playbooks.json')
  ]);
  const sources = await sourceRes.json();
  const keywords = await keywordRes.json();
  const playbooks = await playbookRes.json();
  state.sources = sources.sources || [];
  state.keywords = keywords.hot || [];
  state.feed = (playbooks.items || []).map(item => normalizeArticle({ ...item, type: 'playbook', publishedAt: item.publishedAt || nowIso() }));
  renderSources();
  renderKeywords();
}

function normalizeArticle(raw) {
  const title = raw.title || raw.name || 'Chưa có tiêu đề';
  const content = raw.content || raw.description || raw.summary || '';
  return {
    id: raw.id || uid('article'),
    title,
    sourceName: raw.sourceName || raw.source || 'Nguồn chưa rõ',
    sourceUrl: raw.sourceUrl || raw.originalUrl || raw.link || '',
    originalUrl: raw.originalUrl || raw.link || raw.url || '',
    publishedAt: raw.publishedAt || raw.pubDate || raw.isoDate || nowIso(),
    savedAt: raw.savedAt || '',
    category: raw.category || guessCategory(`${title} ${content}`),
    severity: raw.severity || guessSeverity(`${title} ${content}`),
    tags: Array.isArray(raw.tags) ? raw.tags : inferTags(`${title} ${content}`),
    summary: stripHtml(raw.summary || raw.description || content).slice(0, 520),
    content: stripHtml(content),
    lessons: raw.lessons || suggestLesson(title, content),
    personalNotes: raw.personalNotes || '',
    readStatus: raw.readStatus || 'new',
    isOfflineReady: Boolean(raw.isOfflineReady),
    type: raw.type || 'news'
  };
}
function guessCategory(text = '') {
  const t = text.toLowerCase();
  if (/facebook|fanpage/.test(t)) return 'facebook';
  if (/luật|nghị định|thông tư|qcvn|văn bản|quy chuẩn/.test(t)) return 'law';
  if (/cứu nạn|cứu hộ|mắc kẹt|sập|đuối nước|tai nạn/.test(t)) return 'rescue';
  if (/bình chữa cháy|kiểm định|tem|trụ nước|thiết bị truyền tin|cơ sở dữ liệu/.test(t)) return 'equipment';
  if (/ai|iot|drone|robot|trực thăng|camera nhiệt|công nghệ|khoa học/.test(t)) return 'tech';
  if (/tổ liên gia|mô hình|điểm chữa cháy/.test(t)) return 'model';
  if (/cháy|nổ|hỏa hoạn/.test(t)) return 'incident';
  return 'incident';
}
function guessSeverity(text = '') {
  const t = text.toLowerCase();
  if (/tử vong|thương vong|nổ|hóa chất|chung cư|cao tầng|mắc kẹt|sập|pin lithium/.test(t)) return 'red';
  if (/cháy lớn|kho|xưởng|lan rộng|nhiều phương tiện|gas|cứu nạn/.test(t)) return 'orange';
  if (/khuyến cáo|kiểm tra|tập huấn|diễn tập|tuyên truyền|mô hình/.test(t)) return 'yellow';
  return 'green';
}
function inferTags(text = '') {
  const t = text.toLowerCase();
  return state.keywords.filter(k => t.includes(k.toLowerCase())).slice(0, 5);
}
function suggestLesson(title, content = '') {
  const text = `${title} ${content}`.toLowerCase();
  if (text.includes('bình chữa cháy') || text.includes('kiểm định')) return 'Đối chiếu tem, serial, tình trạng sử dụng và lịch kiểm tra; không chỉ nhìn thấy bình là coi như đủ.';
  if (text.includes('thiết bị truyền tin') || text.includes('cơ sở dữ liệu')) return 'Dữ liệu cơ sở phải đúng, đủ, cập nhật; kết nối truyền tin giúp rút ngắn thời gian phản ứng.';
  if (text.includes('chung cư') || text.includes('cao tầng')) return 'Kiểm tra lối thoát nạn, báo cháy, ngăn cháy, hướng dẫn cư dân và phương án ban đầu.';
  if (text.includes('kho') || text.includes('xưởng')) return 'Chú ý tải cháy, điện, hóa chất, lối tiếp cận, nguồn nước và phương án cắt điện.';
  return 'Đọc nguồn gốc, xác định nguy cơ chính, ghi một bài học có thể áp dụng tại địa bàn/cơ sở.';
}

async function loadSaved() {
  state.saved = (await dbAll('articles')).sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  state.equipment = (await dbAll('equipment')).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

async function refreshLiveFeeds() {
  setStatus('LIVE_RADAR', 'Đang thử lấy nguồn công khai; nguồn lỗi sẽ có link mở thủ công.');
  $('#refreshBtn').disabled = true;
  $('#refreshBtn').textContent = 'Đang cập nhật...';
  const rssSources = state.sources.filter(s => s.rss).slice(0, 3);
  const fetched = [];
  const errors = [];
  for (const source of rssSources) {
    try {
      const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(source.rss)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xmlText = await res.text();
      fetched.push(...parseRss(xmlText, source));
    } catch (err) {
      errors.push(`${source.name}: ${err.message}`);
    }
  }
  const merged = mergeArticles([...fetched, ...state.feed]);
  state.feed = merged;
  state.lastFetchNote = errors.length ? `Một số nguồn không đọc trực tiếp được: ${errors.join('; ')}` : `Đã cập nhật ${fetched.length} mục từ RSS/public feed.`;
  setStatus(errors.length ? 'SOURCE_ERROR' : 'LIVE_RADAR', state.lastFetchNote);
  $('#refreshBtn').disabled = false;
  $('#refreshBtn').textContent = 'Cập nhật';
  render();
}

function parseRss(xmlText, source) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item')).slice(0, 20);
  return items.map(item => {
    const title = item.querySelector('title')?.textContent || 'Tin mới';
    const link = item.querySelector('link')?.textContent || source.url;
    const description = item.querySelector('description')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || nowIso();
    return normalizeArticle({
      id: `rss_${btoa(unescape(encodeURIComponent(link))).replace(/=+$/, '').slice(-20)}`,
      title,
      originalUrl: link,
      sourceName: source.name,
      sourceUrl: source.url,
      publishedAt: pubDate,
      summary: description,
      content: description,
      category: source.category || guessCategory(title + description),
      type: 'rss'
    });
  });
}
function mergeArticles(list) {
  const seen = new Set();
  const merged = [];
  list.forEach(item => {
    const key = (item.originalUrl || item.title).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function filteredArticles() {
  let items = state.tab === 'saved' ? state.saved : state.feed;
  if (state.tab !== 'all' && state.tab !== 'saved') items = items.filter(item => item.category === state.tab || (state.tab === 'equipment' && item.category === 'data'));
  if (state.severity !== 'all') items = items.filter(item => item.severity === state.severity);
  const q = state.query.trim().toLowerCase();
  if (q) {
    items = items.filter(item => `${item.title} ${item.summary} ${item.content} ${item.sourceName} ${(item.tags || []).join(' ')}`.toLowerCase().includes(q));
  }
  return items;
}

function render() {
  renderMetrics();
  renderTabs();
  renderArticles();
  renderEquipment();
  renderHero();
}
function renderMetrics() {
  $('#metricNews').textContent = state.feed.length;
  $('#metricSaved').textContent = state.saved.length;
  $('#metricEquipment').textContent = state.equipment.length;
}
function renderHero() {
  const items = filteredArticles();
  const urgent = items.find(x => x.severity === 'red') || items[0];
  if (state.tab === 'saved') {
    $('#heroTitle').textContent = 'Kho bài đã lưu offline';
    $('#heroText').textContent = 'Các bài, hồ sơ và ghi chú đã lưu có thể đọc lại khi mất mạng.';
    return;
  }
  if (state.tab === 'equipment') {
    $('#heroTitle').textContent = 'Trang bị, kiểm định và dữ liệu cơ sở';
    $('#heroText').textContent = 'Theo dõi bình chữa cháy, tem kiểm định, truyền tin báo cháy, kết nối dữ liệu.';
    return;
  }
  $('#heroTitle').textContent = urgent ? urgent.title : 'Sẵn sàng lọc tin PCCC/CNCH';
  $('#heroText').textContent = urgent ? urgent.summary : 'Ưu tiên nguồn chính thống, lưu nội dung quan trọng để đọc lại offline và xuất PDF.';
}
function renderTabs() {
  [...$$('[data-tab]')].forEach(btn => btn.classList.toggle('active', btn.dataset.tab === state.tab));
  $('#equipmentSection').classList.toggle('hidden', state.tab !== 'equipment');
}
function renderSources() {
  $('#sourceList').innerHTML = state.sources.map(src => `
    <div class="source-card">
      <h4>${escapeHtml(src.name)}</h4>
      <p>${escapeHtml(src.type)} · ưu tiên ${src.priority}</p>
      <a href="${escapeHtml(src.url)}" target="_blank" rel="noopener">Mở nguồn</a>
      <a href="${escapeHtml(src.searchUrl || src.url)}" target="_blank" rel="noopener">Tìm nhanh</a>
    </div>
  `).join('');
}
function renderKeywords() {
  $('#hotKeywords').innerHTML = state.keywords.map(k => `<button type="button" data-keyword="${escapeHtml(k)}">${escapeHtml(k)}</button>`).join('');
  $$('[data-keyword]').forEach(btn => btn.addEventListener('click', () => {
    state.query = btn.dataset.keyword;
    $('#searchInput').value = state.query;
    render();
  }));
}
function renderArticles() {
  const items = filteredArticles();
  $('#feedMeta').textContent = `${items.length} mục · Tab ${categoryLabel(state.tab)} · ${state.online ? 'Online' : 'Offline'}${state.lastFetchNote ? ' · ' + state.lastFetchNote : ''}`;
  const list = $('#newsList');
  if (!items.length) {
    list.innerHTML = `<div class="news-card"><div class="news-thumb">EMPTY</div><div class="news-body"><h3 class="news-title">Chưa có mục phù hợp</h3><p class="news-summary">Thử đổi từ khóa, đổi tab hoặc dán bài cần lưu offline.</p></div></div>`;
    setStatus(state.online ? 'QUIET' : 'OFFLINE');
    return;
  }
  list.innerHTML = items.map(articleCard).join('');
  $$('.open-article').forEach(btn => btn.addEventListener('click', () => openArticle(btn.dataset.id, btn.dataset.store)));
  $$('.save-article').forEach(btn => btn.addEventListener('click', () => saveArticleById(btn.dataset.id)));
  $$('.copy-zalo').forEach(btn => btn.addEventListener('click', () => copyZaloById(btn.dataset.id, btn.dataset.store)));
  setStatus(state.online ? 'LIVE_RADAR' : 'OFFLINE');
}
function articleCard(item) {
  const store = state.saved.some(s => s.id === item.id) ? 'saved' : 'feed';
  const source = item.sourceName || 'Nguồn chưa rõ';
  const tags = (item.tags || []).slice(0, 3).map(t => `<span class="badge blue">${escapeHtml(t)}</span>`).join('');
  return `
    <article class="news-card">
      <div class="news-thumb">${escapeHtml(categoryLabel(item.category)).replace(' ', '<br>')}</div>
      <div class="news-body">
        <div class="news-meta"><span class="badge ${severityClass(item.severity)}">${severityLabel(item.severity)}</span><span>${escapeHtml(source)}</span><span>${formatDate(item.publishedAt || item.savedAt)}</span></div>
        <h3 class="news-title">${escapeHtml(item.title)}</h3>
        <p class="news-summary">${escapeHtml(item.summary || item.content || 'Chưa có tóm tắt.')}</p>
        <div class="news-meta">${tags}</div>
        <div class="news-actions">
          <button type="button" class="open-article" data-id="${escapeHtml(item.id)}" data-store="${store}">Đọc</button>
          ${store === 'saved' ? '<span class="badge green">Offline</span>' : `<button type="button" class="save-article" data-id="${escapeHtml(item.id)}">Lưu</button>`}
          <button type="button" class="copy-zalo" data-id="${escapeHtml(item.id)}" data-store="${store}">Copy Zalo</button>
          ${item.originalUrl ? `<a href="${escapeHtml(item.originalUrl)}" target="_blank" rel="noopener">Nguồn</a>` : ''}
        </div>
      </div>
    </article>
  `;
}
function renderEquipment() {
  const list = $('#equipmentList');
  if (!state.equipment.length) {
    list.innerHTML = '<div class="equipment-card"><h4>Chưa có hồ sơ thiết bị</h4><p>Bấm “＋ Hồ sơ thiết bị” để lưu bình chữa cháy, tem kiểm định, thiết bị truyền tin hoặc cơ sở.</p></div>';
    return;
  }
  list.innerHTML = state.equipment.map(item => `
    <div class="equipment-card">
      <div class="news-meta"><span class="badge ${equipmentBadgeClass(item.status)}">${equipmentStatusLabel(item.status)}</span><span>${escapeHtml(item.type)}</span><span>${formatDate(item.createdAt)}</span></div>
      <h4>${escapeHtml(item.name)}</h4>
      <p>${escapeHtml(item.location || 'Chưa ghi vị trí')} · ${escapeHtml(item.serial || 'Chưa ghi serial/mã tem')}</p>
      <p>${escapeHtml(item.notes || 'Chưa có ghi chú.')}</p>
      <div class="news-actions">
        <button type="button" data-print-equipment="${escapeHtml(item.id)}">Xuất PDF</button>
        <button type="button" data-copy-equipment="${escapeHtml(item.id)}">Copy Zalo</button>
        <button type="button" data-delete-equipment="${escapeHtml(item.id)}">Xóa</button>
      </div>
    </div>
  `).join('');
  $$('[data-print-equipment]').forEach(btn => btn.addEventListener('click', () => printEquipment(btn.dataset.printEquipment)));
  $$('[data-copy-equipment]').forEach(btn => btn.addEventListener('click', () => copyEquipment(btn.dataset.copyEquipment)));
  $$('[data-delete-equipment]').forEach(btn => btn.addEventListener('click', () => deleteEquipment(btn.dataset.deleteEquipment)));
}
function equipmentBadgeClass(status) {
  if (status === 'ok') return 'green';
  if (status === 'check' || status === 'expire-soon') return 'orange';
  return 'red';
}
function equipmentStatusLabel(status) {
  return ({ ok: 'OK', check: 'Cần kiểm tra', 'expire-soon': 'Sắp hết hạn', missing: 'Thiếu tem/chưa rõ', 'connect-needed': 'Cần kết nối dữ liệu' })[status] || status;
}

function findArticle(id, store = 'feed') {
  if (store === 'saved') return state.saved.find(x => x.id === id);
  return state.feed.find(x => x.id === id) || state.saved.find(x => x.id === id);
}
function openArticle(id, store = 'feed') {
  const article = findArticle(id, store);
  if (!article) return toast('Không tìm thấy bài viết');
  state.currentArticle = article;
  $('#articleDetail').innerHTML = articleDetailHtml(article);
  $('#articleDialog').showModal();
}
function articleDetailHtml(article) {
  return `
    <div class="news-meta"><span class="badge ${severityClass(article.severity)}">${severityLabel(article.severity)}</span><span>${escapeHtml(categoryLabel(article.category))}</span><span>${escapeHtml(article.sourceName || 'Nguồn chưa rõ')}</span><span>${formatDate(article.publishedAt || article.savedAt)}</span></div>
    <h2>${escapeHtml(article.title)}</h2>
    <p class="hint">${escapeHtml(article.summary || 'Chưa có tóm tắt.')}</p>
    <div class="lesson-box"><strong>Bài học PCCC/CNCH</strong><p>${escapeHtml(article.lessons || suggestLesson(article.title, article.content))}</p></div>
    <div class="article-content">${escapeHtml(article.content || article.summary || 'Nguồn chỉ cung cấp tóm tắt. Có thể dán nội dung toàn văn để lưu offline đầy đủ hơn.')}</div>
    <div class="source-box"><strong>Nguồn đối chiếu</strong><p>${article.originalUrl ? `<a href="${escapeHtml(article.originalUrl)}" target="_blank" rel="noopener">${escapeHtml(article.originalUrl)}</a>` : 'Chưa có link gốc.'}</p></div>
  `;
}
async function saveArticleById(id) {
  const article = state.feed.find(x => x.id === id) || state.saved.find(x => x.id === id);
  if (!article) return toast('Không tìm thấy bài để lưu');
  await saveArticle(article);
}
async function saveArticle(article) {
  const saved = { ...article, savedAt: nowIso(), isOfflineReady: true, readStatus: 'saved' };
  await dbPut('articles', saved);
  addHistory('ARTICLE_SAVED', { id: saved.id, title: saved.title });
  await loadSaved();
  render();
  setStatus('ARTICLE_SAVED');
  toast('Đã lưu offline');
}
async function saveCurrentArticle() {
  if (!state.currentArticle) return toast('Chưa có bài đang mở');
  await saveArticle(state.currentArticle);
}
function copyZaloById(id, store = 'feed') {
  const article = findArticle(id, store);
  if (!article) return toast('Không tìm thấy bài');
  copyText(zaloTemplate(article), 'Đã copy bản tin Zalo');
}
function zaloTemplate(article) {
  return `[PCCC RADAR] Tin cần chú ý\n\nTiêu đề: ${article.title}\nNguồn: ${article.sourceName || 'Chưa rõ'}\nNhóm: ${categoryLabel(article.category)}\nMức độ: ${severityLabel(article.severity)}\nTóm tắt: ${article.summary || ''}\nBài học nhanh: ${article.lessons || suggestLesson(article.title, article.content)}\nLink gốc: ${article.originalUrl || 'Không có'}\n\nGhi chú: Đã lưu/đối chiếu trong PCCC News Radar.`;
}
async function shareCurrentArticle() {
  if (!state.currentArticle) return toast('Chưa có bài để chia sẻ');
  const text = zaloTemplate(state.currentArticle);
  if (navigator.share) {
    try {
      await navigator.share({ title: state.currentArticle.title, text, url: state.currentArticle.originalUrl || location.href });
      toast('Đã mở bảng chia sẻ');
    } catch {
      copyText(text, 'Đã copy để dán Zalo');
    }
  } else {
    copyText(text, 'Đã copy để dán Zalo');
  }
}
async function copyText(text, okMessage) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMessage);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast(okMessage);
  }
}

function printCurrentArticle() {
  if (!state.currentArticle) return toast('Chưa có bài để xuất PDF');
  renderPrintArticle(state.currentArticle);
  doPrint();
}
function renderPrintArticle(article) {
  $('#printArea').innerHTML = `
    <section class="pdf-sheet">
      <div class="pdf-header"><h1>PCCC NEWS RADAR</h1><p>Hồ sơ bài viết / vụ việc / kiến thức nghiệp vụ · Xuất từ PWA offline</p></div>
      <h2 class="pdf-title">${escapeHtml(article.title)}</h2>
      <div class="pdf-meta">
        <strong>Nguồn</strong><span>${escapeHtml(article.sourceName || 'Chưa rõ')}</span>
        <strong>Link gốc</strong><span>${escapeHtml(article.originalUrl || 'Không có')}</span>
        <strong>Ngày lưu/xuất</strong><span>${formatDate(article.savedAt || nowIso())}</span>
        <strong>Nhóm</strong><span>${escapeHtml(categoryLabel(article.category))}</span>
        <strong>Mức độ</strong><span>${escapeHtml(severityLabel(article.severity))}</span>
      </div>
      <div class="pdf-section"><h2>Tóm tắt nhanh</h2><p>${escapeHtml(article.summary || '')}</p></div>
      <div class="pdf-section"><h2>Nội dung chính</h2><div>${escapeHtml(article.content || article.summary || '')}</div></div>
      <div class="pdf-section"><h2>Bài học PCCC/CNCH</h2><p>${escapeHtml(article.lessons || suggestLesson(article.title, article.content))}</p></div>
      <div class="pdf-section"><h2>Ghi chú cá nhân</h2><p>${escapeHtml(article.personalNotes || 'Chưa có ghi chú.')}</p></div>
      <div class="pdf-footer">Lưu ý: Tài liệu hỗ trợ ghi nhớ/tham khảo, không thay thế văn bản hoặc kết luận chính thức.</div>
    </section>
  `;
}
function printEquipment(id) {
  const item = state.equipment.find(x => x.id === id);
  if (!item) return toast('Không tìm thấy hồ sơ');
  $('#printArea').innerHTML = `
    <section class="pdf-sheet">
      <div class="pdf-header"><h1>PCCC NEWS RADAR</h1><p>Hồ sơ trang bị / kiểm định / dữ liệu cơ sở</p></div>
      <h2 class="pdf-title">${escapeHtml(item.name)}</h2>
      <div class="pdf-meta">
        <strong>Loại</strong><span>${escapeHtml(item.type)}</span>
        <strong>Trạng thái</strong><span>${escapeHtml(equipmentStatusLabel(item.status))}</span>
        <strong>Vị trí</strong><span>${escapeHtml(item.location || 'Chưa ghi')}</span>
        <strong>Mã/Serial</strong><span>${escapeHtml(item.serial || 'Chưa ghi')}</span>
        <strong>Ngày kiểm định</strong><span>${escapeHtml(item.checkedAt || 'Chưa ghi')}</span>
        <strong>Kiểm tra lại</strong><span>${escapeHtml(item.nextCheckAt || 'Chưa ghi')}</span>
      </div>
      <div class="pdf-section"><h2>Ghi chú nghiệp vụ</h2><p>${escapeHtml(item.notes || 'Chưa có ghi chú.')}</p></div>
      <div class="pdf-section"><h2>Điểm cần kiểm tra</h2><p>Tem kiểm định / mã QR / serial; áp suất hoặc tình trạng sử dụng; vị trí đặt; khả năng tiếp cận; lịch kiểm tra; trạng thái truyền tin/kết nối dữ liệu nếu có.</p></div>
      <div class="pdf-footer">Tài liệu hỗ trợ quản lý nội bộ, cần đối chiếu hồ sơ/văn bản chính thức.</div>
    </section>
  `;
  doPrint();
}
function doPrint() {
  setStatus('PDF_READY');
  document.body.classList.add('printing');
  setTimeout(() => {
    window.print();
    setTimeout(() => document.body.classList.remove('printing'), 300);
  }, 80);
}

async function handlePasteSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const article = normalizeArticle({
    id: uid('manual'),
    ...data,
    sourceName: data.sourceName || 'Dán thủ công',
    publishedAt: nowIso(),
    savedAt: nowIso(),
    type: 'manual',
    isOfflineReady: true,
    tags: (data.tags || '').split(',').map(x => x.trim()).filter(Boolean)
  });
  await dbPut('articles', article);
  await loadSaved();
  render();
  $('#pasteDialog').close();
  event.currentTarget.reset();
  setStatus('ARTICLE_SAVED');
  toast('Đã lưu bài dán offline');
}
async function handleEquipmentSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const item = { id: uid('equip'), ...data, createdAt: nowIso(), updatedAt: nowIso() };
  await dbPut('equipment', item);
  await loadSaved();
  render();
  $('#equipmentDialog').close();
  event.currentTarget.reset();
  toast('Đã lưu hồ sơ thiết bị');
}
async function deleteEquipment(id) {
  if (!confirm('Xóa hồ sơ thiết bị này?')) return;
  await dbDelete('equipment', id);
  await loadSaved();
  render();
  toast('Đã xóa hồ sơ');
}
function copyEquipment(id) {
  const item = state.equipment.find(x => x.id === id);
  if (!item) return toast('Không tìm thấy hồ sơ');
  copyText(`[PCCC RADAR] Hồ sơ thiết bị/cơ sở\n\nTên: ${item.name}\nLoại: ${item.type}\nTrạng thái: ${equipmentStatusLabel(item.status)}\nVị trí: ${item.location || 'Chưa ghi'}\nMã/Serial: ${item.serial || 'Chưa ghi'}\nNgày kiểm định/khai báo: ${item.checkedAt || 'Chưa ghi'}\nKiểm tra lại: ${item.nextCheckAt || 'Chưa ghi'}\nGhi chú: ${item.notes || 'Không có'}`, 'Đã copy hồ sơ Zalo');
}

async function exportData() {
  const payload = {
    app: 'PCCC News Radar',
    version: APP_VERSION,
    exportedAt: nowIso(),
    settings: state.settings,
    articles: await dbAll('articles'),
    equipment: await dbAll('equipment'),
    history: JSON.parse(localStorage.getItem(LS_HISTORY) || '[]')
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pccc-news-radar-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Đã xuất JSON sao lưu');
}
async function importData(file) {
  if (!file) return;
  const text = await file.text();
  const payload = JSON.parse(text);
  if (!payload || !Array.isArray(payload.articles)) throw new Error('File JSON không đúng định dạng');
  for (const article of payload.articles) await dbPut('articles', article);
  for (const item of (payload.equipment || [])) await dbPut('equipment', item);
  if (payload.settings) {
    state.settings = { ...state.settings, ...payload.settings };
    saveSettings();
    applySettings();
  }
  await loadSaved();
  render();
  toast('Đã nhập dữ liệu');
}

function bindEvents() {
  $('#refreshBtn').addEventListener('click', refreshLiveFeeds);
  $('#searchInput').addEventListener('input', (e) => { state.query = e.target.value; render(); });
  $('#themeBtn').addEventListener('click', () => {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings(); applySettings();
  });
  $$('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
    state.tab = btn.dataset.tab;
    render();
    if (state.tab === 'equipment') $('#equipmentSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  $$('.filter-chip').forEach(btn => btn.addEventListener('click', () => {
    state.severity = btn.dataset.severity;
    $$('.filter-chip').forEach(x => x.classList.toggle('active', x === btn));
    render();
  }));
  $('#pasteArticleBtn').addEventListener('click', () => $('#pasteDialog').showModal());
  $('#addEquipmentBtn').addEventListener('click', () => $('#equipmentDialog').showModal());
  $('#closeArticleBtn').addEventListener('click', () => $('#articleDialog').close());
  $('#saveArticleBtn').addEventListener('click', saveCurrentArticle);
  $('#pdfArticleBtn').addEventListener('click', printCurrentArticle);
  $('#shareArticleBtn').addEventListener('click', shareCurrentArticle);
  $('#pasteForm').addEventListener('submit', handlePasteSubmit);
  $('#equipmentForm').addEventListener('submit', handleEquipmentSubmit);
  $('#exportDataBtn').addEventListener('click', exportData);
  $('#importDataInput').addEventListener('change', async (e) => {
    try { await importData(e.target.files[0]); } catch (err) { toast(`Lỗi nhập: ${err.message}`); }
    e.target.value = '';
  });
  $$('[data-close-dialog]').forEach(btn => btn.addEventListener('click', () => $('#' + btn.dataset.closeDialog).close()));
  window.addEventListener('online', () => { state.online = true; setStatus('LIVE_RADAR'); renderArticles(); });
  window.addEventListener('offline', () => { state.online = false; setStatus('OFFLINE'); renderArticles(); });
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('service-worker.js'); }
    catch (err) { console.warn('Service worker registration failed', err); }
  }
}

async function boot() {
  loadSettings();
  bindEvents();
  await loadStaticData();
  await loadSaved();
  await registerServiceWorker();
  render();
  setStatus(navigator.onLine ? 'READY' : 'OFFLINE');
}

boot().catch(err => {
  console.error(err);
  setStatus('ERROR', 'App gặp lỗi khởi tạo, hãy tải lại trang hoặc kiểm tra console.');
});
