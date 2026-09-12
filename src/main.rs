// リリースビルドではコンソールウィンドウを出さない
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod store;
mod switchbot;

use serde_json::Value;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use store::{AcState, Config};
use switchbot::{Device, SwitchBot};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, State, WindowEvent};

/// 自動起動から立ち上がったときはウィンドウを出さずトレイに常駐させる
const ARG_HIDDEN: &str = "--hidden";

/// ドラッグが終わったとみなすまでの待ち時間
const SNAP_SETTLE: Duration = Duration::from_millis(140);
/// 端からこの距離（論理ピクセル）以内なら吸着する
const SNAP_THRESHOLD: f64 = 24.0;
/// モニタ同士が接していると判断する誤差（物理ピクセル）
const ADJACENCY_TOLERANCE: i32 = 2;

/// ドラッグ中は Moved が連続して届くので、動きが止まってから 1 回だけ吸着させる。
/// 監視スレッドは同時に 1 本しか動かさない。
#[derive(Default)]
struct SnapWatcher {
    moves: AtomicU64,
    watching: AtomicBool,
}

struct AppState {
    client: Mutex<Option<SwitchBot>>,
    config: Mutex<Config>,
    config_path: PathBuf,
    snap: SnapWatcher,
}

impl AppState {
    fn config(&self) -> Config {
        self.config
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    fn edit_config(&self, f: impl FnOnce(&mut Config)) -> Config {
        let mut guard = self.config.lock().unwrap_or_else(|e| e.into_inner());
        f(&mut guard);
        guard.sanitize();
        guard.clone()
    }

    fn persist(&self) {
        let cfg = self.config();
        if let Err(e) = cfg.save(&self.config_path) {
            eprintln!("設定の保存に失敗しました: {e}");
        }
    }

    /// API クライアントを複製して返す。ロックを await をまたいで持たないための入口。
    fn client(&self) -> Result<SwitchBot, String> {
        self.client
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
            .ok_or_else(|| "トークンが未設定です。設定画面から登録してください".to_string())
    }
}

// ---- コマンド -------------------------------------------------------------

#[tauri::command]
fn is_configured(state: State<'_, AppState>) -> bool {
    state
        .client
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .is_some()
}

#[tauri::command]
async fn save_credentials(
    token: String,
    secret: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let token = token.trim().to_string();
    let secret = secret.trim().to_string();
    if token.is_empty() || secret.is_empty() {
        return Err("トークンとシークレットの両方を入力してください".into());
    }

    // 保存する前に実際に API が通るか確かめる
    let sb = SwitchBot::new(token.clone(), secret.clone());
    sb.devices().await.map_err(|e| e.to_string())?;

    store::save_credentials(&token, &secret)
        .map_err(|e| format!("資格情報を保存できません: {e}"))?;
    *state.client.lock().unwrap_or_else(|e| e.into_inner()) = Some(sb);
    Ok(())
}

#[tauri::command]
fn forget_credentials(state: State<'_, AppState>) -> Result<(), String> {
    store::clear_credentials().map_err(|e| e.to_string())?;
    *state.client.lock().unwrap_or_else(|e| e.into_inner()) = None;
    Ok(())
}

#[tauri::command]
async fn list_devices(state: State<'_, AppState>) -> Result<Vec<Device>, String> {
    let sb = state.client()?;
    sb.devices().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn device_status(device_id: String, state: State<'_, AppState>) -> Result<Value, String> {
    let sb = state.client()?;
    sb.status(&device_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_command(
    device_id: String,
    command: String,
    parameter: Option<Value>,
    command_type: Option<String>,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let sb = state.client()?;
    sb.command(
        &device_id,
        &command,
        parameter.unwrap_or(Value::Null),
        command_type.as_deref().unwrap_or("command"),
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_config(state: State<'_, AppState>) -> Config {
    state.config()
}

#[tauri::command]
fn set_config(config: Config, app: AppHandle, state: State<'_, AppState>) -> Result<Config, String> {
    let previous = state.config();
    let updated = state.edit_config(|c| *c = config);

    if updated.always_on_top != previous.always_on_top {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.set_always_on_top(updated.always_on_top);
        }
    }
    if updated.launch_at_login != previous.launch_at_login {
        if let Err(e) = store::set_launch_at_login(updated.launch_at_login) {
            // 設定値だけ元に戻し、UI にはエラーを返す
            state.edit_config(|c| c.launch_at_login = previous.launch_at_login);
            return Err(e.to_string());
        }
    }
    state.persist();
    Ok(updated)
}

/// 赤外線エアコンは状態を読み出せないため、送った内容をローカルに覚えておく。
#[tauri::command]
fn remember_ac(device_id: String, ac: AcState, state: State<'_, AppState>) -> Config {
    let cfg = state.edit_config(|c| {
        c.ac_state.insert(device_id, ac);
    });
    state.persist();
    cfg
}

#[tauri::command]
fn hide_window(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

// ---- ウィンドウとトレイ ---------------------------------------------------

fn toggle_window(app: &AppHandle) {
    let Some(w) = app.get_webview_window("main") else {
        return;
    };
    if w.is_visible().unwrap_or(false) {
        let _ = w.hide();
    } else {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn show_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle = MenuItem::with_id(app, "toggle", "表示 / 非表示", true, None::<&str>)?;
    let refresh = MenuItem::with_id(app, "refresh", "デバイスを更新", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "設定…", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &toggle,
            &refresh,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("SwitchBot Widget")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "toggle" => toggle_window(app),
            "refresh" => {
                show_window(app);
                let _ = app.emit("widget://action", "refresh");
            }
            "settings" => {
                show_window(app);
                let _ = app.emit("widget://action", "settings");
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

/// 前回の位置とサイズを復元する。モニタ構成が変わって画面外になる場合は中央に戻す。
fn restore_geometry(win: &tauri::WebviewWindow, cfg: &Config) {
    let _ = win.set_size(LogicalSize::new(cfg.window_w, cfg.window_h));

    if let (Some(x), Some(y)) = (cfg.window_x, cfg.window_y) {
        if is_on_screen(win, x, y) {
            let _ = win.set_position(PhysicalPosition::new(x as i32, y as i32));
            return;
        }
    }
    place_default(win, cfg);
}

/// 初回起動時はカーソルのあるモニタの右下に寄せる。
/// ウィンドウ作成直後は outer_size() が更新前の値を返すことがあるため、
/// 設定値とモニタの倍率から実寸を割り出して配置する。
fn place_default(win: &tauri::WebviewWindow, cfg: &Config) {
    let Ok(Some(monitor)) = win.current_monitor() else {
        let _ = win.center();
        return;
    };
    let scale = monitor.scale_factor();
    let area = monitor.work_area();
    let margin = (24.0 * scale) as i32;
    let w = (cfg.window_w * scale) as i32;
    let h = (cfg.window_h * scale) as i32;

    let x = area.position.x + (area.size.width as i32 - w - margin).max(0);
    let y = area.position.y + (area.size.height as i32 - h - margin).max(0);
    let _ = win.set_position(PhysicalPosition::new(x, y));
}

fn is_on_screen(win: &tauri::WebviewWindow, x: f64, y: f64) -> bool {
    let Ok(monitors) = win.available_monitors() else {
        return false;
    };
    monitors.iter().any(|m| {
        let p = m.position();
        let s = m.size();
        let (left, top) = (p.x as f64, p.y as f64);
        let (right, bottom) = (left + s.width as f64, top + s.height as f64);
        // ドラッグでつかめる程度の領域が画面内に残っていれば有効とみなす
        x + 80.0 > left && x + 40.0 < right && y + 40.0 > top && y + 20.0 < bottom
    })
}

#[derive(Clone, Copy)]
enum Edge {
    Left,
    Right,
    Top,
    Bottom,
}

/// ウィンドウが動くたびに呼ばれる。動きが止まってから吸着処理を 1 回だけ走らせる。
fn watch_for_drag_end(app: &AppHandle, win: &tauri::WebviewWindow) {
    let state = app.state::<AppState>();
    state.snap.moves.fetch_add(1, Ordering::SeqCst);
    // 既に見張っているなら、回数を増やすだけでよい
    if state.snap.watching.swap(true, Ordering::SeqCst) {
        return;
    }

    let app = app.clone();
    let win = win.clone();
    std::thread::spawn(move || {
        loop {
            let before = app.state::<AppState>().snap.moves.load(Ordering::SeqCst);
            std::thread::sleep(SNAP_SETTLE);
            if app.state::<AppState>().snap.moves.load(Ordering::SeqCst) == before {
                break;
            }
        }
        app.state::<AppState>().snap.watching.store(false, Ordering::SeqCst);
        snap_to_edges(&win);
    });
}

/// ウィンドウがいるモニタの作業領域に対して、近い辺へ吸着させる。
/// 隣にモニタが接している辺は、画面をまたぐ移動を妨げてしまうので対象にしない。
fn snap_to_edges(win: &tauri::WebviewWindow) {
    let (Ok(Some(monitor)), Ok(position), Ok(size), Ok(monitors)) = (
        win.current_monitor(),
        win.outer_position(),
        win.outer_size(),
        win.available_monitors(),
    ) else {
        return;
    };

    let area = monitor.work_area();
    let threshold = (SNAP_THRESHOLD * monitor.scale_factor()).round() as i32;
    let (win_w, win_h) = (size.width as i32, size.height as i32);

    let left = area.position.x;
    let top = area.position.y;
    let right = left + area.size.width as i32;
    let bottom = top + area.size.height as i32;

    let window = (
        position.x,
        position.y,
        position.x + win_w,
        position.y + win_h,
    );
    let shared = [
        edge_touches_monitor(&monitors, &monitor, window, Edge::Left),
        edge_touches_monitor(&monitors, &monitor, window, Edge::Right),
        edge_touches_monitor(&monitors, &monitor, window, Edge::Top),
        edge_touches_monitor(&monitors, &monitor, window, Edge::Bottom),
    ];

    let (x, y) = snapped_position(
        (position.x, position.y),
        (win_w, win_h),
        (left, top, right, bottom),
        threshold,
        shared,
    );

    if x != position.x || y != position.y {
        let _ = win.set_position(PhysicalPosition::new(x, y));
    }
}

/// 吸着後の座標を求める。
/// `shared` は Left / Right / Top / Bottom の順で「その辺の外に別のモニタが接しているか」。
/// 接している辺は画面をまたぐ移動を妨げるので吸着させない。
fn snapped_position(
    position: (i32, i32),
    window: (i32, i32),
    area: (i32, i32, i32, i32),
    threshold: i32,
    shared: [bool; 4],
) -> (i32, i32) {
    let (mut x, mut y) = position;
    let (win_w, win_h) = window;
    let (left, top, right, bottom) = area;

    if !shared[0] && (x - left).abs() <= threshold {
        x = left;
    } else if !shared[1] && (x + win_w - right).abs() <= threshold {
        x = right - win_w;
    }

    if !shared[2] && (y - top).abs() <= threshold {
        y = top;
    } else if !shared[3] && (y + win_h - bottom).abs() <= threshold {
        y = bottom - win_h;
    }

    (x, y)
}

/// その辺のすぐ外側に別のモニタが接しているか。
/// 作業領域ではなくモニタ全体で見る（タスクバーの分だけずれるため）。
fn edge_touches_monitor(
    monitors: &[tauri::window::Monitor],
    me: &tauri::window::Monitor,
    window: (i32, i32, i32, i32),
    edge: Edge,
) -> bool {
    let origin = me.position();
    let size = me.size();
    let mine = (
        origin.x,
        origin.y,
        origin.x + size.width as i32,
        origin.y + size.height as i32,
    );

    monitors.iter().any(|other| {
        let other_origin = other.position();
        let other_size = other.size();
        let rect = (
            other_origin.x,
            other_origin.y,
            other_origin.x + other_size.width as i32,
            other_origin.y + other_size.height as i32,
        );
        // 自分自身は数えない
        if rect == mine {
            return false;
        }
        blocks_snap(mine, rect, window, edge)
    })
}

/// 隣のモニタがその辺に接していて、さらにウィンドウが接触している区間にかかっているか。
/// かかっているなら、そこへ吸着させると画面をまたぐ移動を妨げてしまう。
fn blocks_snap(
    me: (i32, i32, i32, i32),
    other: (i32, i32, i32, i32),
    window: (i32, i32, i32, i32),
    edge: Edge,
) -> bool {
    let (my_left, my_top, my_right, my_bottom) = me;
    let (left, top, right, bottom) = other;
    let (win_left, win_top, win_right, win_bottom) = window;

    let spans_vertically = top < win_bottom && bottom > win_top;
    let spans_horizontally = left < win_right && right > win_left;

    match edge {
        Edge::Left => spans_vertically && (right - my_left).abs() <= ADJACENCY_TOLERANCE,
        Edge::Right => spans_vertically && (left - my_right).abs() <= ADJACENCY_TOLERANCE,
        Edge::Top => spans_horizontally && (bottom - my_top).abs() <= ADJACENCY_TOLERANCE,
        Edge::Bottom => spans_horizontally && (top - my_bottom).abs() <= ADJACENCY_TOLERANCE,
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            is_configured,
            save_credentials,
            forget_credentials,
            list_devices,
            device_status,
            run_command,
            get_config,
            set_config,
            remember_ac,
            hide_window,
            quit_app,
        ])
        .setup(|app| {
            let dir = app.path().app_config_dir()?;
            let config_path = store::config_path(dir);
            let mut cfg = Config::load(&config_path);
            cfg.sanitize();

            let client = store::load_credentials().map(|(t, s)| SwitchBot::new(t, s));
            app.manage(AppState {
                client: Mutex::new(client),
                config: Mutex::new(cfg.clone()),
                config_path,
                snap: SnapWatcher::default(),
            });

            build_tray(app.handle())?;

            if let Some(win) = app.get_webview_window("main") {
                restore_geometry(&win, &cfg);
                let _ = win.set_always_on_top(cfg.always_on_top);

                if !std::env::args().any(|a| a == ARG_HIDDEN) {
                    let _ = win.show();
                }

                let handle = app.handle().clone();
                let geometry_source = win.clone();
                win.on_window_event(move |event| match event {
                    // 閉じるボタンでは終了せずトレイに戻す
                    WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                        let _ = geometry_source.hide();
                    }
                    WindowEvent::Moved(pos) => {
                        let (x, y) = (pos.x as f64, pos.y as f64);
                        let state = handle.state::<AppState>();
                        state.edit_config(|c| {
                            c.window_x = Some(x);
                            c.window_y = Some(y);
                        });
                        if state.config().snap_to_edges {
                            watch_for_drag_end(&handle, &geometry_source);
                        }
                    }
                    WindowEvent::Resized(size) => {
                        let scale = geometry_source.scale_factor().unwrap_or(1.0);
                        let (w, h) = (size.width as f64 / scale, size.height as f64 / scale);
                        // 最小化すると 0 が飛んでくるので無視する
                        if w > 1.0 && h > 1.0 {
                            let state = handle.state::<AppState>();
                            state.edit_config(|c| {
                                c.window_w = w;
                                c.window_h = h;
                            });
                            if state.config().snap_to_edges {
                                watch_for_drag_end(&handle, &geometry_source);
                            }
                        }
                    }
                    _ => {}
                });
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("アプリケーションの初期化に失敗しました")
        .run(|app, event| match event {
            // ウィンドウを閉じただけでは終了しない（トレイ常駐を維持）
            tauri::RunEvent::ExitRequested { api, code, .. } if code.is_none() => {
                api.prevent_exit();
            }
            // 位置とサイズはここでまとめて書き出す
            tauri::RunEvent::Exit => {
                app.state::<AppState>().persist();
            }
            _ => {}
        });
}

#[cfg(test)]
mod tests {
    use super::snapped_position;

    /// 3840x2160 のモニタ（下 84px はタスクバー）に 600x900 のウィンドウ
    const AREA: (i32, i32, i32, i32) = (0, 0, 3840, 2076);
    const WINDOW: (i32, i32) = (600, 900);
    const THRESHOLD: i32 = 42;
    const FREE: [bool; 4] = [false; 4];

    #[test]
    fn 端に近ければ吸着する() {
        assert_eq!(snapped_position((10, 500), WINDOW, AREA, THRESHOLD, FREE), (0, 500));
        assert_eq!(snapped_position((500, 25), WINDOW, AREA, THRESHOLD, FREE), (500, 0));
    }

    #[test]
    fn 離れていればそのまま置く() {
        assert_eq!(snapped_position((200, 500), WINDOW, AREA, THRESHOLD, FREE), (200, 500));
    }

    #[test]
    fn 角では縦横どちらにも吸着する() {
        // 右下の角へ。下端はタスクバーを避けた作業領域に合わせる
        let near_corner = (3840 - 600 - 15, 2076 - 900 - 20);
        assert_eq!(
            snapped_position(near_corner, WINDOW, AREA, THRESHOLD, FREE),
            (3240, 1176)
        );
    }

    #[test]
    fn 隣にモニタが接している辺には吸着しない() {
        // 右隣にモニタがある場合、右端では吸着させない（画面をまたげなくなるため）
        let right_shared = [false, true, false, false];
        let near_right = (3840 - 600 - 15, 500);
        assert_eq!(
            snapped_position(near_right, WINDOW, AREA, THRESHOLD, right_shared),
            near_right
        );
        // 左端の吸着は妨げない
        assert_eq!(
            snapped_position((10, 500), WINDOW, AREA, THRESHOLD, right_shared),
            (0, 500)
        );
    }

    #[test]
    fn 原点がずれたモニタでも作業領域を基準にする() {
        // 2 枚目のモニタ（5376, 0 起点）
        let area = (5376, 0, 9216, 2160);
        assert_eq!(
            snapped_position((5390, 100), WINDOW, area, THRESHOLD, FREE),
            (5376, 100)
        );
        assert_eq!(
            snapped_position((9216 - 600 - 5, 100), WINDOW, area, THRESHOLD, FREE),
            (8616, 100)
        );
    }

    #[test]
    fn 隣のモニタに重なる位置では吸着を止める() {
        use super::{blocks_snap, Edge};
        // 3840x2160 の下に 1920x1080 がぶら下がっている実機と同じ配置
        let main = (0, 0, 3840, 2160);
        let below = (888, 2160, 2808, 3240);

        // 下のモニタの真上にいるなら、下端に吸着させると行き来できなくなる
        assert!(blocks_snap(main, below, (1000, 1200, 1630, 2140), Edge::Bottom));
        // 下のモニタから横に外れていれば、下端に吸着してよい
        assert!(!blocks_snap(main, below, (3000, 1200, 3630, 2140), Edge::Bottom));
        // 下側のモニタから見ると、上辺が接している
        assert!(blocks_snap(below, main, (1000, 2200, 1630, 3100), Edge::Top));
        // 左右は接していないので止めない
        assert!(!blocks_snap(below, main, (900, 2200, 1530, 3100), Edge::Left));
    }

    #[test]
    fn 上下がマイナス座標のモニタでも吸着する() {
        // メインより上に置かれたモニタ
        let area = (0, -2160, 3840, -84);
        assert_eq!(
            snapped_position((100, -2140), WINDOW, area, THRESHOLD, FREE),
            (100, -2160)
        );
    }
}
