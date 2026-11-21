import XCTest
final class DockitElements: XCTestCase {
 let tags=["en","zh-Hans","zh-Hant","yue","ja","ko","fr","de","es","pt"]
 let names=["English","简体中文","繁體中文","廣東話","日本語","한국어","Français","Deutsch","Español","Português"]
 let globe=["Display language","显示语言","顯示語言","顯示語言","表示言語","표시 언어","Langue d’affichage","Anzeigesprache","Idioma de visualización","Idioma de exibição"]
 let settings=["Settings","设置","設定","設定","設定","설정","Paramètres","Einstellungen","Ajustes","Configurações"]
   func capture(_ app:XCUIApplication,_ tag:String,_ cycle:Int,_ state:String)throws {
     var items=[[String:Any]]()
     func walk(_ n:XCUIElementSnapshot,_ path:String) {
       let rect=n.frame
       let fields=[("label",n.label),("value",n.value as? String ?? ""),("placeholder",n.placeholderValue ?? "")]
       for (role,text) in fields where !text.isEmpty {
         if rect.origin.x.isFinite && rect.origin.y.isFinite && rect.size.width.isFinite && rect.size.height.isFinite {
           items.append(["locator":path,"kind":role,"text":text,"bounds":[rect.minX,rect.minY,rect.width,rect.height],"emptyBox":rect.isEmpty,"inView":app.frame.intersects(rect),"enabled":n.isEnabled,"type":n.elementType.rawValue])
         }
       }
       for (i,c) in n.children.enumerated(){walk(c,path+"/"+String(c.elementType.rawValue)+"["+String(i)+"]")}
     }
     walk(try app.snapshot(),"window")
     let json=try JSONSerialization.data(withJSONObject:[tag,cycle,state,items])
     let attachment=XCTAttachment(data:json,uniformTypeIdentifier:"public.json");attachment.name="dockit-"+tag+"-"+String(cycle)+"-"+state;attachment.lifetime = .keepAlways;add(attachment)
   }

 func testFiveLocaleCycles() throws {
   let app=XCUIApplication(bundleIdentifier:"work.pipedreams.dockit")
   app.launchArguments=["-AppleLanguages","(en)"];app.launch()
   func find(_ s:String)->XCUIElement {app.descendants(matching:.any).matching(NSPredicate(format:"label == %@",s)).firstMatch}
   var current=0
   for (i,tag) in tags.enumerated() {
     app.terminate();app.launch()
     let opener=find(globe[current]);XCTAssertTrue(opener.waitForExistence(timeout:15));opener.tap()
     let item=find(names[i]);XCTAssertTrue(item.waitForExistence(timeout:5));item.tap();current=i
     if tag=="yue" || tag=="zh-Hant" {
       let expected = tag=="yue" ? "有咩要做？" : "有什麼事要做？"
       XCTAssertTrue(find(expected).waitForExistence(timeout:10),"Confirm script-specific content before restarting")
     }
     for cycle in 1...5 {
       app.terminate();app.launch();let button=find(globe[i]);XCTAssertTrue(button.waitForExistence(timeout:15))
       try capture(app,tag,cycle,"notebook");button.tap();XCTAssertTrue(find(names[i]).waitForExistence(timeout:5))
       try capture(app,tag,cycle,"language-menu");find(names[i]).tap()
       let pref=find(settings[i]);XCTAssertTrue(pref.waitForExistence(timeout:5));pref.tap()
       try capture(app,tag,cycle,"settings")
     }
   }
 }

 func testCantoneseRelaunchGuard() throws {
   continueAfterFailure=false
   let app=XCUIApplication(bundleIdentifier:"work.pipedreams.dockit")
   func element(_ name:String)->XCUIElement {app.descendants(matching:.any).matching(NSPredicate(format:"label == %@",name)).firstMatch}
   func choose(_ name:String,_ prompt:String) {
     let opener=app.descendants(matching:.any).matching(NSPredicate(format:"label IN %@",globe)).firstMatch
     XCTAssertTrue(opener.waitForExistence(timeout:15));opener.tap()
     XCTAssertTrue(element(name).waitForExistence(timeout:8));element(name).tap()
     XCTAssertTrue(element(prompt).waitForExistence(timeout:12),"Locale-specific task prompt failed: "+name)
   }
   app.launchArguments=["-AppleLanguages","(en)"];app.launch()
   for cycle in 1...5 {
     choose("繁體中文","有什麼事要做？");choose("廣東話","有咩要做？")
     app.terminate();app.launch()
     XCTAssertTrue(element("有咩要做？").waitForExistence(timeout:15),"Cantonese prompt did not persist")
     XCTAssertFalse(element("有什麼事要做？").exists,"Traditional-Chinese prompt remains")
     try capture(app,"yue",cycle,"notebook")
     element("顯示語言").tap();XCTAssertTrue(element("跟系統").waitForExistence(timeout:6))
     try capture(app,"yue",cycle,"language-menu");element("廣東話").tap()
     element("設定").tap();try capture(app,"yue",cycle,"settings");app.terminate();app.launch()
   }
 }
}
