/* PCCC News Radar V1.1.1 - Vercel Live News API: latest incident first */
const GOOGLE_NEWS = 'https://news.google.com/rss/search';

const QUERIES = [
  {
    id: 'hot-fire-vn',
    name: 'Tin nóng cháy nổ Việt Nam',
    category: 'incident',
    q: 'cháy OR hỏa hoạn OR cháy lớn OR nổ PCCC Việt Nam when:1d'
  },
  {
    id: 'rescue-vn',
    name: 'Tin CNCH Việt Nam',
    category: 'rescue',
    q: 'cứu nạn cứu hộ OR CNCH OR tai nạn sự cố Việt Nam when:2d'
  },
  {
    id: 'official-pccc',
    name: 'Cục Cảnh sát PCCC và CNCH',
    category: 'law',
    q: 'site:canhsatpccc.gov.vn PCCC CNCH cháy nổ tai nạn sự cố when:7d'
  },
  {
    id: 'official-police-local',
    name: 'Công an địa phương PCCC/CNCH',
    category: 'incident',
    q: 'site:congan.*.gov.vn PCCC CNCH cháy nổ tai nạn sự cố when:7d'
  },
  {
    id: 'cand-fire',
    name: 'CAND PCCC/CNCH',
    category: 'incident',
    q: 'site:cand.com.vn cháy PCCC cứu nạn cứu hộ tai nạn sự cố when:3d'
  },
  {
    id: 'tech-pccc',
    name: 'Công nghệ PCCC/CNCH',
    category: 'tech',
    q: 'robot chữa cháy OR drone chữa cháy OR thiết bị truyền tin báo cháy PCCC Việt Nam when:30d'
  }
];

const DIRECT_RSS = [
  {
    id: 'canhsatpccc-rss',
    name: 'Cục Cảnh sát PCCC và CNCH RSS',
    category: 'law',
    url: 'https://canhsatpccc.gov.vn/vi/news/rss/'
  }
];

function headers(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
}

function decodeHtml(input = '') {
  return String(input)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return decodeHtml(m ? m[1] : '');
}

function tagAttr(xml, tag, attr) {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^>]*>`, 'i'));
  return decodeHtml(m ? m[1] : '');
}

function guessSeverity(text = '') {
  const t = text.toLowerCase();
  if (/tử vong|thương vong|nổ|hóa chất|chung cư|cao tầng|mắc kẹt|sập|pin lithium|thiệt mạng|tai nạn nghiêm trọng/.test(t)) return 'red';
  if (/cháy lớn|kho|xưởng|lan rộng|nhiều phương tiện|gas|cứu nạn|cứu hộ|tai nạn|sự cố/.test(t)) return 'orange';
  if (/khuyến cáo|kiểm tra|tập huấn|diễn tập|tuyên truyền|mô hình|quy định|thông tư/.test(t)) return 'yellow';
  return 'green';
}

function inferTags(text = '') {
  const keys = ['cháy', 'nổ', 'PCCC', 'CNCH', 'cứu nạn', 'cứu hộ', 'chung cư', 'kho xưởng', 'bình chữa cháy', 'thiết bị truyền tin', 'trực thăng', 'robot', 'drone'];
  const lower = text.toLowerCase();
  return keys.concat(['tai nạn', 'sự cố', 'thiệt mạng', 'mắc kẹt']).filter((k, i, arr) => arr.indexOf(k) === i && lower.includes(k.toLowerCase())).slice(0, 5);
}

function parseRss(xml, source) {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return itemBlocks.slice(0, 15).map((block, idx) => {
    const title = firstTag(block, 'title') || 'Tin mới PCCC/CNCH';
    const description = firstTag(block, 'description');
    const link = firstTag(block, 'link') || source.url || '';
    const pubDate = firstTag(block, 'pubDate') || firstTag(block, 'published') || firstTag(block, 'updated') || new Date().toISOString();
    const sourceName = firstTag(block, 'source') || tagAttr(block, 'source', 'url') || source.name || 'Nguồn tin';
    const text = `${title} ${description}`;
    return {
      id: `live_${source.id}_${idx}_${Buffer.from(link || title).toString('base64url').slice(0, 18)}`,
      title,
      sourceName: sourceName === source.url ? source.name : sourceName,
      sourceUrl: source.url || '',
      originalUrl: link,
      publishedAt: pubDate,
      category: source.category || 'incident',
      severity: guessSeverity(text),
      tags: inferTags(text),
      summary: description || title,
      content: description || title,
      lessons: 'Đối chiếu nguồn chính thống, xác định loại hình vụ việc, nguyên nhân/nguy cơ chính và bài học có thể áp dụng tại cơ sở.',
      type: 'live'
    };
  });
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PCCC-News-Radar/1.1.1 (+https://vercel.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGoogleNews(query) {
  const url = `${GOOGLE_NEWS}?q=${encodeURIComponent(query.q)}&hl=vi&gl=VN&ceid=VN:vi`;
  const xml = await fetchText(url);
  return parseRss(xml, { ...query, url });
}

async function fetchDirectRss(source) {
  const xml = await fetchText(source.url);
  return parseRss(xml, source);
}

function itemText(item) {
  return `${item.title || ''} ${item.summary || ''} ${(item.tags || []).join(' ')} ${item.category || ''}`.toLowerCase();
}
function isIncidentOrAccident(item) {
  if (['incident', 'rescue'].includes(item.category)) return true;
  return /cháy|hỏa hoạn|nổ|tai nạn|sự cố|cứu nạn|cứu hộ|cnch|mắc kẹt|sập|đuối nước|thương vong|thiệt mạng/.test(itemText(item));
}
function timeMs(item) {
  const t = new Date(item.publishedAt || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}
function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = (item.originalUrl || item.title).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => {
    const ai = isIncidentOrAccident(a) ? 1 : 0;
    const bi = isIncidentOrAccident(b) ? 1 : 0;
    if (ai !== bi) return bi - ai;
    return timeMs(b) - timeMs(a);
  });
}

module.exports = async function handler(req, res) {
  headers(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const startedAt = new Date().toISOString();
  const errors = [];
  const jobs = [
    ...DIRECT_RSS.map(src => fetchDirectRss(src).catch(err => { errors.push(`${src.name}: ${err.message}`); return []; })),
    ...QUERIES.map(q => fetchGoogleNews(q).catch(err => { errors.push(`${q.name}: ${err.message}`); return []; }))
  ];
  const batches = await Promise.all(jobs);
  const items = dedupe(batches.flat()).slice(0, 80);
  return res.status(200).json({
    app: 'PCCC News Radar',
    version: '1.1.1',
    mode: 'vercel-live-news-api',
    fetchedAt: startedAt,
    count: items.length,
    items,
    errors
  });
};
