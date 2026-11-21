"""Actual Android accessibility nodes, five fresh visits; the synthetic test emulator only."""
from pathlib import Path
import datetime, gzip, hashlib, json, os, re, subprocess, time, zlib, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/interface-five';OUT.mkdir(exist_ok=True)
ADB=os.getenv('ADB','/opt/homebrew/share/android-commandlinetools/platform-tools/adb')
serial=os.environ['DOCKIT_TEST_SERIAL']; pkg='io.github.twomars4096.sticky_todo.preview'
if not serial.startswith('emulator-'):raise SystemExit('A synthetic emulator is required.')
tags=['en','zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt']
names=['English','简体中文','繁體中文','廣東話','日本語','한국어','Français','Deutsch','Español','Português']
globes=['Display language','显示语言','顯示語言','顯示語言','表示言語','표시 언어','Langue d’affichage','Anzeigesprache','Idioma de visualización','Idioma de exibição']
systems=['System default','跟随系统','跟隨系統','跟系統','システム設定','시스템 기본값','Langue du système','Systemsprache','Idioma del sistema','Idioma do sistema']
def run(*args):
 return subprocess.check_output([ADB,'-s',serial,*args],stderr=subprocess.DEVNULL,timeout=180)
def notebook():return json.loads(run('exec-out','run-as',pkg,'cat','files/sticky-todo.json'))
def start():run('shell','am','start','-n',pkg+'/io.github.twomars4096.sticky_todo.MainActivity')
def ui():
 for _ in range(9):
  path='/data/local/tmp/dockit-ledger-'+str(time.time_ns())+'.xml'
  try:
   run('shell','uiautomator','dump','--compressed',path);top=ET.fromstring(run('exec-out','cat',path))
   if any(n.get('package')==pkg for n in top.iter('node')):return top
  except (ValueError,ET.ParseError,subprocess.CalledProcessError):pass
  finally:run('shell','rm','-f',path)
  time.sleep(.15)
 raise RuntimeError('No fresh Dockit semantics tree')
def lookup(tree,label):
 for n in tree.iter('node'):
  if n.get('package')==pkg and label in [n.get('text'),n.get('content-desc'),n.get('class')]:return n
 raise ValueError('Missing known control '+label)
def wait_tree(label):
 for _ in range(8):
  tree=ui()
  try:lookup(tree,label);return tree
  except ValueError:time.sleep(.25)
 raise ValueError('No fresh window with '+label)
