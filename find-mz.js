const s = require('fs').readFileSync('ddz/static/js/app.03832cca.chunk.js', 'utf8');
// M.Z 大厅组件（桌游列表删除后的残留）——找 notice 相关结构
let i = s.indexOf('t&&(n?(0,f.jsx)(o.Z,{noStyle:!0,to:n,className:"whitespace-pre-line');
console.log('notice block @', i);
if (i > 0) console.log(s.slice(i - 200, i + 900));
