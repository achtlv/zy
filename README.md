# 斗地主 · Material You 3 套壳（Cloudflare Workers）

基于原站 [game.hullqin.cn/ddz](https://game.hullqin.cn/ddz) 接口的 Material You 3 风格套壳网站。

- **界面**：Material Design 3（M3）风格 —— 绿色种子色调化配色、圆角形状体系、层级阴影、M3 按钮/对话框/Snackbar；对局中自动切换深绿牌桌。
- **接口**：100% 使用原站接口。房间创建/加入、WebSocket 联机协议全部透传原站，游戏逻辑为原站代码。
- **零成本**：仅使用 Cloudflare **免费版**功能（Workers 免费计划 + 静态资源托管），无服务器、无本地电脑依赖，手机浏览器直接可玩。
- **自动部署**：推送 GitHub → Cloudflare 自动部署（Git 直连，**无需 API Token**）。

## 部署（方式 A：Git 直连，无需 API Token，推荐）

### 1. 创建 GitHub 仓库并推送

```bash
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

### 2. Cloudflare 面板连接仓库（免费）

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Workers**。
2. 选择 **Connect to Git**（首次会要求授权 Cloudflare 的 GitHub App，只需点允许，**不需要任何 Token**）。
3. 选择你的仓库。
4. 项目设置里：
   - **项目名填 `ddz-material-you`**（必须与 `wrangler.jsonc` 里的 `name` 一致，否则构建失败）；
   - 构建命令（Build command）：`npm ci`；
   - 部署命令（Deploy command）：`npx wrangler deploy`；
   - 生产分支：`main`。
5. 点击 **Save and Deploy**。

### 3. 完成

部署成功后访问：

```
https://ddz-material-you.<你的子域>.workers.dev/ddz/
```

以后每次 `git push` 到 `main`，Cloudflare 自动重新构建并部署。

> 也可以自定义域名：Workers → 你的 Worker → Settings → Domains & Routes → 绑定自己的域名。

## 部署（方式 B：GitHub Actions，需 API Token，备选）

如果你希望由 GitHub Actions 控制部署（比如需要自定义 CI 流程、或不想用 Cloudflare 的 Git 集成），
才需要 API Token。仓库已附带 `.github/workflows/deploy.yml`：

1. Cloudflare：`我的个人资料 → API 令牌 → 创建令牌` → 模板 **Edit Cloudflare Workers**，复制 Token。
2. 仪表盘首页右侧复制 **Account ID**。
3. GitHub 仓库 → `Settings → Secrets and variables → Actions`，添加：
   - `CLOUDFLARE_API_TOKEN` = Token
   - `CLOUDFLARE_ACCOUNT_ID` = 账户 ID
4. 推送代码即自动部署。

两种方式二选一即可，推荐方式 A。

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
├── .github/workflows/deploy.yml# 方式 B 的自动部署（可选，需 API Token）
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
# zy