def tap(node):
 a,b,c,d=map(int,re.findall(r'-?\d+',node.get('bounds')));run('shell','input','tap',str((a+c)//2),str((b+d)//2))
def rows(tree):
 result=[]
 def walk(n,path):
  if n.get('package')==pkg:
   b=list(map(int,re.findall(r'-?\d+',n.get('bounds',''))))
   for k in ('text','content-desc'):
    if n.get(k,'').strip():
     result.append({'locator':path,'kind':k,'text':n.get(k),'bounds':[b[0],b[1],b[2]-b[0],b[3]-b[1]],'focus':{'tab':n.get('focusable')=='true','disabled':n.get('enabled')=='false','name':n.get('content-desc') or n.get('text'),'tag':n.get('class')},'emptyBox':b[0]==b[2] or b[1]==b[3],'inView':True})
  for i,c in enumerate(n):walk(c,path+'/'+c.get('class','hierarchy').rsplit('.',1)[-1]+'['+str(i)+']')
 walk(tree,'window');return result
def main():
 apk=ROOT/'output/clients/Dockit-debug.apk'
 digest=hashlib.sha256(apk.read_bytes()).hexdigest()
 try:before=notebook()
 except (ValueError,subprocess.CalledProcessError):before=None
 assert b'Success' in run('install','-r',str(apk.resolve()))
 run('shell','input','keyevent','KEYCODE_WAKEUP');run('shell','wm','dismiss-keyguard');start()
 if before is None:
  for _ in range(8):
   try:editor=lookup(ui(),'android.widget.EditText');break
   except ValueError:time.sleep(.4)
  else:raise RuntimeError('Test notebook did not expose its editable capture field')
  tap(editor);run('shell','input','text','SyntheticAuditNote')
  tap(lookup(ui(),'Add task'));time.sleep(.6);before=notebook()
 previous=before.get('preferences',{}).get('interfaceLanguage','system')
 previous_at_entry=previous
 progress_dir=OUT/'android-cycle-parts';progress_dir.mkdir(exist_ok=True)
 prior_file=progress_dir/'prior-locale'
 if not prior_file.exists():prior_file.write_text('system' if (OUT/'android-installed-progress.txt').exists() else previous)
 restore_to=prior_file.read_text()
 # Recover only complete JSON records from the prior stream, even if the host was interrupted before gzip footer.
 final_path=OUT/'android-installed.jsonl.gz'
 observed={}
 if final_path.exists():
  gz=zlib.decompressobj(16+zlib.MAX_WBITS)
  for line in gz.decompress(final_path.read_bytes()).splitlines():
   try:
    row=json.loads(line); observed.setdefault((row[2],row[3],row[4]),[]).append(row)
   except ValueError:pass
 for chunk in progress_dir.glob('*.json.gz'):
  with gzip.open(chunk,'rt') as f:
   for row in json.load(f):observed.setdefault((row[2],row[3],row[4]),[]).append(row)
 for key,values in list(observed.items()):
  clean={ (v[5]['locator'],v[5]['kind']):v for v in values}
  observed[key]=list(clean.values())
 for (tag,cycle,state),values in observed.items():
  chunk=progress_dir/(tag+'-'+str(cycle)+'-'+state+'.json.gz')
  if not chunk.exists():
   with gzip.open(chunk,'wt') as f:json.dump(values,f,ensure_ascii=False)
 current=previous_at_entry if previous_at_entry in tags else 'en'
 gaps=[];count=0
 with open(OUT/'android-checkpoint.log','a',encoding='utf8') as output:
  for idx,tag in enumerate(tags):
   if all((tag,cycle,state) in observed for cycle in range(1,6) for state in ('notebook','language-menu','settings')):continue
   tree=wait_tree(globes[tags.index(current)])
   try:tap(lookup(tree,globes[tags.index(current)]));tap(lookup(ui(),names[idx]));current=tag
   except Exception as e:gaps.append([tag,0,'change-language',str(e)]);continue
   cat=json.loads((ROOT/'phone/assets/interface'/(tag+'.json')).read_text()) if tag!='en' else {}
   for cycle in range(1,6):
    if all((tag,cycle,state) in observed for state in ('notebook','language-menu','settings')):continue
    if cycle==5:run('shell','am','force-stop',pkg);start()
    else:run('shell','input','keyevent','KEYCODE_HOME');start()
    try:
     tree=wait_tree(globes[idx]);lookup(tree,globes[idx])
     def append(state,t):
      values=[['android-installed',digest[:16],tag,cycle,state,row] for row in rows(t)]
      observed[(tag,cycle,state)]=values
      with gzip.open(progress_dir/(tag+'-'+str(cycle)+'-'+state+'.json.gz'),'wt')as f:json.dump(values,f,ensure_ascii=False)
      output.write(tag+' '+str(cycle)+' '+state+' '+str(len(values))+'\n');output.flush()
     append('notebook',tree)
     tap(lookup(tree,globes[idx]));menu=wait_tree(names[idx]);lookup(menu,names[idx]);append('language-menu',menu);run('shell','input','keyevent','4')
     tree=ui();tap(lookup(tree,cat.get('Settings','Settings')));append('settings',ui());run('shell','input','keyevent','4')
     count+=3
    except Exception as e:gaps.append([tag,cycle,'native-navigation',str(e)]);run('shell','am','force-stop',pkg);start()
    output.flush()
   (OUT/'android-installed-progress.txt').write_text(tag+' '+str(count))
 try:
  tree=wait_tree(globes[tags.index(current)]);tap(lookup(tree,globes[tags.index(current)]));tap(lookup(ui(),systems[tags.index(current)] if restore_to=='system' else names[tags.index(restore_to)]))
 except Exception as e:gaps.append(['restore',str(e)])
 with gzip.open(final_path,'wt') as f:
  for _,values in sorted(observed.items()):
   for row in values:f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
 after=notebook()
 for key in ['days','goals','focus','routineSchedules']:assert before.get(key)==after.get(key),key
 (OUT/'android-installed-gaps.json').write_text(json.dumps(gaps,ensure_ascii=False,indent=2));print('native snapshots',count,'gaps',len(gaps),flush=True)
if __name__=='__main__':main()
