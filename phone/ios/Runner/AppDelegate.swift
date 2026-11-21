import Flutter
import UIKit
import UniformTypeIdentifiers

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate, UIDocumentPickerDelegate {
  private var links: FlutterMethodChannel?
  private var pendingLink: String?
  private var pickerResult: FlutterResult?
  private var exportDirectory: URL?
  private let fileLimit = 20 * 1024 * 1024

  func didInitializeImplicitFlutterEngine(_ bridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: bridge.pluginRegistry)
    let messenger = bridge.applicationRegistrar.messenger()
    links = FlutterMethodChannel(name: "sticky_todo/links", binaryMessenger: messenger)
    links?.setMethodCallHandler { [weak self] call, result in
      guard let self else { return }
      switch call.method {
      case "take":
        result(pendingLink)
        pendingLink = nil
      case "openExternal":
        guard let raw = (call.arguments as? [String: String])?["url"],
              let url = URL(string: raw), url.scheme == "https", url.host != nil,
              url.user == nil, url.password == nil else { result(false); return }
        UIApplication.shared.open(url) { result($0) }
      default: result(FlutterMethodNotImplemented)
      }
    }
    FlutterMethodChannel(name: "sticky_todo/files", binaryMessenger: messenger)
      .setMethodCallHandler { [weak self] call, result in self?.pick(call, result: result) }
  }

  func receive(_ url: URL) {
    // Dart validates the complete task URI again before reading any record.
    guard url.user == nil, url.password == nil, url.port == nil,
          url.query == nil, url.fragment == nil else { return }
    let parts = url.path.split(separator: "/")
    let native = url.scheme == "todo-sticky" && url.host == "task" && parts.count == 1
    let web = url.scheme == "https" && url.host == "dockit.pipedreams.work" && parts.count == 2 && parts.first == "tasks"
    guard native || web else { return }
    pendingLink = url.absoluteString
    links?.invokeMethod("available", arguments: nil)
  }

  private func pick(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    guard pickerResult == nil else {
      result(FlutterError(code: "busy", message: "A document picker is open.", details: nil)); return
    }
    guard var presenter = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene })
      .flatMap({ $0.windows }).first(where: { $0.isKeyWindow })?.rootViewController else {
      result(FlutterError(code: "picker", message: "Open Dockit before choosing a file.", details: nil)); return
    }
    while let current = presenter.presentedViewController { presenter = current }
    let picker: UIDocumentPickerViewController
    do {
      switch call.method {
      case "read": picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json, .plainText], asCopy: true)
      case "write":
        guard let args = call.arguments as? [String: String], let filename = args["filename"],
              filename == (filename as NSString).lastPathComponent, !["", ".", ".."].contains(filename),
              let content = args["content"], content.utf8.count <= fileLimit else { throw CocoaError(.fileWriteInvalidFileName) }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
        exportDirectory = directory
        let source = directory.appendingPathComponent(filename)
        try content.write(to: source, atomically: true, encoding: .utf8)
        picker = UIDocumentPickerViewController(forExporting: [source], asCopy: true)
      default: result(FlutterMethodNotImplemented); return
      }
      picker.delegate = self
      pickerResult = result
      presenter.present(picker, animated: true)
    } catch {
      clearExport()
      result(FlutterError(code: "file", message: error.localizedDescription, details: nil))
    }
  }

  private func clearExport() {
    if let dir = exportDirectory { try? FileManager.default.removeItem(at: dir) }
    exportDirectory = nil
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    pickerResult?(nil); pickerResult = nil; clearExport()
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    defer { pickerResult = nil; clearExport() }
    guard exportDirectory == nil, let file = urls.first else { pickerResult?(nil); return }
    do {
      let size = try file.resourceValues(forKeys: [.fileSizeKey]).fileSize
      guard let size, size <= fileLimit else { throw CocoaError(.fileReadTooLarge) }
      pickerResult?(try String(contentsOf: file, encoding: .utf8))
    } catch { pickerResult?(FlutterError(code: "file", message: error.localizedDescription, details: nil)) }
  }
}
