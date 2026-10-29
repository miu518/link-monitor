// link-monitor Worker：提供 Web 界面 + API，定时检查链接存活状态
// 存储：KV（links=链接列表，status:<id>=最近一次检查结果）
import { HTML } from './ui.js';

const CHECK_TIMEOUT_MS = 20000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function getLinks(env) {
  return JSON.parse((await env.STORE.get('links')) || '[]');
}

// 检查单个链接：跟随跳转，记录状态码 / 耗时 / 标题 / 最终地址
async function checkUrl(rawUrl) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS);
  try {
    const resp = await fetch(rawUrl, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'link-monitor/1.0' },
    });
    const ms = Date.now() - t0;
    clearTimeout(timer);
    let title = '';
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      try {
        const text = await resp.text();
        const m = text.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
        if (m) title = m[1].trim();
      } catch (e) { /* 标题解析失败不影响存活判定 */ }
    }
    return { ok: resp.status < 400, status: resp.status, ms, finalUrl: resp.url || '', title, error: '' };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, status: null, ms: Date.now() - t0, finalUrl: '', title: '', error: String((e && e.message) || e).slice(0, 120) };
  }
}

async function runChecks(env) {
  const links = await getLinks(env);
  await Promise.all(links.map(async (l) => {
    const r = await checkUrl(l.url);
    await env.STORE.put('status:' + l.id, JSON.stringify({ ...r, checkedAt: new Date().toISOString() }));
  }));
}

async function listWithStatus(env) {
  const links = await getLinks(env);
  return Promise.all(links.map(async (l) => {
    const s = JSON.parse((await env.STORE.get('status:' + l.id)) || 'null');
    return { ...l, status: s };
  }));
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const path = u.pathname;

    if (path === '/' && req.method === 'GET') {
      return new Response(HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    if (path === '/api/links') {
      if (req.method === 'GET') return json(await listWithStatus(env));

      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        let linkUrl = String(body.url || '').trim();
        const name = String(body.name || '').trim().slice(0, 60);
        try {
          const parsed = new URL(linkUrl);
          if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad protocol');
          linkUrl = parsed.toString();
        } catch (e) {
          return json({ error: 'URL 无效，请以 http:// 或 https:// 开头' }, 400);
        }
        const links = await getLinks(env);
        if (links.some((l) => l.url === linkUrl)) return json({ error: '这个链接已经添加过了' }, 400);
        const item = { id: crypto.randomUUID(), url: linkUrl, name: name || linkUrl, createdAt: new Date().toISOString() };
        links.push(item);
        await env.STORE.put('links', JSON.stringify(links));
        // 添加后立刻检查一次，不用等下一轮 cron
        const r = await checkUrl(linkUrl);
        await env.STORE.put('status:' + item.id, JSON.stringify({ ...r, checkedAt: new Date().toISOString() }));
        return json({ ...item, status: r });
      }

      if (req.method === 'DELETE') {
        const id = u.searchParams.get('id');
        const links = (await getLinks(env)).filter((l) => l.id !== id);
        await env.STORE.put('links', JSON.stringify(links));
        await env.STORE.delete('status:' + id);
        return json({ ok: true });
      }
    }

    if (path === '/api/check' && req.method === 'POST') {
      await runChecks(env);
      return json(await listWithStatus(env));
    }

    return new Response('not found', { status: 404 });
  },

  // Cron 触发：wrangler.toml 里配置的 crons
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runChecks(env));
  },
};
