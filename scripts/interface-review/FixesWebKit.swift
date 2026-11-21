import AppKit
import WebKit
import Foundation
let args = CommandLine.arguments
let port=args[1], initCode=try String(contentsOfFile:args[2],encoding:.utf8), run=try String(contentsOfFile:args[3],encoding:.utf8)
let app=NSApplication.shared
let window=NSWindow(contentRect:NSRect(x:0,y:0,width:760,height:750),styleMask:[.titled],backing:.buffered,defer:false)
func makeView() -> WKWebView {
 let controller=WKUserContentController()
 controller.addUserScript(WKUserScript(source:initCode,injectionTime:.atDocumentStart,forMainFrameOnly:true))
 let config=WKWebViewConfiguration();config.websiteDataStore = .nonPersistent();config.userContentController=controller
 let view=WKWebView(frame:window.frame,configuration:config);window.contentView=view;window.orderFront(nil);return view
}
let tags=["en","zh-Hans","zh-Hant","yue","ja","ko","fr","de","es","pt"]
final class Delegate:NSObject,WKNavigationDelegate {
 var waiting=true
 func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){waiting=false}
}
let delegate=Delegate()
func wait(_ done:()->Bool){let until=Date().addingTimeInterval(14);while !done() && Date()<until{RunLoop.current.run(until:Date().addingTimeInterval(0.015))}}
var records=[[Any]]()
let pilot=ProcessInfo.processInfo.environment["DOCKIT_WK_PILOT"] != nil
let only=ProcessInfo.processInfo.environment["DOCKIT_WK_TAG"]
for tag in (only.map {[$0]} ?? (pilot ? ["fr"] : tags)) {for cycle in 1...(pilot ? 1 : 5) {for state in ["goals","focus"] {
 let view=makeView();view.navigationDelegate=delegate
 let target=state=="focus" ? "notebook":"components"
 delegate.waiting=true;view.load(URLRequest(url:URL(string:"http://127.0.0.1:\(port)/\(target)/?language=\(tag)&state=corrected-3")!));wait{!delegate.waiting}
 var finished=false
 view.callAsyncJavaScript(run,arguments:["state":state],in:nil,in:.page){result in
  switch result {case .success(let value):records.append([tag,cycle,state,value]);case .failure(let e):records.append([tag,cycle,state,e.localizedDescription])}
  finished=true
 };wait{finished}
 if !finished{records.append([tag,cycle,state,"WKWebView timed out"])}
 try JSONSerialization.data(withJSONObject:records).write(to:URL(fileURLWithPath:args[4]),options:.atomic)
}}}
let data=try JSONSerialization.data(withJSONObject:records);try data.write(to:URL(fileURLWithPath:args[4]))
