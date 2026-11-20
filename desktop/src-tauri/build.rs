fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        cc::Build::new().file("src/screenshot_ocr.m").flag("-fobjc-arc").compile("screenshot_ocr");
        println!("cargo:rustc-link-lib=framework=Vision");
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rerun-if-changed=src/screenshot_ocr.m");
    }
    tauri_build::build()
}
