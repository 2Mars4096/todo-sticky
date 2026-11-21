"""Resume the identical native binary from checkpoint files; never read a personal notebook."""
from pathlib import Path
import hashlib,http.server,json,threading,subprocess,gzip,os,time,signal,re
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/interface-five';base=Path('/Volumes/data/codex-tmp')
scratch=max(base.glob('dockit-native-mac-*'),key=lambda p:p.stat().st_mtime)
src=(scratch/'assets/dockit-review.js').read_text()
url=urlsplit(json.loads(re.search(r'const REVIEW_URL=(.*?);',src)[1]))
folder=Path(json.loads(re.search(r'const REVIEW_KB=(.*?);',src)[1]))
assert folder==scratch/'profile/tasks' and folder.is_dir()
app=ROOT/'desktop/src-tauri/target/debug/bundle/macos/Dockit Element Review.app';exe=app/'Contents/MacOS/todo-sticky';build=hashlib.sha256(exe.read_bytes()).hexdigest()[:16]
parts=OUT/'cycles/mac-native-debug';done=threading.Event();header=[];gaps=[];live={}
for f in parts.glob('*.json.gz'):
 try:
  with gzip.open(f,'rt') as g:r=json.load(g)
  if r and r[0][1]==build:live[(r[0][2],r[0][3],r[0][4])]=r
 except (ValueError,EOFError):pass
def stop_exact():
 commands=subprocess.check_output(['ps','-Ao','pid=,args='],text=True).splitlines()
 for ln in commands:
  pid,_,args=ln.strip().partition(' ')
  if args==str(exe) or args.endswith('scripts/interface-review/native_mac.py') and 'python' in args.lower():os.kill(int(pid),signal.SIGTERM)
stop_exact();time.sleep(.8)
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  origin=self.headers.get('Origin')
  if self.path!=url.path or origin not in ['tauri://localhost','http://tauri.localhost','https://tauri.localhost','null']:return self.send_error(403)
  n=int(self.headers.get('Content-Length',0));assert n<1_000_000
  x=json.loads(self.rfile.read(n))
  if 'wait'in x:time.sleep(min(.25,max(0,x['wait']/1000)))
  elif 'start'in x:assert x['folder']==str(folder);header.append(x)
  elif 'items'in x:
   key=(x['locale'],x['cycle'],x['state'])
   for el in x['items']:el['windowVisibility']=x['visible'];el['viewport']=x['viewport']
   rows=[['mac-native-debug',build,*key,el]for el in x['items']]
   if rows and (x['visible']=='visible' or key not in live):
    live[key]=rows
    with gzip.open(parts/('%s-%s-%s.json.gz'%key),'wt')as f:json.dump(rows,f,ensure_ascii=False,separators=(',',':'))
   (OUT/'mac-native-progress.txt').write_text(str(key)+' '+str(len(live)))
  elif 'fatal'in x or 'gap'in x:gaps.append(x)
  self.send_response(200);self.send_header('Access-Control-Allow-Origin',origin);self.send_header('Content-Length','2');self.end_headers();self.wfile.write(b'ok')
  if x.get('done') or x.get('fatal'):done.set()
with http.server.ThreadingHTTPServer(('127.0.0.1',url.port),Handler) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 subprocess.run(['open','-n','--env','STICKY_TODO_DEV_DATA_DIR='+str(folder.parent),str(app)],check=True)
 done.wait(540);server.shutdown()
with gzip.open(OUT/'mac-native-debug.jsonl.gz','wt') as f:
 for rows in live.values():
  for row in rows:f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
expected={s for t,c,s in live if t=='fr'}
missing=[[tag,c,s]for tag in ['en','zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt'] for c in range(1,6) for s in expected if (tag,c,s)not in live]
(OUT/'mac-native-debug-gaps.json').write_text(json.dumps(gaps+missing,ensure_ascii=False,indent=2))
(OUT/'mac-native-debug-receipt.json').write_text(json.dumps({'build':build,'states':len(live),'rows':sum(map(len,live.values())),'header':header,'scratch':str(scratch),'finished':done.is_set(),'missing':len(missing),'expectedStates':sorted(expected)},ensure_ascii=False,indent=2))
stop_exact();print('Tauri native complete',len(live),'snapshots',len(missing),'missing',len(gaps),'errors.',flush=True)
