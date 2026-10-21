// Isolated synthetic data only. No installed app, user archive, credentials, or live AI is used.
// Browser configuration: TODO_TEST_URL, PLAYWRIGHT_MODULE, CHROME_EXECUTABLE,
// CHROMIUM_ARGS (JSON string array), CHROME_LIBRARY_PATH, CHROME_FONTCONFIG_PATH.
const testUrl = (process.env.TODO_TEST_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
async function launch() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const args = process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : [];
  if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string')) throw new Error('CHROMIUM_ARGS must be a JSON array of strings');
  const env = { ...process.env };
  if (process.env.CHROME_LIBRARY_PATH) env.LD_LIBRARY_PATH = [process.env.CHROME_LIBRARY_PATH, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
  if (process.env.CHROME_FONTCONFIG_PATH) env.FONTCONFIG_PATH = process.env.CHROME_FONTCONFIG_PATH;
  return chromium.launch({ headless: true, args, env, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
}
async function screenshot(page, name) {
  if (!process.env.TODO_TEST_OUTPUT) return;
  const path = require('node:path');
  require('node:fs').mkdirSync(process.env.TODO_TEST_OUTPUT, { recursive: true });
  await page.screenshot({ path: path.join(process.env.TODO_TEST_OUTPUT, `${name}.png`) });
}

function seedBridge({ firstRun = false } = {}) {
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dated = offset => {const d=new Date();d.setDate(d.getDate()+offset);return iso(d)};
  const today = dated(0), yesterday = dated(-1), older = dated(-5);
  const task = (id,text,status='todo',subtasks=[],finish) => ({id,text,status,subtasks,...(finish?{finish}:{})});
  let restored = null;
  try { restored = JSON.parse(localStorage.getItem('todo-sticky-test-fixture-v1') || 'null'); } catch {}
  const sections = restored?.sections || {
    [today]: [
      task('release','Share the first usable todo-sticky release','partial',[
        task('release-test','Check capture and completion','done'),
        task('release-fix','Fix the blocking interaction'),
        task('release-show','Send a short demo to a colleague'),
      ],{doneWhen:'A colleague can capture, finish, and recover a task without help.',by:dated(2),originalBy:dated(2)}),
      task('dentist','Book a dentist appointment'),
      task('note','Send the research note for feedback','partial',[task('note-step','Attach the draft and one question','done')],{doneWhen:'A colleague has the draft and knows what feedback I need.',by:yesterday,originalBy:yesterday,reviewReady:true}),
      task('figures','Draft figures for the methods section','todo',[task('fig1','Choose the comparison'),task('fig2','Plot the main result')]),
      task('travel','Submit travel reimbursement','done'),
    ],
    [yesterday]: [task('prototype','Decide which prototype to continue','partial')],
    [older]: [task('landing','Clarify the project landing page promise')],
  };
  const settings=restored?.settings || {provider:'openrouter',apiBase:'https://openrouter.ai/api/v1',apiKey:'fixture-only',model:'fixture-model',providerProfiles:{},connectDiane:false,preferDianeCredentials:false,kbPath:'/fixture/tasks',machines:[]};
  const state={today,yesterday,older,sections,settings,star:restored?.star || null,calls:[],writes:[],firstRun:firstRun && !restored,failSave:false,suggestionDelayMs:120,scheduleDelayMs:0,scheduleResult:null};
  const persist = () => localStorage.setItem('todo-sticky-test-fixture-v1',JSON.stringify({sections,settings,star:state.star}));
  window.__review=state;
  localStorage.setItem('todo-sticky-ready-layout-v1','complete');
  if (!localStorage.getItem('todo-sticky-goals-v1')) localStorage.setItem('todo-sticky-goals-v1',JSON.stringify({sidebarCollapsed:true,targets:[{id:'g1',text:'Publish a useful research note',done:false},{id:'g2',text:'Build a tool someone returns to',done:false}],recurring:[{id:'r1',text:'Review the week',done:false},{id:'r2',text:'Read one paper',done:false}]}));
  let callbackId=0;const callbacks=new Map();
  window.isTauri=true;
  window.__TAURI_INTERNALS__={
    metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},
    transformCallback(cb){const id=++callbackId;callbacks.set(id,cb);return id},
    unregisterCallback(id){callbacks.delete(id)},
    convertFileSrc(p){return p},
    async invoke(cmd,args={}){
      state.calls.push({cmd,args:structuredClone(args)});
      if(cmd==='get_tasks')return {filePath:'fixture.md',weekStart:older,tasks:(sections[args.dateStr]||[]).map(t=>({...structuredClone(t),todaySubtasks:structuredClone(t.subtasks),otherSubtasks:[]}))};
      if(cmd==='task_api_extract')return {dates:Object.entries(sections).map(([date,tasks])=>({date,tasks:structuredClone(tasks),filePath:'fixture.md',weekStart:older,revision:'fixture'})),unavailableFiles:[]};
      if(cmd==='save_tasks'||cmd==='create_date_section'||cmd==='append_tasks_to_date'){
        if(state.failSave)throw Error('Fixture disk unavailable');
        sections[args.dateStr]=structuredClone(args.tasks);state.writes.push(structuredClone(args));persist();return {ok:true,filePath:'fixture.md',weekStart:older};
      }
      if(cmd==='push_task'){(sections[args.toDate]||=[]).push(structuredClone(args.taskSnapshot));persist();return {ok:true,filePath:'fixture.md'}}
      if(cmd==='get_settings')return structuredClone(settings);
      if(cmd==='save_settings'){Object.assign(settings,args.settings);state.firstRun=false;persist();return {ok:true}}
      if(cmd==='check_first_run')return state.firstRun;
      if(cmd==='get_star_focus_state')return state.star;
      if(cmd==='save_star_focus_state'){state.star=structuredClone(args.state);persist();return {ok:true}}
      if(cmd==='llm_breakdown'){
        await new Promise(r=>setTimeout(r,state.suggestionDelayMs));
        return {finishSuggestion:'The appointment is confirmed and added to my calendar.',subtasks:[{text:'Confirm the smallest useful result',estimatedMinutes:15},{text:'Show the result to one person',estimatedMinutes:15}]};
      }
      if(cmd==='llm_schedule'){const response=structuredClone(state.scheduleResult || {plan:'One work block proposed for today.',schedule:[{parentTask:'Draft figures for the methods section',action:'Plot the main result',time:'09:00',endTime:'09:30',assignedTo:'human'}]});await new Promise(r=>setTimeout(r,state.scheduleDelayMs));return response;}
      if(cmd==='diane_credential_status')return false;
      if(cmd==='test_connection')return {ok:true,message:'Fixture connection'};
      if(cmd==='plugin:app|version')return '2.1.11';
      if(cmd==='plugin:updater|check')return null;
      if(cmd==='plugin:event|listen'){const id=++callbackId;if(args.event==='file-changed')state.emitFileChanged=()=>callbacks.get(args.handler)?.({event:'file-changed',id,payload:null});return id;}
      if(cmd==='plugin:event|unlisten'||cmd.startsWith('plugin:window|'))return;
      if(cmd==='list_weekly_files')return [];
      if(cmd==='plugin:clipboard-manager|write_text')return;
      throw Error(`Unhandled fixture command: ${cmd}`);
    },
  };
  window.__TAURI_EVENT_PLUGIN_INTERNALS__={unregisterListener(){}};
}

module.exports = { seedBridge, launch, testUrl, screenshot };
