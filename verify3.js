const s = require('fs').readFileSync('ddz/static/js/app.03832cca.chunk.js', 'utf8');
const esc = (str) => str.replace(/[\u4e00-\u9fa5]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
for (const str of ['公告', '查看规则', '视频规则', '公众号', '微信登录', 'QQ 登录', '京ICP', '京公网安备', '桌游列表']) {
  const i = s.indexOf(esc(str));
  console.log(str, '->', i);
  if (i > 0) console.log('   ctx:', s.slice(Math.max(0, i - 80), i + 80).slice(0, 160));
}
