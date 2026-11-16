// @vitest-environment happy-dom
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { MeetingMonitor, type ReviewRequest } from '../MeetingMonitor';

it('loads reviews without opening Meeting and adds a cited draft once', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement('div'), root = createRoot(host);
  const request = vi.fn(async (path: string, body?: unknown) => {
    if (body && !path.endsWith('/refresh')) return {};
    if (path.endsWith('/refresh')) return {before:null, reviews:[
      {meeting_id:'m', analysis_id:'a', title:'Planning', count:1, indices:[0]},
      {meeting_id:'z', analysis_id:'b', title:'Updates', count:0, indices:[]}]};
    return {analysis_id:'a', transcript_revision:2, analysis_fingerprint:'digest',
      actions:[{text:'I will send notes.', todo_text:'Send notes', evidence:[{quote:'I will send notes.'}]}]};
  });
  const added = vi.fn();
  const button = (label:string) => [...host.querySelectorAll('button')].find(b => b.textContent?.includes(label))!;
  try {
    await act(async () => root.render(h(MeetingMonitor, {request: request as ReviewRequest, onAdded:added})));
    expect(host.textContent).toContain('Reviewed · no follow-ups');
    await act(async () => button('Planning').click());
    expect(host.textContent).toContain('I will send notes.');
    await act(async () => button('Add to today').click());
    expect(request.mock.calls.at(-1)?.[1]).toMatchObject({transcript_revision:2,actions:[{index:0,text:'Send notes'}]});
    expect(host.textContent).toContain('Added to Todo');
    expect(button('Add to today')).toBeUndefined();
    expect(added).toHaveBeenCalledOnce();
  } finally {act(() => root.unmount());}
});

it('preserves selected steps across collapse and sends them in meeting order', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement('div'), root = createRoot(host);
  const request = vi.fn(async (path:string, body?:unknown) => {
    if (path.endsWith('/refresh')) return {before:null, reviews:[
      {meeting_id:'m', analysis_id:'a', title:'Planning', count:3, indices:[0,1,2]}]};
    if (body) return {};
    return {analysis_id:'a', analysis_fingerprint:'digest', transcript_revision:1,
      actions:['First','Second','Third'].map(text => ({text, evidence:[]}))};
  });
  try {
    await act(async () => root.render(h(MeetingMonitor, {request:request as ReviewRequest, onAdded:vi.fn()})));
    const row = host.querySelector<HTMLButtonElement>('.meeting-trigger')!;
    await act(async () => row.click());
    const inputs = host.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
    await act(async () => inputs[2].click());
    await act(async () => inputs[0].click());
    await act(async () => row.click());
    await act(async () => row.click());
    expect(inputs[2].checked).toBe(true);
    const add = host.querySelector<HTMLButtonElement>('.meeting-commit button')!;
    expect(add.textContent).toBe('Add 2 to today');
    await act(async () => add.click());
    expect(request.mock.calls.at(-1)?.[1]).toMatchObject({actions:[{index:0},{index:2}]});
  } finally { act(() => root.unmount()); }
});

it('appends older meetings without closing the current review or losing its selection',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  const host=document.createElement('div'),root=createRoot(host);
  const recent={meeting_id:'m',analysis_id:'a',title:'Recent meeting',count:2,indices:[0,1]};
  const older={...recent,meeting_id:'o',analysis_id:'b',title:'Older meeting'};
  const request=vi.fn(async(path:string)=>{
    if(path.endsWith('/refresh')) return {reviews:[recent],before:10};
    if(path.includes('?before=10')) return {reviews:[recent,older],before:null};
    return {analysis_id:'a',actions:[{text:'First',evidence:[]},{text:'Second',evidence:[]}]};
  });
  try {
    await act(async()=>root.render(h(MeetingMonitor,{request:request as ReviewRequest,onAdded:vi.fn()})));
    const row=host.querySelector<HTMLButtonElement>('.meeting-trigger')!;
    await act(async()=>row.click());
    const choice=host.querySelector<HTMLInputElement>('input')!;
    await act(async()=>choice.click());
    const more=[...host.querySelectorAll('button')].find(b=>b.textContent==='Older reviews')!;
    await act(async()=>more.click());
    expect(host.querySelectorAll('.meeting-trigger')).toHaveLength(2);
    expect(host.querySelector('.meeting-trigger')).toBe(row);
    expect(choice.checked).toBe(true);
    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(host.textContent).not.toContain('Latest reviews');
  } finally {act(()=>root.unmount());}
});

it('dismisses a collapsed meeting with one trash click and keeps other reviews', async () => {
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT:true});
  const host=document.createElement('div'), root=createRoot(host);
  const reviews=['Planning','Other meeting','Previously dismissed'].map((title,i)=>({
    title, meeting_id:'m'+i, analysis_id:'a'+i, sequence:i+1, count:2, indices:[0,1], cleared:i===2,
  }));
  const request=vi.fn(async (path:string, body?:unknown) =>
    path.endsWith('/clear') && body ? {} : {head:3,reviews,before:null});
  try {
    await act(async()=>root.render(h(MeetingMonitor,{request:request as ReviewRequest,onAdded:vi.fn()})));
    expect(host.textContent).not.toContain('Previously dismissed');
    const trash=host.querySelector<HTMLButtonElement>('[aria-label="Dismiss follow-ups: Planning"]')!;
    await act(async()=>trash.click());
    expect(request.mock.calls.at(-1)).toEqual(['/api/plugins/todo/meeting-monitor/todo-reviews/clear',{through:1,meeting_id:'m0'}]);
    expect(host.querySelectorAll('.meeting-trigger')).toHaveLength(1);
    expect(host.textContent).toContain('Other meeting');
    expect(host.querySelector('.meeting-clear-confirm')).toBeNull();
  } finally {act(()=>root.unmount());}
});
