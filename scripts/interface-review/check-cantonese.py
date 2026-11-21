"""Run only the Cantonese restart guard on an authorized test simulator using the exported app."""
import argparse,gzip,hashlib,json,os,plistlib,subprocess,tempfile
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('simulator');args=parser.parse_args()
root=Path(__file__).resolve().parents[2];out=root/'output/interface-five';ext=Path('/Volumes/data/codex-tmp/dockit-five-native')
products=ext/'ios-derived/Build/Products';src=next(products.glob('DockitElementReview_iphonesimulator*.xctestrun'))
config=plistlib.loads(src.read_bytes());test=config['DockitElementReview'];app=root/'output/clients/ios-simulator/Dockit.app'
test['UITargetAppPath']=str(app);test['DependentProductPaths']=[str(app) if p.endswith('/Runner.app') else p for p in test['DependentProductPaths']]
dest=products/'dockit-cantonese-exported.xctestrun';dest.write_bytes(plistlib.dumps(config))
scratch=Path(tempfile.mkdtemp(prefix='dockit-cantonese-',dir=ext));result=scratch/'guard.xcresult'
env={**os.environ,'TMPDIR':str(ext)}
with (out/'ios-cantonese-guard.log').open('w')as log:
 run=subprocess.run(['xcodebuild','test-without-building','-xctestrun',str(dest),'-destination','id='+args.simulator,'-parallel-testing-enabled','NO','-only-testing:DockitElementReview/DockitElements/testCantoneseRelaunchGuard','-resultBundlePath',str(result)],env=env,stdout=log,stderr=subprocess.STDOUT)
attachments=scratch/'attachments'
subprocess.run(['xcrun','xcresulttool','export','attachments','--path',str(result),'--output-path',str(attachments)],env=env,check=True,capture_output=True)
arch=hashlib.sha256((app/'Runner').read_bytes()).hexdigest();states={}
for f in attachments.rglob('*'):
 if f.is_file() and f.stat().st_size<1_000_000:
  try:r=json.loads(f.read_text())
  except (ValueError,UnicodeDecodeError):continue
  if isinstance(r,list) and len(r)==4 and r[0]=='yue':states[r[1],r[2]]=r[3]
with gzip.open(out/'ios-cantonese-guard.jsonl.gz','wt') as g:
 for (cycle,state),rows in sorted(states.items()):
  for row in rows:
   row['focus']={'name':row['text'],'disabled':not row.get('enabled',True),'tag':row.get('type')}
   g.write(json.dumps(['ios-cantonese-guard',arch[:16],'yue',cycle,state,row],ensure_ascii=False,separators=(',',':'))+'\n')
gaps=[[c,state] for c in range(1,6) for state in ['notebook','settings','language-menu']if(c,state) not in states]
(out/'ios-cantonese-guard-gaps.json').write_text(json.dumps(gaps))
(out/'ios-cantonese-guard-receipt.json').write_text(json.dumps({'appPath':str(app),'executable':arch,'udid':args.simulator,'result':str(result),'stateRenders':len(states),'elementObservations':sum(map(len,states.values())),'missing':gaps,'exit':run.returncode},indent=2))
assert run.returncode==0 and not gaps
print('All five unique Traditional-Chinese → Cantonese transitions, force-stop/relaunches and three captured states passed on the exported app.')
