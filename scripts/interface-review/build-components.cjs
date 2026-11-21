const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..');
for(const profile of ['web','embedded']){
 const folder=profile==='web'?root:path.join(root,'plugin'),out=path.join(root,'output/interface-five/'+profile+'-components');fs.mkdirSync(out,{recursive:true});
 const resolve=s=>require.resolve(s,{paths:[folder]});
 const aliases={'review-components':path.join(root,profile==='web'?'web/src/components':'plugin/src/components'),'review-styles':path.join(root,profile==='web'?'web/src/styles':'plugin/src/styles'),'review-initialize':path.join(__dirname,profile==='web'?'component-web.ts':'component-plugin.ts'),'@diane/plugin-sdk/http':path.join(__dirname,'embedded-http.ts'),'@diane/plugin-sdk':path.join(root,'plugin/dev/test-host-sdk'),'react':path.join(folder,'node_modules/react'),'react-dom':path.join(folder,'node_modules/react-dom')};
 if(profile==='embedded'){aliases['react-day-picker/style.css']=resolve('react-day-picker/style.css');aliases['lucide-react']=path.join(folder,'node_modules/lucide-react')}
 require(resolve('esbuild')).buildSync({bundle:true,entryPoints:[path.join(__dirname,'component-entry.tsx')],outfile:path.join(out,'index.js'),format:'esm',jsx:'automatic',target:'es2022',alias:aliases,define:{'process.env.NODE_ENV':'"production"','__STICKY_SHARED_CUTOVER__':'false'},loader:{'.png':'dataurl'},minify:true});
 fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="index.css"><style>html,body,#mount,#review-ready{width:100%;height:100%;margin:0}#review-ready{max-width:720px;position:relative;overflow:auto}</style><div id="mount"></div><script type="module" src="index.js"></script>')
}
