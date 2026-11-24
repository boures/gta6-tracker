// Cloudflare Worker: авторизация и сохранение data/tracker.json в GitHub.
// Секреты (Settings → Variables and Secrets): ADMIN_PASSWORD, SESSION_SECRET, GITHUB_TOKEN
// Переменные: GITHUB_REPO (пользователь/репозиторий), ALLOWED_ORIGIN (https://пользователь.github.io), GITHUB_BRANCH (main)
const enc = new TextEncoder();
const FILE = 'data/tracker.json';
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function mac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function cors(env) { return { 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS', 'Vary': 'Origin' }; }
const out = (env, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(env) } });
async function authed(req, env) {
  const t = (req.headers.get('Authorization') || '').replace(/^Bearer /, ''), [exp, sig] = t.split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  return same(sig, await mac(env.SESSION_SECRET, 's:' + exp));
}
const gh = (env, path, init = {}) => fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`, { ...init, headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, 'User-Agent': 'gta6-tracker-worker', Accept: 'application/vnd.github+json', ...(init.headers || {}) } });
const toB64 = s => { const u = enc.encode(s); let b = ''; for (let i = 0; i < u.length; i += 8192) b += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(b); };
const fromB64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
const clean = (v, k) => Array.isArray(v) ? v.map(x => clean(x)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([a, b]) => [a, clean(b, a)])) : (typeof v === 'string' && (k === 'url' || k === 'media') && v && !/^https?:\/\//i.test(v)) ? '' : v;
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    if (req.headers.get('Origin') && req.headers.get('Origin') !== env.ALLOWED_ORIGIN) return out(env, { error: 'Запрещено' }, 403);
    try {
      if (u.pathname === '/api/login' && req.method === 'POST') {
        const { password = '' } = await req.json();
        const ok = same(await mac(env.SESSION_SECRET, 'p:' + password), await mac(env.SESSION_SECRET, 'p:' + env.ADMIN_PASSWORD));
        if (!ok) { await sleep(1500); return out(env, { error: 'Неверный пароль' }, 401); }
        const exp = Date.now() + 12 * 3600e3;
        return out(env, { token: exp + '.' + await mac(env.SESSION_SECRET, 's:' + exp) });
      }
      if (u.pathname === '/api/data') {
        if (!await authed(req, env)) return out(env, { error: 'Нужна авторизация' }, 401);
        const br = env.GITHUB_BRANCH || 'main';
        if (req.method === 'GET') {
          const r = await gh(env, FILE + '?ref=' + br); if (!r.ok) return out(env, { error: 'GitHub: ' + r.status }, 502);
          const j = await r.json(); return out(env, { data: JSON.parse(fromB64(j.content)), sha: j.sha });
        }
        if (req.method === 'PUT') {
          const raw = await req.text(); if (raw.length > 600000) return out(env, { error: 'Слишком большой объём' }, 413);
          const { data, sha } = JSON.parse(raw);
          if (!data || typeof data !== 'object' || !Array.isArray(data.projects) || !Array.isArray(data.news) || !Array.isArray(data.watchlist) || !Array.isArray(data.toolkit) || !data.stats || !data.sections) return out(env, { error: 'Неверный формат данных' }, 400);
          const body = JSON.stringify({ message: 'Обновление данных из админ-панели', branch: br, sha, content: toB64(JSON.stringify(clean(data), null, 2)) });
          const r = await gh(env, FILE, { method: 'PUT', body });
          if (r.status === 409 || r.status === 422) return out(env, { error: 'Данные изменились в другом месте. Обновите страницу.' }, 409);
          if (!r.ok) return out(env, { error: 'GitHub: ' + r.status }, 502);
          return out(env, { sha: (await r.json()).content.sha });
        }
      }
      return out(env, { error: 'Не найдено' }, 404);
    } catch (e) { return out(env, { error: 'Ошибка сервера' }, 500); }
  }
};
