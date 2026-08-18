/**
 * 斗地主 Material You 3 套壳 —— Cloudflare Worker（免费版可用）
 *
 * 一个 Worker 同时承担：
 *   1. 静态资源服务（assets 绑定映射到 ./ddz，index.html 即域名根 /）
 *   2. SPA 回退：/ddz/** 未知路径 → 根 index.html
 *   3. 路径规整：/ 与 /ddz → /ddz/
 *   4. WebSocket 中继：浏览器 wss://本站/ddz/房间?v=1
 *      → Worker 向原站申请独立 gid Cookie（服务端申请，不受浏览器第三方 Cookie 限制）
 *      → 再以 wss://game.hullqin.cn/ddz/房间?v=1 出站连接并双向转发
 *
 * gid 稳定性（关键）：
 *   原站以浏览器 gid Cookie 识别玩家身份，重连时靠它恢复座位。
 *   因此中继在首次连接时申请 gid，并通过 101 响应 Set-Cookie 写回浏览器；
 *   之后的连接直接复用浏览器回传的 gid，保证同一玩家身份稳定。
 *
 * 协议细节：
 *   - 浏览器侧：WebSocketPair + server.accept()（默认自动应答关闭帧）
 *   - 上游侧：fetch("https://…", { headers: { Upgrade: "websocket", Cookie } })，resp.webSocket.accept()
 *     （Workers 的 fetch 出站 WebSocket 需用 https:// 而非 wss://）
 *   - 关闭码（4402/4408 等业务码）双向透传，错误提示与原站一致
 */

const UPSTREAM_HOST = 'game.hullqin.cn';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const GID_COOKIE = 'ddz_gid';
const FILE_RE = /\.(js|css|png|jpe?g|svg|ico|webp|woff2?|txt|md|json)$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1) WebSocket 升级请求 → 中继
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return handleWebSocket(request, url);
    }

    // 2) 路径规整
    if (url.pathname === '/' || url.pathname === '/ddz') {
      return Response.redirect(new URL('/ddz/', url), 302);
    }

    // 3) /ddz/* 应用路径：静态文件直出；其余 SPA 回退到 index.html（即资产根 /）
    if (url.pathname === '/ddz/' || url.pathname.startsWith('/ddz/')) {
      const rest = url.pathname.slice('/ddz'.length); // '/ddz/static/x' -> '/static/x'
      const isFile = FILE_RE.test(rest);
      const assetPath = rest === '/' || !isFile ? '/' : rest;
      let resp = await env.ASSETS.fetch(new Request(new URL(assetPath, url.origin), request));
      if (resp.status === 404 || resp.status === 307) {
        resp = await env.ASSETS.fetch(new Request(new URL('/', url.origin), request));
      }
      return resp;
    }

    // 4) 非应用路径：只允许已存在资源，其余 404
    const resp = await env.ASSETS.fetch(new Request(new URL(url.pathname, url.origin), request));
    return resp.status === 404 ? new Response('Not Found', { status: 404 }) : resp;
  },
};

async function handleWebSocket(request, url) {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();

  const targetPath = url.pathname + url.search; // 例如 /ddz/ab12?v=1
  const cookieHeader = request.headers.get('Cookie') || '';
  const savedGid = parseGid(cookieHeader);

  try {
    // 已有 gid 则直接复用（保证重连后身份稳定、座位可恢复），否则向原站申请
    let gid = savedGid;
    if (!gid) {
      const gidResp = await fetch(`https://${UPSTREAM_HOST}${targetPath}`, { headers: { 'User-Agent': UA } });
      await gidResp.arrayBuffer();
      gid = extractGid(gidResp.headers);
      if (!gid) throw new Error('cannot obtain gid from upstream');
    }

    // 出站 WebSocket：Workers 需用 https:// 作为 fetch 目标（内部完成 TLS + Upgrade）
    const upResp = await fetch(`https://${UPSTREAM_HOST}${targetPath}`, {
      headers: { Upgrade: 'websocket', Cookie: `gid=${gid}`, 'User-Agent': UA },
    });
    const upstream = upResp.webSocket;
    if (!upstream) throw new Error('upstream handshake refused');

    upstream.accept();

    // 双向转发（Worker 端二进制消息可能是 Blob，统一转为 ArrayBuffer 再转发）
    server.addEventListener('message', (e) => {
      toBytes(e.data).then((b) => { try { upstream.send(b); } catch { /* 已关闭则忽略 */ } });
    });
    upstream.addEventListener('message', (e) => {
      toBytes(e.data).then((b) => { try { server.send(b); } catch { /* 已关闭则忽略 */ } });
    });
    // 关闭码双向透传
    server.addEventListener('close', (e) => {
      try { upstream.close(e.code || 1000, e.reason || ''); } catch { /* ignore */ }
    }, { once: true });
    upstream.addEventListener('close', (e) => {
      try { server.close(e.code || 1000, e.reason || ''); } catch { /* ignore */ }
    }, { once: true });
    upstream.addEventListener('error', () => {
      try { server.close(1011, 'upstream error'); } catch { /* ignore */ }
    }, { once: true });

    // 首次连接：把 gid 写回浏览器（Set-Cookie），之后的连接复用 → 身份稳定
    const response = new Response(null, { status: 101, webSocket: client });
    if (!savedGid) {
      response.headers.append('Set-Cookie', `${GID_COOKIE}=${encodeURIComponent(gid)}; Path=/; Max-Age=31536000; SameSite=Lax`);
    }
    return response;
  } catch (err) {
    try { server.close(1011, 'relay error: ' + (err && err.message)); } catch { /* ignore */ }
    return new Response(null, { status: 101, webSocket: client });
  }
}

function parseGid(cookieHeader) {
  if (!cookieHeader) return '';
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === GID_COOKIE) return decodeURIComponent(v.join('='));
  }
  return '';
}

function extractGid(headers) {
  const setCookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : (headers.get('set-cookie') ? [headers.get('set-cookie')] : []);
  for (const c of setCookies) {
    const m = c.match(/(?:^|;\s*)gid=([^;]+)/);
    if (m) return m[1];
  }
  return '';
}

async function toBytes(data) {
  if (data instanceof Blob) return await data.arrayBuffer();
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return data; // string
}
