const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../..'),plugin=path.join(root,'plugin'),out=path.join(root,'output/interface-five/embedded');
const resolve=(s)=>require.resolve(s,{paths:[plugin]});fs.mkdirSync(out,{recursive:true});
const host=path.join(plugin,'dev/test-host-sdk');
require(resolve('esbuild')).buildSync({entryPoints:[path.join(__dirname,'embedded-entry.tsx')],bundle:true,jsx:'automatic',format:'esm',platform:'browser',target:'es2022',outfile:path.join(out,'index.js'),
 alias:{'react-day-picker/style.css':resolve('react-day-picker/style.css'),'react-day-picker/locale':resolve('react-day-picker/locale'),'@diane/plugin-sdk/http':path.join(__dirname,'embedded-http.ts'),'@diane/plugin-sdk':host,react:path.join(plugin,'node_modules/react'),'react-dom':path.join(plugin,'node_modules/react-dom'),'lucide-react':path.join(plugin,'node_modules/lucide-react'),'date-fns':path.join(plugin,'node_modules/date-fns'),'react-day-picker':path.join(plugin,'node_modules/react-day-picker')},
 loader:{'.png':'dataurl'},minify:true,legalComments:'none',define:{'process.env.NODE_ENV':'"production"'}});
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><style>html,body,#mount,#review-ready{height:100%;width:100%;margin:0}#review-ready{position:relative;overflow:auto;box-sizing:border-box}</style><link rel="stylesheet" href="index.css"><div id="mount"></div><script type="module" src="index.js"></script></html>');
