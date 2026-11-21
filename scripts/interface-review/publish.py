"""Publish compact reproducible ledgers and an explicit coverage boundary for this local build."""
from pathlib import Path
import collections,gzip,json,hashlib,shutil,csv
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/interface-five';PUB=ROOT/'docs/reviews/25-interface-elements';PUB.mkdir(parents=True,exist_ok=True)
summary=json.loads((OUT/'render-summary.json').read_text())
static=json.loads((OUT/'source-summary.json').read_text())
for name in ['rendered-five.jsonl.gz','source-five.jsonl.gz','render-summary.json','source-summary.json','android-release-signing.json','ios-simulator-engine-receipt.json','ios-cantonese-guard-receipt.json','mac-native-debug-receipt.json','android-restore.json','parity.json']:
 p=OUT/name
 if p.exists():shutil.copy2(p,PUB/name)
flags=collections.Counter();labels=collections.defaultdict(lambda:collections.defaultdict(set));targets=collections.defaultdict(set);iosmenu=collections.defaultdict(set);partial=[]
with gzip.open(OUT/'rendered-five.jsonl.gz','rt')as f:
 for line in f:
  r=json.loads(line);t=r['locale'];p=r['portal'];stage=r['pageState'];five=r['five']
  for check in five:flags[check[0]]+=1
  if five[1][0] in ['catalog-literal','catalog-template']:
   for k in five[1][1]:labels[(p,t)][k].add(stage)
  if p=='ios-native-xctest' and stage=='language-menu' and r['role']=='label':
   for i,v in enumerate(five):
    if v[0]!='not-observed':iosmenu[(t,r['text'])].add(i+1)
  if any(c[0]=='not-observed'for c in five):partial.append((r['portal'],t,stage,r['role'],r['text'],r['locator'],[i+1 for i,x in enumerate(five) if x[0]=='not-observed']))
portals={'standalone-react':['web-wide','web-compact','web-components','account-fixture','mac-shared','mac-native-debug'],'embedded-plugin':['embedded','embedded-components'],'legacy-signin':['signin'],'flutter':['flutter-android','flutter-iOS','android-installed','ios-native-xctest','ios-cantonese-guard','ios-simulator-engine','counter-android','counter-iOS'],'flutter/native-channel':['flutter-android','flutter-iOS','android-installed','ios-native-xctest','ios-cantonese-guard','ios-simulator-engine','counter-android','counter-iOS']}
portals['native-document-channel']=['flutter-android','flutter-iOS','android-installed','ios-native-xctest','ios-simulator-engine']
portals['native-desktop-boot']=['mac-native-debug']
resolved=collections.Counter();unmatched=collections.Counter()
with gzip.open(OUT/'source-five.jsonl.gz','rt')as inp,gzip.open(PUB/'source-render-links.jsonl.gz','wt',compresslevel=9)as out:
 for line in inp:
  r=json.loads(line);key=r['key'];evidence={p:sorted(labels[(p,r['locale'])].get(key,set()))for p in portals.get(r['portal'],[]) if labels[(p,r['locale'])].get(key)}
  label='literal-or-template-candidate' if evidence else 'runtime-only-value' if key is None else 'no-candidate-on-captured-states'
  resolved[label]+=1
  if not evidence:unmatched[(r['portal'],r['file'])]+=1
  out.write(json.dumps({'id':r['id'],'span':r['span'][:2],'file':r['file'],'locale':r['locale'],'portal':r['portal'],'key':key,'relation':label,'candidatePages':evidence},ensure_ascii=False,separators=(',',':'))+'\n')
with gzip.open(PUB/'partial-elements.jsonl.gz','wt')as out:
 for p,t,s,role,v,loc,missing in partial:
  out.write(json.dumps({'portal':p,'locale':t,'state':s,'role':role,'value':v,'locator':loc,'missingCycles':missing,'separateNativeMenuWitnessCycles':sorted(iosmenu[t,v]) if p=='ios-simulator-engine'and s=='language-menu'else []},ensure_ascii=False,separators=(',',':'))+'\n')
with gzip.open(PUB/'candidate-findings.jsonl.gz','wt')as f:
 for row in json.loads((OUT/'review-candidates.json').read_text()):f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
with (PUB/'state-coverage.csv').open('w',newline='')as f:
 write=csv.writer(f);write.writerow(['variant','state renders','logical locale/state elements','five observed','partial','actual cycle observations','state names'])
 for p,r in summary.items():write.writerow([p,r['stateRenders'],r['uniqueLocaleStateElements'],r['observedInAllFive'],r['partialFive'],r['reviews'],' | '.join(r['states'])])
totals={k:sum(r[k]for r in summary.values()) for k in ['stateRenders','uniqueLocaleStateElements','observedInAllFive','partialFive','reviews']}
rc={'source':static,'rendered':totals,'sourceCandidateRelations':dict(resolved),'cycleOutcomes':dict(flags),'evidenceByProfile':summary}
(PUB/'review-summary.json').write_text(json.dumps(rc,ensure_ascii=False,indent=2))
checksums={}
for p in PUB.iterdir():
 if p.is_file() and p.name!='SHA256SUMS':checksums[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
(PUB/'SHA256SUMS').write_text(''.join(checksums[n]+'  '+n+'\n'for n in sorted(checksums)))
print(totals);print('source-to-render candidate relations',resolved)
