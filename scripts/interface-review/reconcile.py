from pathlib import Path
import argparse,collections,datetime,gzip,hashlib,json,re
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/interface-five'
tags=['en','zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt']
sourceKeys=json.loads((ROOT/'phone/assets/interface/keys.json').read_text())
normalize=lambda s:' '.join(s.split())
catalogs={t:({k:k for k in sourceKeys} if t=='en' else json.loads((ROOT/'phone/assets/interface'/(t+'.json')).read_text())) for t in tags}
reverse={};templates={}
for tag,copy in catalogs.items():
 r=collections.defaultdict(list);pat=[]
 for k,v in copy.items():
  r[normalize(v)].append(k)
  if re.search(r'\{\d+\}',v):
   seg=re.split(r'\{\d+\}',normalize(v))
   if any(len(s.strip())>=2 for s in seg):pat.append((re.compile('^'+'.+?'.join(map(re.escape,seg))+'$'),k))
 reverse[tag]=r;templates[tag]=pat
from functools import lru_cache
@lru_cache(maxsize=100000)
def matches(tag,text):
 s=normalize(text)
 if s in reverse[tag]:return ('catalog-literal',reverse[tag][s])
 if s in {'English','简体中文','繁體中文','廣東話','日本語','한국어','Français','Deutsch','Español','Português','Dockit','pipedreams','Mynit','Shiprite','Zilo','Zethea'}:return ('proper-name-or-autonym',[])
 if any(v in s for v in ('Fixture','SyntheticAudit','fixture.md','review-parent','weekly/fixture')):return ('synthetic-record',[])
 if not any(c.isalpha() for c in s):return ('numeric-or-symbol',[])
 ids=[key for regex,key in templates[tag] if regex.match(s)]
 if ids:return ('catalog-template',ids)
 if tag!='en' and s in catalogs[tag] and catalogs[tag][s]!=s:return ('source-language-candidate',[s])
 return ('context-or-framework-review',[])
