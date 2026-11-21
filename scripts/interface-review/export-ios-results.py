from pathlib import Path
import subprocess,hashlib,gzip,json,os,time
root=Path.cwd();out=root/'output/interface-five';ext=Path('/Volumes/data/codex-tmp/dockit-five-native')
manifest=ext/'native-ui-v1.xcresult';attachments=ext/'ios-ui-attachments';attachments.mkdir(exist_ok=True)
subprocess.run(['xcrun','xcresulttool','export','attachments','--path',str(manifest),'--output-path',str(attachments)],check=True)
app=ext/'ios-derived/Build/Products/Debug-iphonesimulator/Runner.app'
digest=hashlib.sha256((app/'Runner').read_bytes()).hexdigest()
states={};errors=[]
for f in attachments.rglob('*'):
 if not f.is_file() or f.stat().st_size>5_000_000:continue
 try:
  decoded=json.loads(f.read_text())
  if isinstance(decoded,list) and len(decoded)==4 and decoded[0] in ['en','zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt']:
   tag,cycle,state,items=decoded;states[(tag,cycle,state)]=items
 except (UnicodeDecodeError,ValueError,TypeError):pass
with gzip.open(out/'ios-native-xctest.jsonl.gz','wt')as g:
 for (tag,cycle,state),items in sorted(states.items()):
  for r in items:
   r['focus']={'name':r['text'],'disabled':not r.get('enabled',True),'tag':r.get('type')}
   g.write(json.dumps(['ios-native-xctest',digest[:16],tag,cycle,state,r],ensure_ascii=False,separators=(',',':'))+'\n')
gaps=[[t,c,s]for t in ['en','zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt'] for c in range(1,6) for s in ['notebook','language-menu','settings'] if(t,c,s)not in states]
(out/'ios-native-xctest-gaps.json').write_text(json.dumps(gaps));print('iOS UIKit accessibility snapshots',len(states),'elements',sum(map(len,states.values())),'gaps',len(gaps),'binary',digest,flush=True)
