const fs = require('fs');
const f = 'ddz/static/js/app.03832cca.chunk.js';
let s = fs.readFileSync(f, 'utf8');
let fail = false;
function patch(label, oldStr, newStr) {
  if (!s.includes(oldStr)) { console.error('FAIL: [' + label + '] not found'); fail = true; return; }
  s = s.replace(oldStr, newStr);
  console.log('OK:', label);
}

// 1. 全局公告变量置空（只被不可达的其他游戏路由使用）
patch('全局公告变量',
  'Un=m.EN?"":"\\u516c\\u544a\\uff1a\\u8fde\\u7eed6\\u5c0f\\u65f6\\u6ca1\\u4eba\\u64cd\\u4f5c\\u7684\\u623f\\u95f4\\u53ef\\u80fd\\u4f1a\\u88ab\\u6e05\\u7406\\u3002"',
  'Un=""');

// 2. 未知异常错误提示：去掉"截图发给公众号"引导
patch('错误提示公众号',
  '\\u672a\\u77e5\\u5f02\\u5e38".concat(t.code,"\\u3002\\u82e5\\u5237\\u65b0\\u9875\\u9762\\u3001\\u66f4\\u6362\\u6d4f\\u89c8\\u5668\\u90fd\\u65e0\\u6cd5\\u89e3\\u51b3\\u95ee\\u9898\\uff0c\\u8bf7\\u622a\\u56fe\\u53d1\\u7ed9\\u516c\\u4f17\\u53f7\\u300c\\u7ebf\\u4e0b\\u805a\\u4f1a\\u6e38\\u620f\\u300d\\uff0c\\u611f\\u8c22\\u53cd\\u9988\\u3002',
  '\\u672a\\u77e5\\u5f02\\u5e38".concat(t.code,"\\u3002\\u82e5\\u5237\\u65b0\\u9875\\u9762\\u3001\\u66f4\\u6362\\u6d4f\\u89c8\\u5668\\u90fd\\u65e0\\u6cd5\\u89e3\\u51b3\\u95ee\\u9898\\uff0c\\u8bf7\\u7a0d\\u540e\\u518d\\u8bd5\\u3002');

if (fail) process.exit(1);
fs.writeFileSync(f, s);
console.log('完成');
