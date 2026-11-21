from pathlib import Path
import collections,gzip,hashlib,json,shutil,sys
import reconcile as audit

ROOT=Path(__file__).resolve().parents[2]
output=ROOT/'output/interface-five'
archive=ROOT/'docs/reviews/25-interface-elements'
supp=archive/'supplemental-goal-focus'
supp.mkdir(parents=True,exist_ok=True)
audit.OUT=output/'supplemental-goal-focus';audit.OUT.mkdir(exist_ok=True)
shutil.copy2(output/'goal-focus.jsonl.gz',audit.OUT/'goal-focus.jsonl.gz')
sys.argv=['reconcile.py','goal-focus'];audit.main()
summary=json.loads((audit.OUT/'render-summary.json').read_text())['goal-focus']
stateRows=collections.defaultdict(list)
for l in gzip.open(output/'goal-focus.jsonl.gz','rt'):
 portal,build,locale,cycle,state,row=json.loads(l);stateRows[locale,cycle,state].append(row)
checks=collections.Counter()
phase_findings=[];count_findings=[]
recent=collections.Counter();full=collections.Counter()
tags=['en','zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt']
for tag in tags:
    c={} if tag=='en' else json.loads((ROOT/'phone/assets/interface'/(tag+'.json')).read_text())
    tr=lambda key:c.get(key,key)
    for cycle in range(1,6):
        def entries(state):return stateRows.get((tag,cycle,state),[])
        def texts(state):return [x['text'] for x in entries(state) if x['kind'].startswith('text')]
        def checked(test,result):checks[test+('/observed' if result else '/not-confirmed')]+=1
        checked('goal created','Fixture new goal' in texts('goal-created'))
        checked('reminder created','Fixture new reminder' in texts('routine-created'))
        checked('reminder cancelled','Fixture new reminder'in texts('reminder-edit-cancelled') and 'Fixture cancelled reminder' not in texts('reminder-edit-cancelled'))
        checked('date editor',any(r['kind']=='aria-label' and r['text']==tr('Due date')for r in entries('task-due-date-draft')))
        checked('date cancel',bool(entries('task-due-date-cancelled')))
        checked('finish review',tr('Complete') in texts('task-finish-review'))
        checked('save retry',tr('Retry save') in texts('notebook-save-failed') and 'Fixture retry capture' in texts('notebook-retry-committed'))
        checked('focus running',tr('Finish session') in texts('focus-running'))
        checked('focus paused',tr('Resume') in texts('focus-paused'))
        checked('focus resumed',tr('Pause') in texts('focus-resumed'))
        checked('focus completed','Book a dentist appointment' in texts('focus-completed'))
        for state,counts,expected in [('focus-recent-archive',recent,6),('focus-full-archive',full,10)]:
            n=sum(t=='Book a dentist appointment' or t.startswith('Fixture prior mission ')for t in texts(state));counts[n]+=1;checked(state,n==expected)
        if tag!='en':
            for st in ('focus-running','focus-paused','focus-resumed'):
                for row in entries(st):
                    if row['kind'].startswith('text') and row['text'] in ('Ignition','Ascent','Heating','Staging','Orbit'):
                        phase_findings.append([tag,cycle,st,row['locator'],row['text']])
        if tag in ('zh-Hans','zh-Hant','yue','fr','es','pt'):
            wanted=tr('{0} open').replace('{0}','3')
            for row in entries('goal-created'):
                if row['text']==wanted:count_findings.append([tag,cycle,row['locator'],row['text']])
matched=collections.defaultdict(set)
for line in gzip.open(audit.OUT/'rendered-five.jsonl.gz','rt'):
    row=json.loads(line);translation=row['five'][1]
    if translation[0]in('catalog-literal','catalog-template'):
        for key in translation[1]:matched[row['locale'],key].add(row['pageState'])
new=[]
for line in gzip.open(archive/'source-render-links.jsonl.gz','rt'):
    row=json.loads(line);hits=matched[row['locale'],row['key']]
    if row['portal']=='standalone-react' and row['relation']=='no-candidate-on-captured-states' and hits:
        new.append({**row,'supplementalCandidateStates':sorted(hits)})
for name in ['rendered-five.jsonl.gz','render-summary.json']:
    shutil.copy2(audit.OUT/name,supp/name)
shutil.copy2(output/'goal-focus.jsonl.gz',supp/'observations.jsonl.gz')
shutil.copy2(output/'goal-focus-gaps.json',supp/'navigation-gaps.json')
for name,data in [('source-candidates.jsonl.gz',new),('phase-name-findings.jsonl.gz',phase_findings),('goal-count-findings.jsonl.gz',count_findings)]:
    with gzip.open(supp/name,'wt',encoding='utf8')as f:
        for r in data:f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
for filename in ['yue-focus-paused.png','yue-focus-full-archive.png','fr-reminder-editor-draft.png','fr-notebook-save-failed.png']:
    if (output/filename).is_file():shutil.copy2(output/filename,supp/filename)
extra={'build':build,'functionalStateChecks':dict(checks),'visibleHistoryRows':{'recent':dict(recent),'full':dict(full)},'newCandidateCells':len(new),'rawPhaseNameOccurrences':len(phase_findings),'openCountFindingOccurrences':len(count_findings),'nonEnglishPhaseLocales':sorted({r[0] for r in phase_findings}),'countFindingLocales':sorted({r[0]for r in count_findings})}
(supp/'workflow-evidence.json').write_text(json.dumps(extra,ensure_ascii=False,indent=2))
(supp/'SHA256SUMS').write_text(''.join(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+f.name+'\n' for f in sorted(supp.iterdir())if f.is_file()and f.name!='SHA256SUMS'))
print('CHECKS',checks,'prior missions',recent,full,'new candidate cells',len(new),'raw phase occurrences',len(phase_findings),'count examples',len(count_findings))