def contents(profile):
 if profile.startswith('flutter-') or profile.startswith('counter-'):
  f=OUT/(profile+'.raw.jsonl')
  h=hashlib.sha256()
  for source in sorted((ROOT/'phone/lib').rglob('*.dart')):
   h.update(str(source.relative_to(ROOT)).encode());h.update(hashlib.sha256(source.read_bytes()).digest())
  h.update((ROOT/('phone/test/archive_count_locale_test.dart' if profile.startswith('counter-') else 'phone/test/review_element_matrix.dart')).read_bytes());build=h.hexdigest()[:16]
  for line in f.open():
   platform,tag,cycle,state,items=json.loads(line)
   for row in items:yield [profile,build,tag,cycle,state,row]
 else:
  with gzip.open(OUT/(profile+'.jsonl.gz'),'rt')as f:
   for line in f:yield json.loads(line)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('profiles',nargs='+');args=parser.parse_args()
 summary={};findings=[]
 with gzip.open(OUT/'rendered-five.jsonl.gz','wt',compresslevel=7)as target:
  for profile in args.profiles:
   seen={};snapshots=set();localeCoverage=collections.defaultdict(set);candidates=collections.Counter()
   grouped=collections.defaultdict(list)
   for variant,build,tag,cycle,state,row in contents(profile):
    grouped[(variant,build,tag,cycle,state)].append(row)
   for (variant,build,tag,cycle,state),items in grouped.items():
    snapshots.add((tag,cycle,state))
    native_labels={row['locator']:row['text'] for row in items if row['kind']=='label'}
    duplicate=collections.Counter()
    for row in items:
     stable=row['locator']
     if profile in ('ios-native-xctest','ios-cantonese-guard'):
      # Native accessibility order may move when a tab/menu reports an extra node.
      # Name + native element type + ordinal among identical siblings avoids confusing two different controls.
      label=native_labels.get(stable, row['text'] if row['kind'] in ('label','placeholder') else stable)
      anchor=(row.get('type'),label,row['kind'])
      duplicate[anchor]+=1
      stable='AX/'+str(row.get('type'))+'/'+label+'['+str(duplicate[anchor])+']'
      row['focus']={'name':label,'disabled':not row.get('enabled',True),'tag':row.get('type')}
     elif profile=='ios-simulator-engine' and state=='language-menu' and row['kind']=='accessibility-label':
      anchor=row['text'];duplicate[anchor]+=1;stable='menu semantics/'+anchor+'['+str(duplicate[anchor])+']'
     identity=(variant,build,tag,state,stable,row['kind'])
     if identity not in seen:seen[identity]={}
     seen[identity][cycle]=row
   complete=0;checks=0;issues=collections.Counter();cycle_counts=collections.Counter()
   for (variant,build,tag,state,loc,kind),obs in sorted(seen.items()):
    if set(obs)=={1,2,3,4,5}:complete+=1
    first=obs.get(1);text=(first or next(iter(obs.values())))['text'];result=[]
    for cycle in range(1,6):
     r=obs.get(cycle)
     if not r:result.append(['not-observed']);continue
     checks+=1;cycle_counts[cycle]+=1
     if cycle==1:
      review=['rect-present' if not r.get('emptyBox') else 'semantics-only-box' if kind in ('semantics-label','accessibility-label') else 'zero-area',r['bounds'],r.get('inView')]
     elif cycle==2:
      classification,ks=matches(tag,r['text']);review=[classification,ks]
      candidates[classification]+=1;localeCoverage[tag].update(ks)
     elif cycle==3:
      if r.get('clipped'):verdict='intentional-ellipsis' if r.get('ellipsis') else 'clipping-candidate'
      elif r.get('viewportOverflow'):verdict='scroll-exposes-control' if r.get('scrollable') else 'horizontal-overflow-candidate'
      else:verdict='within-measured-horizontal-bounds'
      review=[verdict,r['bounds']]
     elif cycle==4:
      focus=r.get('focus')
      if focus:review=['control-name-present' if focus['name'] else 'control-name-missing',focus]
      elif kind in ('tooltip','semantics-label','aria-label','placeholder','title','content-desc','accessibility-label'):review=['label-or-hint-observed',kind]
      else:review=['text-role-observed',kind]
     else:
      same=first is not None and normalize(first['text'])==normalize(r['text'])
      review=['same-as-first' if same else 'content-varies' if first else 'first-not-observed',hashlib.sha256(r['text'].encode()).hexdigest()[:12]]
     if review[0] in ('zero-area','source-language-candidate','clipping-candidate','horizontal-overflow-candidate','control-name-missing','content-varies'):
      issues[review[0]]+=1;findings.append([profile,tag,state,loc,kind,review[0],r['text'][:160],r['bounds']])
     result.append(review)
    target.write(json.dumps({'portal':variant,'build':build,'locale':tag,'pageState':state,'locator':loc,'role':kind,'text':text,'five':result,'observedPaths':{str(c):r['locator'] for c,r in obs.items() if r['locator']!=loc}},ensure_ascii=False,separators=(',',':'))+'\n')
   summary[profile]={'stateRenders':len(snapshots),'states':sorted({s for t,c,s in snapshots}),'locales':sorted({t for t,c,s in snapshots}),
     'uniqueLocaleStateElements':len(seen),'observedInAllFive':complete,'partialFive':len(seen)-complete,'cycleObservations':dict(cycle_counts),'reviews':checks,'candidates':issues,'copyClassifications':candidates,
     'distinctCatalogCandidatesByLocale':{k:len(v) for k,v in localeCoverage.items()}}
 (OUT/'render-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));(OUT/'review-candidates.json').write_text(json.dumps(findings,ensure_ascii=False,separators=(',',':')))
 print([(k,v['stateRenders'],v['observedInAllFive'],v['partialFive'],v['reviews']) for k,v in summary.items()])
if __name__=='__main__':main()
