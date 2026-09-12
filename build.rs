fn main() {
    // Tauri の既定マニフェストには DPI の指定がない。tao が実行時にも設定してくれるが、
    // 拡大率がモニタごとに違う環境では起動直後の座標計算から効いていてほしいので、
    // Per-Monitor V2 をマニフェストで宣言しておく。
    let windows = tauri_build::WindowsAttributes::new()
        .app_manifest(include_str!("windows-app.manifest"));

    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
        .expect("Tauri のビルド設定に失敗しました")
}
