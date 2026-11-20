import XCTest

class RunnerTests: XCTestCase {
  func testDockitIdentity() {
    XCTAssertEqual(Bundle.main.bundleIdentifier, "work.pipedreams.dockit")
    XCTAssertEqual(Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String, "Dockit")
  }
}
