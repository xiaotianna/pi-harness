fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["open_external_url"])),
    )
    .expect("failed to build Tauri application manifest")
}
