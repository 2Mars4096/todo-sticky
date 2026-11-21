// @vitest-environment happy-dom
import {act,createElement as h,useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {hostLanguage,subscribeLanguage,ui} from '../interfaceLocale';
import {AddTask} from '../components/AddTask';
it('reflects the host locale without a second picker and preserves the open editor',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}} as any;
  const container=document.createElement('div');document.body.append(container);
  const root=createRoot(container), save=vi.fn(), original=document.documentElement.lang;
  function Panel(){useSyncExternalStore(subscribeLanguage,hostLanguage,hostLanguage);return h(AddTask,{onAdd:save})}
  try{
    document.documentElement.lang='en';
    await act(async()=>root.render(h(Panel)));
    const field=container.querySelector('textarea')!;
    const change=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!;
    await act(async()=>{change.call(field,'Delete · 草稿');field.dispatchEvent(new Event('input',{bubbles:true}))});
    for(const tag of ['zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt','en']){
      await act(async()=>{document.documentElement.lang=tag;window.dispatchEvent(new Event('pipedreams:localechange'))});
      expect(hostLanguage()).toBe(tag);
      expect(container.querySelector('textarea')).toBe(field);
      expect(field.placeholder).toBe(ui('What needs doing?'));
      expect(field.value).toBe('Delete · 草稿');
      expect(container.querySelector('select')).toBeNull();
    }
  }finally{act(()=>root.unmount());document.documentElement.lang=original;container.remove()}
});
