"""Stream a real simulator test ledger out before Flutter uninstalls the test app."""
import gzip,hashlib,json,os,subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=root/'output/interface-five';scratch=Path('/Volumes/data/codex-tmp/dockit-five-native');staging=Path('/Volumes/data/codex-tmp/dockit-simulator-engine-review');uid=(scratch/'ios-udid').read_text().strip()
devices=json.loads(subprocess.check_output(['xcrun','simctl','list','devices','--json']))['devices']
assert any(v['name']=='Dockit Element Audit' and v['udid']==uid for v in devices['com.apple.CoreSimulator.SimRuntime.iOS-26-4'])
tag='work.pipedreams.dockit.matrixfixture'
test=staging/'integration_test/review_elements_test.dart'
s=test.read_text()
if 'DOCKIT_DEVICE_GAPS=' not in s:
 s=s.replace("output.closeSync();File(","output.closeSync();print('DOCKIT_DEVICE_GAPS='+jsonEncode(failures));await tester.runAsync(()=>Future<void>.delayed(const Duration(seconds:8)));File(")
 test.write_text(s)
env={**os.environ,'TMPDIR':str(scratch)}
log=out/'ios-runtime-external.log'
raw=out/'ios-simulator-native.raw.jsonl'
source=None;delivered=0
with log.open('w') as l,raw.open('wb')as dest:
 proc=subprocess.Popen(['/Volumes/data/codex-tmp/pipedreams-flutter-3.47.8/bin/flutter','test','--no-pub','--reporter','expanded','-d',uid,'integration_test/review_elements_test.dart'],cwd=staging,env=env,stdout=l,stderr=subprocess.STDOUT)
 nextprobe=0
 while True:
  if source is None and time.monotonic()>nextprobe:
   nextprobe=time.monotonic()+2
   p=subprocess.run(['xcrun','simctl','get_app_container',uid,tag,'data'],capture_output=True,text=True)
   if p.returncode==0:
    file=Path(p.stdout.strip())/'Library/Application Support/dockit-review/flutter-simulator.raw.jsonl'
    if file.is_file():source=file.open('rb');print('Attached external collector',flush=True)
  if source:
   block=source.read()
   if block:dest.write(block);dest.flush();delivered+=len(block)
  if proc.poll() is not None:
   if source:dest.write(source.read());source.close()
   assert proc.returncode==0,proc.returncode
   break
  time.sleep(.1)
text=log.read_text();assert 'All tests passed!' in text and delivered>0
assert 'DOCKIT_DEVICE_GAPS=[]' in text,text[-1300:]
app=staging/'build/ios/iphonesimulator/Runner.app/Runner';digest=hashlib.sha256(app.read_bytes()).hexdigest()
states=set();n=0
with raw.open()as f,gzip.open(out/'ios-simulator-engine.jsonl.gz','wt',compresslevel=6)as g:
 for line in f:
  _,locale,cycle,state,items=json.loads(line);assert items,(locale,cycle,state);states.add((locale,cycle,state))
  for row in items:g.write(json.dumps(['ios-simulator-engine',digest[:16],locale,cycle,state,row],ensure_ascii=False,separators=(',',':'))+'\n');n+=1
assert len(states)>700 and len({r[0] for r in states})==10 and {r[1] for r in states}=={1,2,3,4,5}
(out/'ios-simulator-engine-gaps.json').write_text('[]')
(out/'ios-simulator-engine-receipt.json').write_text(json.dumps({'device':'Dockit Element Audit','runtime':'iOS 26.4 (23E244)','id':uid,'bundle':tag,'nativeExecutableSHA256':digest,'stateRenders':len(states),'elementObservations':n,'states':sorted({s[2] for s in states}),'externalRawBytes':raw.stat().st_size,'nativeXCTestAdditional':150},indent=2))
subprocess.run(['xcrun','simctl','shutdown',uid],check=True);subprocess.run(['xcrun','simctl','delete',uid],check=True)
print('Validated',len(states),'states and',n,'rendered and semantic element observations; removed the named disposable device.',flush=True)
