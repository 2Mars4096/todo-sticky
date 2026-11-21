"""Run the real Tauri notebook in a separate debug bundle with an explicitly isolated synthetic KB."""
import http.server,json,threading,tempfile,secrets,subprocess,shutil,gzip,hashlib,time,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/interface-five';TMP=Path('/Volumes/data/codex-tmp')
scratch=Path(tempfile.mkdtemp(prefix='dockit-native-mac-',dir=TMP));assets=scratch/'assets';profile=scratch/'profile';(profile/'tasks').mkdir(parents=True)
shutil.copytree(ROOT/'dist',assets);token=secrets.token_urlsafe(32);finished=threading.Event();relaunch=threading.Event();complete=set();rows=[];gaps=[];headers=[]
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  if self.path!='/'+token or self.headers.get('Origin') not in ('tauri://localhost','http://tauri.localhost','https://tauri.localhost','null'):
   self.send_error(403);return
  n=int(self.headers.get('Content-Length',0))
  if n>1_000_000:self.send_error(413);return
  cmd=json.loads(self.rfile.read(n))
  if cmd.get('resume'):
   data=json.dumps(list(complete)).encode()
   self.send_response(200);self.send_header('Access-Control-Allow-Origin',self.headers['Origin']);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
  if cmd.get('cycleDone'):
   complete.add(cmd['locale']+'/'+str(cmd['cycle']))
   (OUT/'mac-native-completed-cycles.json').write_text(json.dumps(sorted(complete)))
  elif cmd.get('relaunch'):relaunch.set()
  elif cmd.get('activate'):pass
  elif 'wait' in cmd: time.sleep(min(.45,max(0,cmd['wait']/1000)))
  elif 'items'in cmd:
   fresh=[]
   for item in cmd['items']:
    item['windowVisibility']=cmd.get('visible');item['viewport']=cmd.get('viewport')
    fresh.append(['mac-native-debug',build,cmd['locale'],cmd['cycle'],cmd['state'],item])
   rows.extend(fresh)
   parts=OUT/'cycles'/'mac-native-debug';parts.mkdir(exist_ok=True,parents=True)
   with gzip.open(parts/(cmd['locale']+'-'+str(cmd['cycle'])+'-'+cmd['state']+'.json.gz'),'wt')as f:json.dump(fresh,f,ensure_ascii=False,separators=(',',':'))
   (OUT/'mac-native-progress.txt').write_text(cmd['locale']+' '+str(cmd['cycle'])+' '+cmd['state']+' '+str(len(rows)))
  elif 'start'in cmd:headers.append(cmd)
  elif 'gap'in cmd or 'fatal'in cmd:gaps.append(cmd)
  self.send_response(200);self.send_header('Access-Control-Allow-Origin',self.headers['Origin']);self.end_headers();self.wfile.write(b'ok')
  if cmd.get('done') or 'fatal'in cmd:finished.set()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
script=Path(__file__).with_name('native-mac.js').read_text()
extract='scope=>{'+Path(__file__).with_name('dom-elements.js').read_text()+'}'
captions={t:({} if t=='en' else json.loads((ROOT/'phone/assets/interface'/(t+'.json')).read_text())) for t in ['en','zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt']}
small={t:{k:v.get(k,k) for k in ['Plan','Close Focus Mode','Close day plan','Open project','Add a goal','Close goals','Settings','Close settings']} for t,v in captions.items()}
script='const REVIEW_CAPTIONS='+json.dumps(small,ensure_ascii=False)+';const REVIEW_URL='+json.dumps('http://127.0.0.1:'+str(server.server_port)+'/'+token)+';const REVIEW_KB='+json.dumps(str(profile/'tasks'))+';const REVIEW_EXTRACT='+extract+';\n'+script
(assets/'dockit-review.js').write_text(script)
html=(assets/'index.html').read_text();(assets/'index.html').write_text(html.replace('</body>','<script type="module" src="/dockit-review.js"></script></body>'))
cfg={'identifier':'work.pipedreams.dockit.elementreview','productName':'Dockit Element Review','build':{'frontendDist':str(assets),'beforeBuildCommand':''},'bundle':{'createUpdaterArtifacts':False}}
env={**os.environ,'TMPDIR':str(scratch),'CI':'true'}
with (OUT/'mac-native-build.log').open('w') as log:
 subprocess.run(['npm','run','build','--','--debug','--bundles','app','--config',json.dumps(cfg)],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
bundle=ROOT/'desktop/src-tauri/target/debug/bundle/macos/Dockit Element Review.app';exe=bundle/'Contents/MacOS/todo-sticky'
build=hashlib.sha256(exe.read_bytes()).hexdigest()[:16]
# Seed only the nominated new, synthetic data directory with the bundled reader/writer.
date=__import__('datetime').date.today().isoformat()
cli=bundle/'Contents/MacOS/sticky-todo-api'
subprocess.run([str(cli),'--kb-path',str(profile/'tasks'),'create','--date',date,'--text','Synthetic native audit note','--subtask','Synthetic native audit step'],check=True,capture_output=True)
threading.Thread(target=server.serve_forever,daemon=True).start()
import signal
def stop_review_app():
 for line in subprocess.check_output(['ps','-Ao','pid=,args='],text=True).splitlines():
  pid,_,args=line.strip().partition(' ')
  if args==str(exe):os.kill(int(pid),signal.SIGTERM)
for attempt in range(14):
 stop_review_app();time.sleep(.4);relaunch.clear()
 subprocess.run(['open','-n','--env','STICKY_TODO_DEV_DATA_DIR='+str(profile),str(bundle)],check=True)
 start=time.monotonic()
 while not finished.is_set() and not relaunch.is_set() and time.monotonic()-start<110:time.sleep(.25)
 if finished.is_set() or len(complete)==50:break
if len(complete)==50:finished.set()
stop_review_app()
server.shutdown()
with gzip.open(OUT/'mac-native-debug.jsonl.gz','wt')as f:
 for r in rows:f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
(OUT/'mac-native-debug-gaps.json').write_text(json.dumps(gaps+([] if finished.is_set() else [['timeout','No completion receipt']]),ensure_ascii=False))
(OUT/'mac-native-debug-receipt.json').write_text(json.dumps({'header':headers,'build':build,'rows':len(rows),'scratch':str(scratch),'finished':finished.is_set()},indent=2))
print('Tauri native',len(rows),'observations',len(gaps),'gaps',bool(headers),flush=True)
