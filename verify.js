const s = require('fs').readFileSync('ddz/static/js/app.03832cca.chunk.js', 'utf8');
const checks = {
  '创建房间(应保留)': s.indexOf('\u521b\u5efa\u623f\u95f4') >= 0,
  '进入房间(应保留)': s.indexOf('\u8fdb\u5165\u623f\u95f4') >= 0,
  '公告(应删除)': s.indexOf('\u516c\u544a') === -1,
  '查看规则(应删除)': s.indexOf('\u67e5\u770b\u89c4\u5219') === -1,
  '视频规则(应删除)': s.indexOf('\u89c6\u9891\u89c4\u5219') === -1,
  '公众号(应删除)': s.indexOf('\u516c\u4f17\u53f7') === -1,
  '京ICP(应删除)': s.indexOf('\u4eacICP') === -1,
  '京公网安备(应删除)': s.indexOf('\u4eac\u516c\u7f51\u5b89\u5907') === -1,
  '微信登录(应删除)': s.indexOf('\u5fae\u4fe1\u767b\u5f55') === -1,
  'QQ登录(应删除)': s.indexOf('QQ \u767b\u5f55') === -1,
  '桌游列表(应删除)': s.indexOf('\u684c\u6e38\u5217\u8868') === -1,
  '返回主页(应保留)': s.indexOf('\u8fd4\u56de\u4e3b\u9875') >= 0,
  '邀请好友(应保留)': s.indexOf('\u9080\u8bf7\u597d\u53cb') >= 0,
  '最近进入房间(应保留)': s.indexOf('\u8fdb\u5165\u8fc7\u7684\u623f\u95f4') >= 0,
};
for (const [k, v] of Object.entries(checks)) console.log((v ? 'PASS' : '!! FAIL'), k);
