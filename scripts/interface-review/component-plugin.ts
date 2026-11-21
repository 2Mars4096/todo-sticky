import {setTestScope,pluginApi} from '../../plugin/dev/test-host-sdk/client';
export async function setup(f:any){setTestScope('synthetic-scope');(globalThis as any).projectReviewFixture=f;Object.assign(pluginApi,{settings:async()=>({enabled:true}),list:async()=>({items:[]})})}
