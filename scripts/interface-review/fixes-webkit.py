"""Check the production Dockit React components and notebook inside a real macOS WKWebView."""
import os, contextlib, http.server, threading, subprocess, tempfile, json, gzip, hashlib
from pathlib import Path
from urllib.parse import urlsplit
import browser as b
out=b.ROOT/'docs/reviews/25-interface-elements/supplemental-goal-focus/corrected'
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  url=urlsplit(self.path);route=url.path.split('/')
  dist=b.OUT/'web-components' if len(route)>1 and route[1]=='components' else b.ROOT/'dist'
  path=dist/(('/'.join(route[2:]) if len(route)>1 and route[1] in ('notebook','components') else url.path.lstrip('/')) or 'index.html')
  if not path.is_file() or not path.resolve().is_relative_to(dist.resolve()):self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',{'.js':'application/javascript','.css':'text/css','.html':'text/html'}.get(path.suffix,'application/octet-stream'));self.end_headers();self.wfile.write(path.read_bytes())
seed=subprocess.check_output(['node','-p',"require('./tests/helpers/browser-fixture.cjs').seedBridge.toString()"],cwd=b.ROOT,text=True)
labels={l:({} if l=='en' else json.loads((b.ROOT/'phone/assets/interface'/(l+'.json')).read_text())) for l in b.TAGS}
keys=['Start focus','Ignition','Ascent','Heating','Staging','Orbit','{0} unfinished goals','{0} active routines','Today','{0} day overdue','{0} days overdue']
table={l:{k:v.get(k,k) for k in keys} for l,v in labels.items()}
setup="const l=new URLSearchParams(location.search).get('language');localStorage.setItem('pipedreams.displayLanguage',l);window.reviewCaptions="+json.dumps(table)+"[l];const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[2026,10,21,12]))}static now(){return +new RealDate(2026,10,21,12)}};if(location.pathname.startsWith('/notebook'))("+seed+")();"
suffix=('-'+os.environ['DOCKIT_WK_TAG']) if os.environ.get('DOCKIT_WK_TAG') else '-pilot' if os.environ.get('DOCKIT_WK_PILOT') else ''
with tempfile.TemporaryDirectory(dir='/Volumes/data/codex-tmp',prefix='dockit-wk-labels-') as td:
 t=Path(td);(t/'inject.js').write_text(setup);binary=t/'wk'
 subprocess.run(['swiftc',str(Path(__file__).with_name('FixesWebKit.swift')),'-o',str(binary)],check=True)
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 try:subprocess.run([str(binary),str(server.server_port),str(t/'inject.js'),str(Path(__file__).with_name('fixes-webkit.js')),str(t/'raw.json')],check=True,timeout=1100)
 finally:server.shutdown()
 raw=json.loads((t/'raw.json').read_text())
 led=[];fails=[]
 for tag,cycle,state,values in raw:
  cat=table[tag];dateModule="const l=process.argv[1];console.log(new Intl.DateTimeFormat(l,{weekday:'short',month:'short',day:'numeric'}).format(new Date(2026,11,12)))"
  if state=='goals':
   date=values.get('reference') if isinstance(values,dict) else None
   if isinstance(values,dict):values=values['values']
   expected=[cat['{0} unfinished goals'].replace('{0}','3'),cat['{0} active routines'].replace('{0}','3'),date,cat['Today'],cat['{0} day overdue'].replace('{0}','1'),cat['{0} days overdue'].replace('{0}','2'),date]
   checks=list(zip(expected,values)) if isinstance(values,list) and len(values)==len(expected) else [('7 rendered badges and counts',values)]
  else:
   expected=[cat[key] for key in keys[1:6]]
   checks=[(s,v) for actual in values for s,v in zip(expected,actual)] if isinstance(values,list) and len(values)==3 and all(len(row)==5 for row in values) else [('three sets of five phases',values)]
  for i,(expected,actual) in enumerate(checks):
   row=[tag,cycle,state,i,actual,expected,actual==expected];led.append(row)
   if actual!=expected:fails.append(row)
 with gzip.open(out/('mac-wkwebview'+suffix+'.jsonl.gz'),'wt') as f:
  for row in led:f.write(json.dumps(row,ensure_ascii=False)+'\n')
 builds={p:hashlib.sha256(f.read_bytes()).hexdigest() for p,f in [('notebook',next((b.ROOT/'dist/assets').glob('index-*.js'))),('components',b.OUT/'web-components/index.js')]}
 (out/('mac-wkwebview'+suffix+'.json')).write_text(json.dumps({'platform':'native macOS WKWebView, isolated test window','builds':builds,'stateVisits':len(raw),'observations':len(led),'failures':len(fails),'sample':fails[:4]},indent=2,ensure_ascii=False));print(len(raw),len(led),len(fails),fails[:2],flush=True)
 if fails:raise SystemExit(1)
