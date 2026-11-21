const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const keys = new Set(['System default', 'Display language']);
const counts = {};
const pluginKeys = new Set();
function record(file,key) {
  keys.add(key);
  if(file.startsWith('plugin/')) pluginKeys.add(key);
  counts[file] = (counts[file] || 0) + 1;
}
function files(dir,callback) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const name = path.join(dir,entry.name);
    if(entry.isDirectory()) files(name,callback); else callback(name);
  }
}
for(const subtree of ['web/src','plugin/src']) files(path.join(root,subtree),name=>{
  if(!/\.tsx?$/.test(name)||name.includes('/__tests__/')||name.endsWith('interfaceLabels.ts')) return;
  const source=ts.createSourceFile(name,fs.readFileSync(name,'utf8'),ts.ScriptTarget.Latest,true,name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  function walk(node) {
    if(ts.isCallExpression(node) && node.expression.getText(source)==='ui' && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
      record(path.relative(root,name),node.arguments[0].text);
    }
    ts.forEachChild(node,walk);
  }
  walk(source);
});
files(path.join(root,'phone/lib'),name=>{
  if(!name.endsWith('.dart') || name.endsWith('/interface_labels.dart'))return;
  const source=fs.readFileSync(name,'utf8');
  const pattern=/\b(?:tr\(\s*context\s*,\s*|ui\(\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/gs;
  for(const m of source.matchAll(pattern)) {
    const raw=m[1],unescape=raw.slice(1,-1).replace(/\\(["'\\$])/g,'$1').replace(/\\n/g,'\n');
    record(path.relative(root,name),unescape);
  }
});
const signinHtml=fs.readFileSync(path.join(root,'backend/signin.html'),'utf8');
for(const m of signinHtml.matchAll(/data-interface>([^<>]+)</g)) record('backend/signin.html',m[1]);
const signinJs=fs.readFileSync(path.join(root,'backend/signin.js'),'utf8');
for(const m of signinJs.matchAll(/ui\(("(?:\\.|[^"\\])*")\)/g))record('backend/signin.js',JSON.parse(m[1]));
// Native file channels originate these five literal diagnostics (dynamic system messages are never translated as UI).
for(const value of ['A file picker is already open.','A document picker is open.','Open Dockit before choosing a file.','No file picker is available.','The export exceeds 20 MB.'])keys.add(value);
// Closed status vocabulary from Shiprite receipts and local task enums, localized at the display boundary.
for (const label of ["Ready to start", "In progress", "Awaiting review", "Approved", "To do", "Completed", "Needs a decision", "Stopped"]) keys.add(label);
if(process.argv.includes('--plugin-keys')) {console.log(JSON.stringify([...pluginKeys].sort()));process.exit(0)}
const ordered=[...keys].sort();
const directory=path.join(root,'phone/assets/interface');
if(process.argv.includes('--update-inventory'))fs.writeFileSync(path.join(directory,'keys.json'),JSON.stringify(ordered,null,2)+'\n');
else {
  const expected=JSON.parse(fs.readFileSync(path.join(directory,'keys.json'),'utf8'));
  if(JSON.stringify(expected)!==JSON.stringify(ordered))throw Error('Interface source inventory changed. Run scripts/audit-interface.cjs --update-inventory.');
}
const result={keys:keys.size,web:0,plugin:0,phone:0,signin:0,files:Object.keys(counts).length,locales:{}};
for(const [name,sites] of Object.entries(counts))result[name.startsWith('web/')?'web':name.startsWith('plugin/')?'plugin':name.startsWith('phone/')?'phone':'signin']+=sites;
for(const tag of ['zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt']) {
  const copy=JSON.parse(fs.readFileSync(path.join(directory,tag+'.json'),'utf8'));
  const missing=ordered.filter(k=>typeof copy[k]!=='string'||!copy[k].trim());
  const extra=Object.keys(copy).filter(k=>!keys.has(k));
  const args=v=>(v.match(/\{\d+\}/g)||[]).sort().join('|');
  const placeholders=ordered.filter(k=>copy[k] && args(k)!==args(copy[k]));
  const badCopy = ordered.filter(k => copy[k] && (/\[X\d+\]|<think>|只輸出|佔位符|保留原文|唔需要解釋|只输出|占位符|output only|placeholder like|以下.*翻[譯訳译]|訳文のみ|翻訳のみ|プレースホルダ|번역문만|단일 작업 노트북 UI|Traduction :|Traducción:|Übersetzung:/i.test(copy[k]) || (copy[k].includes('\n') && !k.includes('\n'))));
  result.locales[tag]={suspectCopy:badCopy.length,entries:ordered.length-missing.length,missing:missing.length,extra:extra.length,invalidPlaceholders:placeholders.length};
  if(!process.argv.includes('--update-inventory') && (missing.length||extra.length||placeholders.length||badCopy.length))process.exitCode=1;
}
console.log(JSON.stringify(result,null,2));
