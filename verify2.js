const s = require('fs').readFileSync('ddz/static/js/app.03832cca.chunk.js', 'utf8');
const esc = (str) => str.replace(/[\u4e00-\u9fa5]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const checks = [
  ['创建房间(应保留)', '创建房间', true],
  ['进入房间(应保留)', '进入房间', true],
  ['返回主页(应保留)', '返回主页', true],
  ['邀请好友(应保留)', '邀请好友', true],
  ['最近进入房间(应保留)', '进入过的房间', true],
  ['公告(应删除)', '公告', false],
  ['查看规则(应删除)', '查看规则', false],
  ['视频规则(应删除)', '视频规则', false],
  ['公众号(应删除)', '公众号', false],
  ['京ICP(应删除)', '京ICP', false],
  ['京公网安备(应删除)', '京公网安备', false],
  ['微信登录(应删除)', '微信登录', false],
  ['QQ登录(应删除)', 'QQ 登录', false],
  ['桌游列表(应删除)', '桌游列表', false],
  ['工具列表(应删除)', '工具列表', false],
];
for (const [label, str, shouldExist] of checks) {
  const escStr = esc(str);
  const found = s.indexOf(escStr) >= 0;
  const ok = found === shouldExist;
  console.log((ok ? 'PASS' : '!! FAIL'), label, found ? '(存在)' : '(不存在)');
}
