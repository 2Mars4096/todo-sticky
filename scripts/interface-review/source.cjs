/** Five independent, source-only review passes. No renderer evidence is inferred here. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript'),zlib=require('node:zlib')
const root=path.resolve(__dirname,'../..'),out=path.join(root,'output/interface-five');fs.mkdirSync(out,{recursive:true})
const hash=s=>crypto.createHash('sha256').update(s).digest('hex')
const tags=['en','zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt']
const catalogs=Object.fromEntries(tags.slice(1).map(t=>[t,JSON.parse(fs.readFileSync(path.join(root,'phone/assets/interface',t+'.json'),'utf8'))]))
const keys=new Set(JSON.parse(fs.readFileSync(path.join(root,'phone/assets/interface/keys.json'),'utf8')))
const occurrences=[]
const nodesByFile=new Set()
function push(file,src,offset,end,key,kind,owner,portal){
 const prev=src.slice(0,offset);const line=prev.split('\n').length,col=offset-prev.lastIndexOf('\n')
 const ident=file+'#'+offset+':'+end
 if(nodesByFile.has(ident))return;nodesByFile.add(ident)
 occurrences.push({file,span:[line,col,offset,end],state:owner,key,kind,portal,id:hash(ident).slice(0,16),origin:hash(src.slice(offset,end)).slice(0,16)})
}
function visitDir(dir,fn){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const name=path.join(dir,entry.name)
  if(entry.isDirectory()){if(entry.name!=='__tests__')visitDir(name,fn)}else fn(name)
 }
}
for(const [dir,portal]of [['web/src','standalone-react'],['plugin/src','embedded-plugin']]){
 visitDir(path.join(root,dir),n=>{
  if(!/\.tsx?$/.test(n)||n.endsWith('interfaceLabels.ts'))return
  const file=path.relative(root,n),src=fs.readFileSync(n,'utf8'),sf=ts.createSourceFile(n,src,99,true,n.endsWith('tsx')?4:3)
  function walk(x,owner){
   if(ts.isFunctionDeclaration(x)&&x.name)owner=x.name.text
   if(ts.isCallExpression(x)&&x.expression.getText(sf)==='ui'){
    const a=x.arguments[0],literal=a&&ts.isStringLiteralLike(a),key=literal?a.text:null
    push(file,src,x.getStart(sf),x.end,key,literal?'localized-call':'dynamic-locale-key',owner,portal)
   }
   if(ts.isJsxText(x)&&x.getText(sf).trim()&&/[A-Za-z]/.test(x.getText(sf)))
    push(file,src,x.getStart(sf),x.end,x.getText(sf).trim(),'unbound-static-text',owner,portal)
   if(ts.isJsxExpression(x)&&x.expression&&(ts.isJsxElement(x.parent)||ts.isJsxFragment(x.parent))){
    const e=x.expression
    if(ts.isIdentifier(e)||ts.isPropertyAccessExpression(e)||ts.isElementAccessExpression(e))
      push(file,src,x.getStart(sf),x.end,null,'runtime-content',owner,portal)
   }
   ts.forEachChild(x,c=>walk(c,owner))
  }walk(sf,path.basename(file,'.tsx'))
 })
}
visitDir(path.join(root,'phone/lib'),n=>{
 if(!n.endsWith('.dart')||n.endsWith('interface_labels.dart'))return
 const file=path.relative(root,n),src=fs.readFileSync(n,'utf8')
 const pattern=/\b(?:tr\(\s*context\s*,\s*|ui\(\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/gs
 for(const m of src.matchAll(pattern)){
  const key=m[1].slice(1,-1).replace(/\\(["'\\$])/g,'$1').replace(/\\n/g,'\n')
  const names=[...src.slice(0,m.index).matchAll(/\bclass\s+(\w+)\b/g)]
  push(file,src,m.index,m.index+m[0].length,key,'localized-call',names.at(-1)?.[1]||path.basename(file,'.dart'),'flutter')
 }
 for(const m of src.matchAll(/\bText\(\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*[,)]/g))
  if(!['null','true','false'].includes(m[1]))push(file,src,m.index,m.index+m[0].length,null,'runtime-content',path.basename(file,'.dart'),'flutter')
})
for(const [file,pat]of [['backend/signin.html',/data-interface>([^<>]+)</g],['backend/signin.js',/ui\(("(?:\\.|[^"\\])*")\)/g]]){
 const src=fs.readFileSync(path.join(root,file),'utf8')
 for(const m of src.matchAll(pat))push(file,src,m.index,m.index+m[0].length,file.endsWith('.js')?JSON.parse(m[1]):m[1],'localized-call','account-link','legacy-signin')
}
const aux=[['phone/lib/interface_locale.dart',['System default','Display language'],'flutter'],
 ['phone/lib/services/files.dart',['A file picker is already open.','A document picker is open.','Open Dockit before choosing a file.','No file picker is available.','The export exceeds 20 MB.'],'flutter/native-channel'],
 ['phone/lib/services/workspace_assignment.dart',['Ready to start','In progress','Awaiting review','Approved'],'flutter'],
 ['web/src/suiteWorkspace.ts',['Ready to start','In progress','Awaiting review','Approved'],'standalone-react'],
 ['phone/lib/widgets/task_tile.dart',['To do','Completed','In progress','Needs a decision','Stopped'],'flutter']]
for(const [file,values,portal]of aux){
 const src=fs.readFileSync(path.join(root,file),'utf8')
 for(const key of values){const start=src.indexOf(key);if(start>=0)push(file,src,start,start+key.length,key,'closed-vocabulary',path.basename(file),portal)}
}
// Distinguish literal native fallback UI from the JS-supplied localized runtime menu.
for(const [file,pattern,portal] of [
 ['phone/ios/Runner/AppDelegate.swift',/FlutterError\(code:\s*"[^"]+",\s*message:\s*"([^"]+)"/g,'native-document-channel'],
 ['phone/android/app/src/main/kotlin/io/github/twomars4096/sticky_todo/MainActivity.kt',/result\.error\("[^"]+",\s*"([^"]+)"/g,'native-document-channel'],
 ['desktop/src-tauri/src/lib.rs',/format!\("(Toggle \/ Hide[^"]+|Dockit  \([^"]+)"|MenuItemBuilder::with_id\("quit",\s*"(Quit)"|SubmenuBuilder::new\(app,\s*"(Edit)"/g,'native-desktop-boot'],
]){
 const src=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of src.matchAll(pattern)){
  const value=m.slice(1).find(Boolean);
  push(file,src,m.index,m.index+m[0].length,value,'native-fallback-literal','native startup or system channel',portal)
 }
}
const build={};
for(const [portal,file]of [['standalone-react','dist/index.html'],['embedded-plugin','output/interface-five/diane-app-todo-plugin-'+JSON.parse(fs.readFileSync(path.join(root,'plugin/package.json'),'utf8')).version+'.tgz'],['flutter','output/clients/Dockit-debug.apk'],['legacy-signin','backend/signin-interface.js']]){
 build[portal]=hash(fs.readFileSync(path.join(root,file))).slice(0,16)
}
build['flutter/native-channel']=build.flutter;
build['native-document-channel']=build.flutter;
build['native-desktop-boot']=hash(fs.readFileSync(path.join(root,'output/clients/Dockit.app/Contents/MacOS/todo-sticky'))).slice(0,16);
const slots=s=>[...s.matchAll(/\{(\d+)\}/g)].map(x=>x[1]).sort().join(',')
const leak=/<think>|\[X\d+\]|只輸出|佔位符|保留原文|output only|プレースホルダ|단일 작업 노트북 UI/i
// Fixed multiplier suffixes are notation, not missing prose translations.
for (const o of occurrences) if(o.kind==='unbound-static-text' && o.key==='x')o.kind='multiplier-unit';
const records=[];
for(const o of occurrences)for(const tag of tags)records.push({...o,variant:'source/'+o.portal,build:build[o.portal],locale:tag,checks:[]})
for(let pass=1;pass<=5;pass++)for(const r of records){
 const k=r.key, v=tagged(r);
 let result;
 if(r.kind==='multiplier-unit'){
  const notation=[['source-unit',r.origin],['literal-notation',k],['no-placeholders'],['unit-no-script-conversion'],['unchanged-suffix',k]];
  r.checks.push(notation[pass-1]);continue;
 }
 if(pass===1)result=k===null?['runtime-content',r.origin]:[keys.has(k)?'catalog-bound':'outside-catalog',r.origin]
 if(pass===2)result=k===null?['not-static']:typeof v==='string'&&v.trim()?['resolved',hash(v).slice(0,16)]:['missing']
 if(pass===3)result=k===null?['not-static']:typeof v==='string'&&slots(v)===slots(k)?['placeholder-parity',slots(k)]:['invalid-slots']
 if(pass===4)result=k===null?['not-static']:typeof v==='string'&&!leak.test(v)&&(!v.includes('\n')||k.includes('\n'))?['residue-check-clear',v.length]:['suspect-copy']
 if(pass===5){
  if(k===null)result=['runtime-review-required']
  else if(typeof v!=='string')result=['missing']
  else{
   const translated=v.replace(/\{(\d+)\}/g,(_,i)=>'⟪Fixture '+i+' Delete·草稿⟫');
   const expected=k.match(/\{\d+\}/g)?.length??0,count=translated.match(/⟪Fixture \d+ Delete·草稿⟫/g)?.length??0;
   result=[count===expected?'sentinel-preserved':'sentinel-lost',count]
  }
 }
 r.checks.push(result)
}
function tagged(r){return r.key===null?null:r.locale==='en'?r.key:catalogs[r.locale]?.[r.key]}
const filename=path.join(out,'source-five.jsonl.gz')
fs.writeFileSync(filename,zlib.gzipSync(records.map(r=>JSON.stringify(r)).join('\n')+'\n',{level:9}))
console.log(JSON.stringify({occurrences:occurrences.length,localeOccurrenceRows:records.length,
  fiveChecks:records.length*5,kinds:Object.fromEntries([...new Set(occurrences.map(o=>o.kind))].map(kind=>[kind,occurrences.filter(o=>o.kind===kind).length])),
  coveredKeys:new Set(occurrences.map(o=>o.key).filter(k=>k!==null&&keys.has(k))).size,inventoryKeys:keys.size,variants:build},null,2))
