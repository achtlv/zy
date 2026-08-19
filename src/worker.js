/**
 * 斗地主 Material You 3 套壳 —— Cloudflare Worker（免费版可用）
 *
 * 一个 Worker 同时承担：
 *   1. 静态资源服务（assets 绑定映射到 ./ddz，即域名根 /）
 *   2. SPA 回退：首页 /、房间 /{roomId} 等所有非文件路径 → index.html（斗地主在根目录运行）
 *   3. WebSocket 中继：浏览器 wss://本站/ddz/房间?v=1
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

    // 2) gid 预热：页面加载时后台请求此端点，把 gid 种到浏览器
    //    （建房时中继直接复用 cookie，省掉冷连接时的预取往返，消除白屏）
    if (url.pathname === '/__gid') {
      return handleGidPrefetch(request);
    }

    // 3) 静态文件：直出；找不到则 404
    if (FILE_RE.test(url.pathname)) {
      const resp = await env.ASSETS.fetch(request);
      if (resp.status === 404 || resp.status === 307) return new Response('Not Found', { status: 404 });
      return resp;
    }

    // 4) SPA 回退：其余路径（首页 /、房间 /{roomId} 等）一律返回 index.html
    return env.ASSETS.fetch(new Request(new URL('/', url.origin), request));
  },
};

async function handleGidPrefetch(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  if (parseGid(cookieHeader)) return new Response(null, { status: 204 });
  try {
    const gidResp = await fetch(`https://${UPSTREAM_HOST}/ddz`, { headers: { 'User-Agent': UA } });
    await gidResp.arrayBuffer();
    const gid = extractGid(gidResp.headers);
    if (!gid) return new Response(null, { status: 204 });
    return new Response(null, {
      status: 204,
      headers: { 'Set-Cookie': `${GID_COOKIE}=${encodeURIComponent(gid)}; Path=/; Max-Age=31536000; SameSite=Lax` },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}

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
