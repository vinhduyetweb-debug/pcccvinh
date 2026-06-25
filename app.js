/* PCCC News Radar V1.1.1 Field Pro - Latest First Hotline */
const APP_VERSION = '1.1.1';
const CACHE_NAME = 'pccc-news-radar-cache-v1.1.1';
const DB_NAME = 'pccc_news_radar_db';
const DB_VERSION = 2;
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
  incidents: [],
  checklistRuns: [],
  milestones: [],
  sourceHealth: [],
  duplicateGroups: [],
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
function parseTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
function formatDate(value) {
  if (!value) return 'Chưa rõ thời gian';
  try { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
  catch { return value; }
}
function relativeTime(value) {
  const time = parseTime(value);
  if (!time) return 'chưa rõ thời gian';
  const diffMs = Date.now() - time;
  if (diffMs < -60000) return 'vừa cập nhật';
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `cách đây ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `cách đây ${hours} giờ`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `cách đây ${days} ngày`;
  const months = Math.floor(days / 30);
  return `cách đây ${months} tháng`;
}
function articleTime(item) {
  return parseTime(item?.publishedAt || item?.savedAt || item?.createdAt);
}
function articleText(item) {
  return `${item?.title || ''} ${item?.summary || ''} ${item?.content || ''} ${(item?.tags || []).join(' ')} ${item?.category || ''}`.toLowerCase();
}
function isIncidentOrAccident(item) {
  const text = articleText(item);
  if (['incident', 'rescue'].includes(item?.category)) return true;
  return /cháy|hỏa hoạn|nổ|tai nạn|sự cố|cứu nạn|cứu hộ|cnch|mắc kẹt|sập|đuối nước|thương vong|thiệt mạng|va chạm|tìm kiếm cứu nạn/.test(text);
}
function priorityRank(item) {
  if (!item) return 0;
  const text = articleText(item);
  const severe = item.severity === 'red' ? 4 : item.severity === 'orange' ? 3 : item.severity === 'yellow' ? 2 : 1;
  const live = item.type === 'live' || item.type === 'live-api' || item.type === 'rss' ? 2 : 0;
  const fieldHot = isIncidentOrAccident(item) ? 12 : 0;
  const official = /cục|bộ công an|công an|chính phủ|pccc|cand/i.test(item.sourceName || '') ? 1 : 0;
  const todayish = Date.now() - articleTime(item) <= 36 * 3600000 ? 3 : 0;
  const explicitHot = /mới nhất|khẩn|nóng|vừa xảy ra|hiện trường/.test(text) ? 1 : 0;
  return fieldHot + todayish + severe + live + official + explicitHot;
}
function sortFieldNews(items = []) {
  return [...items].sort((a, b) => {
    const aIncident = isIncidentOrAccident(a) ? 1 : 0;
    const bIncident = isIncidentOrAccident(b) ? 1 : 0;
    if (aIncident !== bIncident) return bIncident - aIncident;
    const timeDiff = articleTime(b) - articleTime(a);
    if (timeDiff) return timeDiff;
    return priorityRank(b) - priorityRank(a);
  });
}
function latestIncident(items = []) {
  return sortFieldNews(items.filter(isIncidentOrAccident))[0] || sortFieldNews(items)[0] || null;
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
  const map = { all: 'Tất cả', incident: 'Cháy nổ', rescue: 'CNCH', law: 'Pháp quy', facebook: 'Facebook', tech: 'Công nghệ', model: 'Mô hình', equipment: 'Trang bị', data: 'Dữ liệu PCCC', 'incident-log': 'Vụ việc', checklist: 'Checklist', milestones: 'Mốc', saved: 'Đã lưu' };
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
    FIELD_PRO: 'Tin vào app, nhưng nghề nằm ở hồ sơ và checklist.',
    DUPLICATE_GROUPED: 'Một vụ nhiều nguồn, ưu tiên nguồn chính thống.',
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
      if (!db.objectStoreNames.contains('incidents')) {
        const incidents = db.createObjectStore('incidents', { keyPath: 'id' });
        incidents.createIndex('createdAt', 'createdAt');
        incidents.createIndex('severity', 'severity');
      }
      if (!db.objectStoreNames.contains('checklistRuns')) {
        const runs = db.createObjectStore('checklistRuns', { keyPath: 'id' });
        runs.createIndex('createdAt', 'createdAt');
        runs.createIndex('template', 'template');
      }
      if (!db.objectStoreNames.contains('milestones')) {
        const milestones = db.createObjectStore('milestones', { keyPath: 'id' });
        milestones.createIndex('dueDate', 'dueDate');
        milestones.createIndex('status', 'status');
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
  if (/cứu nạn|cứu hộ|mắc kẹt|sập|đuối nước|tai nạn|sự cố|tìm kiếm cứu nạn|va chạm/.test(t)) return 'rescue';
  if (/bình chữa cháy|kiểm định|tem|trụ nước|thiết bị truyền tin|cơ sở dữ liệu/.test(t)) return 'equipment';
  if (/ai|iot|drone|robot|trực thăng|camera nhiệt|công nghệ|khoa học/.test(t)) return 'tech';
  if (/tổ liên gia|mô hình|điểm chữa cháy/.test(t)) return 'model';
  if (/cháy|nổ|hỏa hoạn/.test(t)) return 'incident';
  return 'incident';
}
function guessSeverity(text = '') {
  const t = text.toLowerCase();
  if (/tử vong|thương vong|thiệt mạng|nổ|hóa chất|chung cư|cao tầng|mắc kẹt|sập|pin lithium|tai nạn nghiêm trọng/.test(t)) return 'red';
  if (/cháy lớn|kho|xưởng|lan rộng|nhiều phương tiện|gas|cứu nạn|cứu hộ|sự cố|tai nạn/.test(t)) return 'orange';
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
  state.incidents = (await dbAll('incidents')).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  state.checklistRuns = (await dbAll('checklistRuns')).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  state.milestones = (await dbAll('milestones')).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
}

async function refreshLiveFeeds() {
  setStatus('LIVE_RADAR', 'Đang lấy Tin mới thật: Vercel Live API trước, RSS/public feed sau.');
  $('#refreshBtn').disabled = true;
  $('#refreshBtn').textContent = 'Đang lấy tin nóng...';
  const fetched = [];
  const errors = [];

  try {
    const apiRes = await fetch(`api/live-news?t=${Date.now()}`, { cache: 'no-store' });
    if (!apiRes.ok) throw new Error(`Live API HTTP ${apiRes.status}`);
    const payload = await apiRes.json();
    if (Array.isArray(payload.items) && payload.items.length) {
      fetched.push(...payload.items.map(item => normalizeArticle({ ...item, type: 'live-api' })));
      state.sourceHealth = (payload.sources || []).map(s => ({ ...s, at: nowIso(), status: s.error ? 'error' : 'ok' }));
      if (payload.errors?.length) errors.push(...payload.errors.slice(0, 3));
    } else {
      throw new Error('Live API chưa trả về tin mới');
    }
  } catch (err) {
    errors.push(`Live API: ${err.message}`);
    const rssItems = await refreshRssFallback(errors);
    fetched.push(...rssItems);
  }

  const merged = mergeArticles([...fetched, ...state.feed]);
  state.feed = merged;
  state.duplicateGroups = buildDuplicateGroups([...fetched, ...state.feed]);
  if (fetched.length) {
    state.lastFetchNote = `Đã cập nhật ${fetched.length} tin/mục mới. ${errors.length ? 'Có nguồn phụ lỗi: ' + errors.slice(0, 2).join('; ') : 'Ưu tiên tin mới qua Live API/RSS.'}`;
    setStatus('LIVE_RADAR', state.lastFetchNote);
  } else {
    state.lastFetchNote = `Chưa kéo được tin tự động. Hãy bấm “Mở tìm tin nóng” để tìm trực tiếp trên nguồn mới nhất. ${errors.slice(0, 2).join('; ')}`;
    setStatus('SOURCE_ERROR', state.lastFetchNote);
  }
  $('#refreshBtn').disabled = false;
  $('#refreshBtn').textContent = 'Cập nhật nóng';
  render();
}

async function refreshRssFallback(errors = []) {
  const rssSources = state.sources.filter(s => s.rss).slice(0, 5);
  const fetched = [];
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
  return fetched;
}

function openHotSearch() {
  const query = encodeURIComponent('(cháy OR hỏa hoạn OR PCCC OR CNCH OR cứu nạn cứu hộ) Việt Nam when:1d');
  const urls = [
    `https://news.google.com/search?q=${query}&hl=vi&gl=VN&ceid=VN:vi`,
    'https://www.google.com/search?q=site%3Acanhsatpccc.gov.vn+PCCC+CNCH+ch%C3%A1y+n%E1%BB%95&tbm=nws',
    'https://www.facebook.com/search/posts?q=PCCC%20CNCH%20ch%C3%A1y%20n%E1%BB%95'
  ];
  urls.forEach((url, idx) => setTimeout(() => window.open(url, '_blank', 'noopener'), idx * 250));
  toast('Đã mở các luồng tìm tin nóng');
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
  return sortFieldNews(merged);
}
function groupKey(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['trong','dong','cong','chay','pccc','cnch','viet','nam','moi','nhat','nguoi','ngay'].includes(w))
    .slice(0, 7)
    .sort()
    .join('|');
}
function buildDuplicateGroups(list) {
  const map = new Map();
  list.forEach(item => {
    const key = groupKey(item.title + ' ' + (item.summary || ''));
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return Array.from(map.entries())
    .map(([key, items]) => ({ key, items, count: items.length, title: items[0]?.title || 'Nhóm tin' }))
    .filter(group => group.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function filteredArticles() {
  let items = state.tab === 'saved' ? state.saved : state.feed;
  if (state.tab !== 'all' && state.tab !== 'saved') items = items.filter(item => item.category === state.tab || (state.tab === 'equipment' && item.category === 'data'));
  if (state.severity !== 'all') items = items.filter(item => item.severity === state.severity);
  const q = state.query.trim().toLowerCase();
  if (q) {
    items = items.filter(item => `${item.title} ${item.summary} ${item.content} ${item.sourceName} ${(item.tags || []).join(' ')}`.toLowerCase().includes(q));
  }
  return sortFieldNews(items);
}

function render() {
  renderMetrics();
  renderTabs();
  renderArticles();
  renderEquipment();
  renderFieldProDashboard();
  renderIncidents();
  renderChecklists();
  renderMilestones();
  renderHero();
}
function renderMetrics() {
  $('#metricNews').textContent = state.feed.length;
  $('#metricSaved').textContent = state.saved.length;
  $('#metricEquipment').textContent = state.equipment.length;
  const urgent = state.feed.filter(x => x.severity === 'red').length;
  const metricUrgent = $('#metricUrgent');
  if (metricUrgent) metricUrgent.textContent = urgent;
}
function renderHero() {
  const items = filteredArticles();
  const urgent = latestIncident(items);
  const kicker = $('#heroPanel .kicker');
  if (state.tab === 'saved') {
    kicker.textContent = 'Kho đã lưu offline';
    $('#heroTitle').textContent = 'Kho bài đã lưu offline';
    $('#heroText').textContent = 'Các bài, hồ sơ và ghi chú đã lưu có thể đọc lại khi mất mạng.';
    return;
  }
  if (state.tab === 'equipment') {
    kicker.textContent = 'Trang bị & kiểm định';
    $('#heroTitle').textContent = 'Trang bị, kiểm định và dữ liệu cơ sở';
    $('#heroText').textContent = 'Theo dõi bình chữa cháy, tem kiểm định, truyền tin báo cháy, kết nối dữ liệu.';
    return;
  }
  kicker.textContent = urgent && isIncidentOrAccident(urgent) ? `Tin cháy/CNCH mới nhất · ${relativeTime(urgent.publishedAt || urgent.savedAt)}` : 'Radar hôm nay';
  $('#heroTitle').textContent = urgent ? urgent.title : 'Sẵn sàng lọc tin PCCC/CNCH';
  $('#heroText').textContent = urgent ? `${severityLabel(urgent.severity)} · ${urgent.sourceName || 'Nguồn chưa rõ'} · ${formatDate(urgent.publishedAt || urgent.savedAt)} · ${urgent.summary || 'Chưa có tóm tắt.'}` : 'Ưu tiên nguồn chính thống, lưu nội dung quan trọng để đọc lại offline và xuất PDF.';
}
function renderTabs() {
  [...$$('[data-tab]')].forEach(btn => btn.classList.toggle('active', btn.dataset.tab === state.tab));
  $('#equipmentSection').classList.toggle('hidden', state.tab !== 'equipment');
  $('#incidentSection')?.classList.toggle('hidden', state.tab !== 'incident-log');
  $('#checklistSection')?.classList.toggle('hidden', state.tab !== 'checklist');
  $('#milestoneSection')?.classList.toggle('hidden', state.tab !== 'milestones' && state.tab !== 'law' && state.tab !== 'data');
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
  if (['incident-log', 'checklist', 'milestones'].includes(state.tab)) {
    renderSpecialFeed();
    return;
  }
  const items = filteredArticles();
  const newest = latestIncident(items);
  $('#feedMeta').textContent = `${items.length} mục · Tin cháy/CNCH mới nhất ${newest ? relativeTime(newest.publishedAt || newest.savedAt) : 'chưa có'} · Tab ${categoryLabel(state.tab)} · ${state.online ? 'Online' : 'Offline'}${state.lastFetchNote ? ' · ' + state.lastFetchNote : ''}`;
  const list = $('#newsList');
  if (!items.length) {
    list.innerHTML = `<div class="news-card"><div class="news-thumb">EMPTY</div><div class="news-body"><h3 class="news-title">Chưa có mục phù hợp</h3><p class="news-summary">Thử đổi từ khóa, đổi tab hoặc dán bài cần lưu offline.</p></div></div>`;
    setStatus(state.online ? 'QUIET' : 'OFFLINE');
    return;
  }
  list.innerHTML = items.map((item, idx) => articleCard(item, idx)).join('');
  $$('.open-article').forEach(btn => btn.addEventListener('click', () => openArticle(btn.dataset.id, btn.dataset.store)));
  $$('.save-article').forEach(btn => btn.addEventListener('click', () => saveArticleById(btn.dataset.id)));
  $$('.copy-zalo').forEach(btn => btn.addEventListener('click', () => copyZaloById(btn.dataset.id, btn.dataset.store)));
  setStatus(state.online ? 'LIVE_RADAR' : 'OFFLINE');
}
function articleCard(item, index = 0) {
  const store = state.saved.some(s => s.id === item.id) ? 'saved' : 'feed';
  const source = item.sourceName || 'Nguồn chưa rõ';
  const isLatest = index === 0 && isIncidentOrAccident(item);
  const tags = (item.tags || []).slice(0, 3).map(t => `<span class="badge blue">${escapeHtml(t)}</span>`).join('');
  const timeText = relativeTime(item.publishedAt || item.savedAt);
  return `
    <article class="news-card ${isLatest ? 'latest-card' : ''}">
      <div class="news-thumb">${isLatest ? 'MỚI<br>NHẤT' : escapeHtml(categoryLabel(item.category)).replace(' ', '<br>')}</div>
      <div class="news-body">
        ${isLatest ? '<div class="breaking-label">TIN CHÁY / TAI NẠN SỰ CỐ MỚI NHẤT</div>' : ''}
        <div class="news-meta"><span class="badge ${severityClass(item.severity)}">${severityLabel(item.severity)}</span><span class="time-pill">${timeText}</span><span>${escapeHtml(source)}</span><span>${formatDate(item.publishedAt || item.savedAt)}</span></div>
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

function renderIncidents() {
  const el = $('#incidentList');
  if (!el) return;
  el.innerHTML = state.incidents.length ? state.incidents.map(item => `<div class="equipment-card"><div class="news-meta"><span class="badge ${severityClass(item.severity)}">${severityLabel(item.severity)}</span><span>${escapeHtml(item.location || 'Chưa rõ')}</span><span>${formatDate(item.createdAt)}</span></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.summary || item.lesson || 'Chưa có tóm tắt.')}</p><div class="news-actions"><button data-print-incident="${escapeHtml(item.id)}">Xuất PDF</button><button data-copy-incident="${escapeHtml(item.id)}">Copy Zalo</button><button data-delete-incident="${escapeHtml(item.id)}">Xóa</button></div></div>`).join('') : '<div class="equipment-card"><h4>Chưa có hồ sơ vụ việc</h4><p>Bấm “＋ Hồ sơ vụ việc” để lưu bài học sau vụ cháy/CNCH.</p></div>';
  bindIncidentButtons();
}
function renderChecklists() {
  const el = $('#checklistList');
  if (!el) return;
  el.innerHTML = state.checklistRuns.length ? state.checklistRuns.map(item => `<div class="equipment-card"><div class="news-meta"><span class="badge blue">${escapeHtml(item.template)}</span><span>${formatDate(item.createdAt)}</span></div><h4>${escapeHtml(item.facility || 'Checklist cơ sở')}</h4><p>${escapeHtml(item.notes || 'Phiếu rà soát nhanh.')}</p><div class="news-actions"><button data-print-checklist="${escapeHtml(item.id)}">Xuất PDF</button><button data-copy-checklist="${escapeHtml(item.id)}">Copy Zalo</button><button data-delete-checklist="${escapeHtml(item.id)}">Xóa</button></div></div>`).join('') : '<div class="equipment-card"><h4>Chưa có checklist</h4><p>Bấm “＋ Checklist cơ sở” để tạo phiếu rà soát nhanh.</p></div>';
  bindChecklistButtons();
}
function renderMilestones() {
  const el = $('#milestoneList');
  if (!el) return;
  el.innerHTML = state.milestones.length ? state.milestones.map(item => `<div class="equipment-card"><div class="news-meta"><span class="badge green">${escapeHtml(item.type || 'Mốc')}</span><span>${escapeHtml(item.dueDate || 'Chưa ghi ngày')}</span></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.notes || 'Không có ghi chú.')}</p><div class="news-actions"><button data-copy-milestone="${escapeHtml(item.id)}">Copy Zalo</button><button data-delete-milestone="${escapeHtml(item.id)}">Xóa</button></div></div>`).join('') : '<div class="equipment-card"><h4>Chưa có mốc cần nhớ</h4><p>Bấm “＋ Mốc cần nhớ” để lưu hạn kiểm định, dữ liệu, văn bản.</p></div>';
  bindMilestoneButtons();
}
function renderSpecialFeed() {
  const list = $('#newsList');
  if (state.tab === 'incident-log') {
    $('#feedMeta').textContent = `${state.incidents.length} hồ sơ vụ việc · Có thể xuất PDF/copy Zalo`;
    list.innerHTML = state.incidents.length ? state.incidents.map(incidentCard).join('') : '<div class="news-card"><div class="news-thumb">VỤ<br>VIỆC</div><div class="news-body"><h3 class="news-title">Chưa có hồ sơ vụ việc</h3><p class="news-summary">Bấm “＋ Hồ sơ vụ việc” để biến tin đã đọc thành hồ sơ nghiệp vụ.</p></div></div>';
    bindIncidentButtons();
    setStatus('FIELD_PRO', 'Hồ sơ hóa vụ việc để không mất bài học sau tin nóng.');
  }
  if (state.tab === 'checklist') {
    $('#feedMeta').textContent = `${state.checklistRuns.length} checklist đã lưu · Dùng cho rà soát cơ sở`;
    list.innerHTML = state.checklistRuns.length ? state.checklistRuns.map(checklistCard).join('') : '<div class="news-card"><div class="news-thumb">CHECK<br>LIST</div><div class="news-body"><h3 class="news-title">Chưa có checklist</h3><p class="news-summary">Bấm “＋ Checklist cơ sở” để tạo phiếu rà soát nhanh.</p></div></div>';
    bindChecklistButtons();
    setStatus('FIELD_PRO', 'Checklist nhỏ, giảm sót việc lớn.');
  }
  if (state.tab === 'milestones') {
    $('#feedMeta').textContent = `${state.milestones.length} mốc đang theo dõi · Pháp quy/dữ liệu/kiểm định`;
    list.innerHTML = state.milestones.length ? state.milestones.map(milestoneCard).join('') : '<div class="news-card"><div class="news-thumb">MỐC</div><div class="news-body"><h3 class="news-title">Chưa có mốc cần nhớ</h3><p class="news-summary">Bấm “＋ Mốc cần nhớ” để lưu ngày kiểm định, kết nối dữ liệu, đọc văn bản.</p></div></div>';
    bindMilestoneButtons();
    setStatus('FIELD_PRO', 'Mốc rõ thì việc không trôi.');
  }
}
function renderFieldProDashboard() {
  const panel = $('#fieldProPanel');
  if (!panel) return;
  const red = state.feed.filter(x => x.severity === 'red').length;
  const official = state.feed.filter(x => /cục|bộ công an|công an|chính phủ|pccc/i.test(x.sourceName || '')).length;
  const sourceOk = state.sourceHealth.filter(x => x.status === 'ok').length;
  const sourceErr = state.sourceHealth.filter(x => x.status === 'error').length;
  $('#proUrgentCount').textContent = red;
  $('#proOfficialCount').textContent = official;
  $('#proDuplicateCount').textContent = state.duplicateGroups.length;
  $('#proSourceCount').textContent = state.sourceHealth.length ? `${sourceOk}/${state.sourceHealth.length}` : '—';
  $('#sourceHealthList').innerHTML = state.sourceHealth.length ? state.sourceHealth.slice(0, 8).map(s => `<div class="mini-row"><span class="dot ${s.status === 'ok' ? 'ok' : 'bad'}"></span><strong>${escapeHtml(s.name || s.source || 'Nguồn')}</strong><small>${escapeHtml(s.status === 'ok' ? 'OK' : 'Lỗi')}</small></div>`).join('') : '<p class="hint">Chưa có dữ liệu nguồn live. Bấm “Cập nhật nóng” sau khi deploy Vercel.</p>';
  $('#duplicateList').innerHTML = state.duplicateGroups.length ? state.duplicateGroups.map(g => `<div class="mini-row"><strong>${escapeHtml(g.title)}</strong><small>${g.count} nguồn cùng vụ</small></div>`).join('') : '<p class="hint">Chưa phát hiện nhóm tin trùng.</p>';
}
function incidentCard(item) {
  return `<article class="news-card"><div class="news-thumb">VỤ<br>VIỆC</div><div class="news-body"><div class="news-meta"><span class="badge ${severityClass(item.severity)}">${severityLabel(item.severity)}</span><span>${escapeHtml(item.location || 'Chưa rõ địa điểm')}</span><span>${formatDate(item.createdAt)}</span></div><h3 class="news-title">${escapeHtml(item.title)}</h3><p class="news-summary">${escapeHtml(item.summary || item.lesson || 'Chưa có tóm tắt.')}</p><div class="news-actions"><button data-print-incident="${escapeHtml(item.id)}">Xuất PDF</button><button data-copy-incident="${escapeHtml(item.id)}">Copy Zalo</button><button data-delete-incident="${escapeHtml(item.id)}">Xóa</button></div></div></article>`;
}
function checklistCard(item) {
  const done = (item.items || []).filter(x => x.status === 'ok').length;
  return `<article class="news-card"><div class="news-thumb">CHECK<br>LIST</div><div class="news-body"><div class="news-meta"><span class="badge blue">${escapeHtml(item.template)}</span><span>${done}/${(item.items || []).length} đạt</span><span>${formatDate(item.createdAt)}</span></div><h3 class="news-title">${escapeHtml(item.facility || 'Checklist cơ sở')}</h3><p class="news-summary">${escapeHtml(item.notes || 'Phiếu rà soát nhanh phục vụ ghi nhớ nội bộ.')}</p><div class="news-actions"><button data-print-checklist="${escapeHtml(item.id)}">Xuất PDF</button><button data-copy-checklist="${escapeHtml(item.id)}">Copy Zalo</button><button data-delete-checklist="${escapeHtml(item.id)}">Xóa</button></div></div></article>`;
}
function milestoneCard(item) {
  const due = item.dueDate ? new Date(item.dueDate) : null;
  const days = due ? Math.ceil((due - new Date()) / 86400000) : null;
  const badge = days !== null && days < 0 ? 'red' : days !== null && days <= 30 ? 'orange' : 'green';
  return `<article class="news-card"><div class="news-thumb">MỐC</div><div class="news-body"><div class="news-meta"><span class="badge ${badge}">${days === null ? 'Chưa rõ' : days < 0 ? 'Quá hạn' : days + ' ngày'}</span><span>${escapeHtml(item.type || 'Mốc công việc')}</span><span>${escapeHtml(item.dueDate || 'Chưa ghi ngày')}</span></div><h3 class="news-title">${escapeHtml(item.title)}</h3><p class="news-summary">${escapeHtml(item.notes || 'Không có ghi chú.')}</p><div class="news-actions"><button data-copy-milestone="${escapeHtml(item.id)}">Copy Zalo</button><button data-delete-milestone="${escapeHtml(item.id)}">Xóa</button></div></div></article>`;
}
function bindIncidentButtons() {
  $$('[data-print-incident]').forEach(btn => btn.addEventListener('click', () => printIncident(btn.dataset.printIncident)));
  $$('[data-copy-incident]').forEach(btn => btn.addEventListener('click', () => copyIncident(btn.dataset.copyIncident)));
  $$('[data-delete-incident]').forEach(btn => btn.addEventListener('click', () => deleteRecord('incidents', btn.dataset.deleteIncident, 'Đã xóa hồ sơ vụ việc')));
}
function bindChecklistButtons() {
  $$('[data-print-checklist]').forEach(btn => btn.addEventListener('click', () => printChecklist(btn.dataset.printChecklist)));
  $$('[data-copy-checklist]').forEach(btn => btn.addEventListener('click', () => copyChecklist(btn.dataset.copyChecklist)));
  $$('[data-delete-checklist]').forEach(btn => btn.addEventListener('click', () => deleteRecord('checklistRuns', btn.dataset.deleteChecklist, 'Đã xóa checklist')));
}
function bindMilestoneButtons() {
  $$('[data-copy-milestone]').forEach(btn => btn.addEventListener('click', () => copyMilestone(btn.dataset.copyMilestone)));
  $$('[data-delete-milestone]').forEach(btn => btn.addEventListener('click', () => deleteRecord('milestones', btn.dataset.deleteMilestone, 'Đã xóa mốc')));
}
async function deleteRecord(store, id, message) {
  if (!confirm('Xóa mục này?')) return;
  await dbDelete(store, id);
  await loadSaved();
  render();
  toast(message || 'Đã xóa');
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
    <div class="news-meta"><span class="badge ${severityClass(article.severity)}">${severityLabel(article.severity)}</span><span class="time-pill">${relativeTime(article.publishedAt || article.savedAt)}</span><span>${escapeHtml(categoryLabel(article.category))}</span><span>${escapeHtml(article.sourceName || 'Nguồn chưa rõ')}</span><span>${formatDate(article.publishedAt || article.savedAt)}</span></div>
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


const CHECKLIST_TEMPLATES = {
  'Nhà ở kết hợp kinh doanh': ['Lối thoát nạn không bị khóa/chặn', 'Có phương án thoát nạn tầng cao', 'Hệ thống điện không quá tải', 'Bình chữa cháy dễ thấy/dễ lấy', 'Có báo cháy/cảnh báo ban đầu', 'Hàng hóa không chắn lối đi', 'Người trong nhà biết gọi 114'],
  'Chung cư mini / nhà trọ': ['Lối thoát nạn thứ hai hoặc giải pháp thay thế', 'Đèn sự cố/chỉ dẫn thoát nạn', 'Khu sạc xe/pin được kiểm soát', 'Bình chữa cháy theo tầng', 'Cửa ngăn cháy/lối thoát không bị chèn', 'Danh sách cư dân/điểm tập kết', 'Tuyên truyền kỹ năng thoát nạn'],
  'Kho xưởng': ['Nguồn điện/tủ điện được kiểm tra', 'Khoảng cách an toàn hàng hóa', 'Nguồn nước chữa cháy', 'Lối xe chữa cháy tiếp cận', 'Phương án cắt điện', 'Huấn luyện lực lượng tại chỗ', 'Quản lý hóa chất/vật liệu dễ cháy'],
  'Cơ sở có thiết bị truyền tin': ['Thông tin cơ sở đã khai báo', 'Thiết bị truyền tin hoạt động', 'Người phụ trách nhận cảnh báo', 'Có lịch kiểm tra kết nối', 'Dữ liệu thay đổi được cập nhật', 'Hồ sơ lưu tại cơ sở']
};
async function handleIncidentSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const incident = { id: uid('incident'), ...data, createdAt: nowIso(), updatedAt: nowIso(), severity: data.severity || 'orange' };
  await dbPut('incidents', incident);
  await loadSaved();
  state.tab = 'incident-log';
  render();
  $('#incidentDialog').close();
  event.currentTarget.reset();
  toast('Đã lưu hồ sơ vụ việc');
}
async function handleChecklistSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const template = data.template || 'Nhà ở kết hợp kinh doanh';
  const raw = (data.itemsText || '').trim();
  const names = raw ? raw.split('\n').map(x => x.trim()).filter(Boolean) : (CHECKLIST_TEMPLATES[template] || CHECKLIST_TEMPLATES['Nhà ở kết hợp kinh doanh']);
  const run = { id: uid('check'), template, facility: data.facility, notes: data.notes, createdAt: nowIso(), items: names.map(name => ({ name, status: 'review' })) };
  await dbPut('checklistRuns', run);
  await loadSaved();
  state.tab = 'checklist';
  render();
  $('#checklistDialog').close();
  event.currentTarget.reset();
  toast('Đã lưu checklist cơ sở');
}
async function handleMilestoneSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const milestone = { id: uid('milestone'), ...data, createdAt: nowIso(), status: data.status || 'open' };
  await dbPut('milestones', milestone);
  await loadSaved();
  state.tab = 'milestones';
  render();
  $('#milestoneDialog').close();
  event.currentTarget.reset();
  toast('Đã lưu mốc cần nhớ');
}
function copyIncident(id) {
  const item = state.incidents.find(x => x.id === id);
  if (!item) return toast('Không tìm thấy hồ sơ');
  copyText(`[PCCC RADAR] Hồ sơ vụ việc\n\nVụ việc: ${item.title}\nĐịa điểm: ${item.location || 'Chưa rõ'}\nThời gian: ${item.eventTime || 'Chưa rõ'}\nMức độ: ${severityLabel(item.severity)}\nLoại hình: ${item.facilityType || 'Chưa phân loại'}\nTóm tắt: ${item.summary || ''}\nBài học: ${item.lesson || ''}\nNguồn: ${item.source || 'Chưa ghi'}`, 'Đã copy hồ sơ vụ việc');
}
function copyChecklist(id) {
  const item = state.checklistRuns.find(x => x.id === id);
  if (!item) return toast('Không tìm thấy checklist');
  const lines = (item.items || []).map((x, i) => `${i + 1}. ${x.name}: ${x.status === 'ok' ? 'Đạt' : 'Cần rà soát'}`).join('\n');
  copyText(`[PCCC RADAR] Checklist cơ sở\n\nCơ sở: ${item.facility || 'Chưa ghi'}\nMẫu: ${item.template}\n${lines}\nGhi chú: ${item.notes || 'Không có'}`, 'Đã copy checklist');
}
function copyMilestone(id) {
  const item = state.milestones.find(x => x.id === id);
  if (!item) return toast('Không tìm thấy mốc');
  copyText(`[PCCC RADAR] Mốc cần nhớ\n\nViệc: ${item.title}\nNgày: ${item.dueDate || 'Chưa ghi'}\nNhóm: ${item.type || 'Công việc'}\nGhi chú: ${item.notes || 'Không có'}`, 'Đã copy mốc cần nhớ');
}
function printIncident(id) {
  const item = state.incidents.find(x => x.id === id);
  if (!item) return toast('Không tìm thấy hồ sơ');
  $('#printArea').innerHTML = `<section class="pdf-sheet"><div class="pdf-header"><h1>PCCC NEWS RADAR</h1><p>Hồ sơ vụ việc / bài học nghiệp vụ</p></div><h2 class="pdf-title">${escapeHtml(item.title)}</h2><div class="pdf-meta"><strong>Địa điểm</strong><span>${escapeHtml(item.location || 'Chưa rõ')}</span><strong>Thời gian</strong><span>${escapeHtml(item.eventTime || 'Chưa rõ')}</span><strong>Mức độ</strong><span>${escapeHtml(severityLabel(item.severity))}</span><strong>Loại hình</strong><span>${escapeHtml(item.facilityType || 'Chưa phân loại')}</span><strong>Nguồn</strong><span>${escapeHtml(item.source || 'Chưa ghi')}</span></div><div class="pdf-section"><h2>Tóm tắt vụ việc</h2><p>${escapeHtml(item.summary || '')}</p></div><div class="pdf-section"><h2>Bài học PCCC/CNCH</h2><p>${escapeHtml(item.lesson || '')}</p></div><div class="pdf-section"><h2>Việc cần theo dõi</h2><p>${escapeHtml(item.followUp || 'Chưa ghi.')}</p></div><div class="pdf-footer">Tài liệu ghi nhớ nội bộ, cần đối chiếu nguồn/văn bản chính thức.</div></section>`;
  doPrint();
}
function printChecklist(id) {
  const item = state.checklistRuns.find(x => x.id === id);
  if (!item) return toast('Không tìm thấy checklist');
  const rows = (item.items || []).map((x, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(x.name)}</td><td>Cần rà soát</td></tr>`).join('');
  $('#printArea').innerHTML = `<section class="pdf-sheet"><div class="pdf-header"><h1>PCCC NEWS RADAR</h1><p>Checklist rà soát cơ sở</p></div><h2 class="pdf-title">${escapeHtml(item.facility || 'Checklist cơ sở')}</h2><div class="pdf-meta"><strong>Mẫu</strong><span>${escapeHtml(item.template)}</span><strong>Ngày tạo</strong><span>${formatDate(item.createdAt)}</span></div><table class="pdf-table"><thead><tr><th>#</th><th>Nội dung kiểm tra</th><th>Trạng thái</th></tr></thead><tbody>${rows}</tbody></table><div class="pdf-section"><h2>Ghi chú</h2><p>${escapeHtml(item.notes || 'Không có')}</p></div><div class="pdf-footer">Checklist hỗ trợ ghi nhớ, không thay thế biên bản/biểu mẫu chính thức.</div></section>`;
  doPrint();
}
function exportDailyReport() {
  const urgent = state.feed.filter(x => x.severity === 'red').slice(0, 5);
  const saved = state.saved.slice(0, 5);
  $('#printArea').innerHTML = `<section class="pdf-sheet"><div class="pdf-header"><h1>PCCC NEWS RADAR</h1><p>Bản tin nhanh phục vụ công tác · ${formatDate(nowIso())}</p></div><div class="pdf-section"><h2>Tin đỏ cần chú ý</h2>${urgent.map(x => `<p><strong>${escapeHtml(x.title)}</strong><br>${escapeHtml(x.summary || '')}</p>`).join('') || '<p>Chưa có tin đỏ.</p>'}</div><div class="pdf-section"><h2>Bài/hồ sơ đã lưu gần đây</h2>${saved.map(x => `<p><strong>${escapeHtml(x.title)}</strong><br>${escapeHtml(x.lessons || '')}</p>`).join('') || '<p>Chưa có bài đã lưu.</p>'}</div><div class="pdf-section"><h2>Ghi chú</h2><p>Nguồn cần ưu tiên đối chiếu: cơ quan quản lý nhà nước, Cục Cảnh sát PCCC và CNCH, Bộ Công an, Công an địa phương và văn bản chính thức.</p></div></section>`;
  doPrint();
}
function copyDailyReport() {
  const urgent = state.feed.filter(x => x.severity === 'red').slice(0, 3).map((x, i) => `${i + 1}. ${x.title} — ${x.sourceName}`).join('\n') || 'Chưa có tin đỏ.';
  copyText(`[PCCC RADAR] Bản tin nhanh hôm nay\n\nTin đỏ cần chú ý:\n${urgent}\n\nĐã lưu offline: ${state.saved.length}\nHồ sơ vụ việc: ${state.incidents.length}\nChecklist: ${state.checklistRuns.length}\nThiết bị/hồ sơ: ${state.equipment.length}`, 'Đã copy báo cáo ngày');
}
async function exportData() {
  const payload = {
    app: 'PCCC News Radar',
    version: APP_VERSION,
    exportedAt: nowIso(),
    settings: state.settings,
    articles: await dbAll('articles'),
    equipment: await dbAll('equipment'),
    incidents: await dbAll('incidents'),
    checklistRuns: await dbAll('checklistRuns'),
    milestones: await dbAll('milestones'),
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
  for (const item of (payload.incidents || [])) await dbPut('incidents', item);
  for (const item of (payload.checklistRuns || [])) await dbPut('checklistRuns', item);
  for (const item of (payload.milestones || [])) await dbPut('milestones', item);
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
  $('#hotSearchBtn')?.addEventListener('click', openHotSearch);
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
  $('#addIncidentBtn')?.addEventListener('click', () => $('#incidentDialog').showModal());
  $('#addChecklistBtn')?.addEventListener('click', () => $('#checklistDialog').showModal());
  $('#addMilestoneBtn')?.addEventListener('click', () => $('#milestoneDialog').showModal());
  $('#dailyReportBtn')?.addEventListener('click', copyDailyReport);
  $('#pdfDailyReportBtn')?.addEventListener('click', exportDailyReport);
  $('#incidentForm')?.addEventListener('submit', handleIncidentSubmit);
  $('#checklistForm')?.addEventListener('submit', handleChecklistSubmit);
  $('#milestoneForm')?.addEventListener('submit', handleMilestoneSubmit);
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
