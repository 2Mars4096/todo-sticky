// @vitest-environment happy-dom
import {act,createElement as h} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {TodoSettings} from '../TodoSettings';
it('preserves machine drafts across sections and routes AI settings explicitly',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const el=document.createElement('div');document.body.append(el);const root=createRoot(el),open=vi.fn();window.addEventListener('diane:plugin-settings',open);
 try{await act(async()=>root.render(h(TodoSettings,{machines:h('input',{'aria-label':'Machine name',defaultValue:'Server'}),backups:h('button',null,'Export backup')})));
 const input=el.querySelector('input')!;input.value='Unsaved machine';const button=(text:string)=>Array.from(el.querySelectorAll('button')).find(b=>b.textContent===text)!;
 await act(async()=>button('Backups').click());expect(input.closest('[hidden]')).not.toBeNull();expect(open).not.toHaveBeenCalled();
 await act(async()=>button('Machines').click());expect(el.querySelector('input')).toBe(input);expect(input.value).toBe('Unsaved machine');expect(input.closest('[hidden]')).toBeNull();
 await act(async()=>button('AI settings').click());expect(open).toHaveBeenCalledOnce();expect((open.mock.calls[0][0] as CustomEvent).detail).toEqual({section:'ai'});
 }finally{await act(async()=>root.unmount());el.remove();window.removeEventListener('diane:plugin-settings',open);}
});
