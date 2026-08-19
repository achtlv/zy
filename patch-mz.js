const fs = require('fs');
const f = 'ddz/static/js/app.03832cca.chunk.js';
let s = fs.readFileSync(f, 'utf8');
let fail = false;
function patch(label, oldStr, newStr) {
  if (!s.includes(oldStr)) { console.error('FAIL: [' + label + '] not found'); fail = true; return; }
  s = s.replace(oldStr, newStr);
  console.log('OK:', label);
}
// 1. 公告块
patch('公告块',
  't&&(n?(0,f.jsx)(o.Z,{noStyle:!0,to:n,className:"whitespace-pre-line inline-block mx-auto text-xs p-2 -mt-6 mb-4 bg-white/90 rounded-sm shadow text-justify text-align-last-left text-blue-600",children:t}):(0,f.jsx)("div",{className:"whitespace-pre-line inline-block mx-auto text-xs p-2 -mt-6 mb-4 bg-white/90 rounded-sm shadow text-justify text-align-last-left text-black/90",children:t})),',
  '');
// 2. 查看规则按钮
patch('查看规则',
  'd&&(0,f.jsx)("div",{children:(0,f.jsx)(o.Z,{to:d,children:h||"\\ud83d\\udca1 \\u67e5\\u770b\\u89c4\\u5219"})}),',
  '');
// 3. 视频规则按钮
patch('视频规则',
  'j&&(0,f.jsx)("div",{children:(0,f.jsx)(o.Z,{to:j,children:"\\ud83c\\udfac \\u89c6\\u9891\\u89c4\\u5219"})}),',
  '');
// 4. EN 小程序公众号分支
patch('EN公众号分支',
  'u.EN&&!["lrs","sswd","awl","xddh","yyl"].includes(c.s_.key)&&(0,f.jsxs)(f.Fragment,{children:[(0,f.jsx)("div",{children:"\\u4f60\\u5728\\u5c0f\\u7a0b\\u5e8f\\u73af\\u5883\\u4e2d\\uff0c\\u5c0f\\u7a0b\\u5e8f\\u4e0d\\u652f\\u6301\\u8054\\u673a\\u5bf9\\u6218"}),(0,f.jsx)("div",{className:"mx-2 font-bold",children:"\\u82e5\\u60f3\\u8054\\u673a\\u5bf9\\u6218\\uff0c\\u9700\\u626b\\u7801\\u5173\\u6ce8\\u516c\\u4f17\\u53f7\\u201c\\u7ebf\\u4e0b\\u805a\\u4f1a\\u6e38\\u620f\\u201d\\uff0c\\u7ed9\\u540e\\u53f0\\u53d1\\u6d88\\u606f\\uff08\\u4efb\\u610f\\u6e38\\u620f\\u540d\\uff09"}),(0,f.jsx)(m.Z,{})]})',
  '');
if (fail) process.exit(1);
fs.writeFileSync(f, s);
console.log('M.Z 清理完成');
