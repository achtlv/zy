# 斗地主 · Material You 3 套壳（Cloudflare Workers）

基于原站 [game.hullqin.cn/ddz](https://game.hullqin.cn/ddz) 接口的 Material You 3 风格套壳网站。

- **界面**：Material Design 3（M3）风格 —— 绿色种子色调化配色、圆角形状体系、层级阴影、M3 按钮/对话框/Snackbar；对局中自动切换深绿牌桌。
- **接口**：100% 使用原站接口。房间创建/加入、WebSocket 联机协议全部透传原站，游戏逻辑为原站代码。
- **零成本**：仅使用 Cloudflare **免费版**功能（Workers 免费计划 + 静态资源托管），无服务器、无本地电脑依赖，手机浏览器直接可玩。
- **自动部署**：推送 GitHub → GitHub Actions 自动部署到 Cloudflare Workers。

## 部署（一次性配置，约 5 分钟）

### 1. 创建 GitHub 仓库并推送

```bash
# 在本地把本项目推送到你的 GitHub 仓库
git init
git add -A
git commit -m "init: 斗地主 Material You 3 套壳"
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

### 2. Cloudflare 侧（免费）

在 [dash.cloudflare.com](https://dash.cloudflare.com) 完成：

1. **获取 API Token**：`我的个人资料 → API 令牌 → 创建令牌`，
   选择模板 **Edit Cloudflare Workers**，创建后复制 Token。
2. **获取 Account ID**：仪表盘首页右侧 `账户 ID`。
3. 打开 GitHub 仓库 → `Settings → Secrets and variables → Actions`，
   添加两个密钥：
   - `CLOUDFLARE_API_TOKEN` = 刚才的 Token
   - `CLOUDFLARE_ACCOUNT_ID` = 账户 ID

### 3. 自动部署

推送代码到 `main` 分支即自动触发 `.github/workflows/deploy.yml`，
部署完成后访问：

```
https://<worker名>.<你的子域>.workers.dev/ddz/
```

> 也可以自定义域名：Workers → 你的 Worker → Settings → Domains & Routes → 绑定自己的域名。

## 本地开发预览

```bash
npm install
npx wrangler dev
# 打开 http://localhost:8787/ddz/
```

## 目录结构

```
├── ddz/                        # 网站静态资源（页面 + 样式 + 原站 JS 补丁版）
│   ├── index.html              # M3 入口页（加载动画 + 原站应用）
│   └── static/
│       ├── css/                # Material You 3 主题（完整替换原站样式）
│       ├── js/                 # 原站 JS（两处小补丁，见下）
│       └── media/              # 本地化媒体（卡牌精灵、Logo、图标）
├── src/worker.js               # Cloudflare Worker：静态服务 + SPA 回退 + WebSocket 中继
├── wrangler.jsonc              # Workers 配置（assets 绑定 ./ddz）
├── .github/workflows/deploy.yml# GitHub Actions 自动部署
└── package.json
```

## 原理

### 为什么是"套壳"
原站是 React 单页应用，游戏逻辑（叫地主、牌型判定、胜负结算）全在原站 JS 中。
套壳直接运行原站代码，任何玩法、规则、联机行为与原站一致，仅视觉层被替换为 M3 主题。

### WebSocket 中继（免费方案的核心）
原站用浏览器 Cookie（`gid`）识别玩家，跨域直连会被现代浏览器拦截第三方 Cookie。
Cloudflare Worker 在服务端代连：

```
手机/电脑浏览器 ──wss://你的worker地址/ddz/房间?v=1──▶ Cloudflare Worker
                                                     │ 服务端向原站申请独立 gid
                                                     ▼
                                               wss://game.hullqin.cn/ddz/房间?v=1
```

- **gid 稳定**：首次连接把 gid 通过 `Set-Cookie` 写回浏览器，重连复用 → 断线重连后座位、身份自动恢复。
- **费用**：免费版 Workers 中，静态资源与子请求不计费，WebSocket 仅按初始升级请求计费（100,000 请求/天免费额度内），完全免费。
- **关闭码透传**：房间不存在、人数已满等业务错误码原样转发，提示与原站一致。

### JS 补丁内容
- `main.js`：资源公共路径 `n.p` 指向本地 `./static/`。
- `app.03832cca.chunk.js`：
  - 邀请好友的链接：公网访问时复制当前站点链接（好友也能看到 M3 界面）；
    本机调试时指向原站。
  - 应用启动注入的 `body{background}` 主题样式替换为 M3 设计令牌。
- 其余 JS 原样未动，`ddz`/`index`/`474` chunk 均为原站原件。

## 注意

- 原站更新后如需同步，重新下载对应 JS 并按 README 说明套用同样补丁即可。
- 免费版 Worker 的 WebSocket 连接在长时间空闲时可能被回收（游戏内有自动重连 + gid 复用，会自动恢复）。
