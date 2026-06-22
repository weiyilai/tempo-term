use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem};
use tauri::window::Color;
use tauri::{App, AppHandle, Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};

const NEW_WINDOW_ID: &str = "new-window";

/// Build the menu (Tauri's default plus a New Window item injected into File),
/// set it as the app menu, and wire the menu-event handler.
pub fn init(app: &mut App) -> tauri::Result<()> {
    // Owned handle so the menu-building borrows do not tangle with the later
    // app.set_menu / app.on_menu_event calls.
    let handle = app.handle().clone();
    let menu = Menu::default(&handle)?;
    let new_window = MenuItem::with_id(
        &handle,
        NEW_WINDOW_ID,
        "New Window",
        true,
        Some("CmdOrCtrl+N"),
    )?;
    for item in menu.items()? {
        if let MenuItemKind::Submenu(submenu) = item {
            if submenu.text()? == "File" {
                submenu.insert(&new_window, 0)?;
                submenu.insert(&PredefinedMenuItem::separator(&handle)?, 1)?;
                break;
            }
        }
    }
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        if event.id() == NEW_WINDOW_ID {
            let _ = create_new_window(app);
        }
    });
    Ok(())
}

/// Open a new window mirroring the main window's configuration. Each new window
/// loads the same frontend; the frontend gives it a fresh, isolated state.
pub fn create_new_window(app: &AppHandle) -> tauri::Result<()> {
    let label = next_window_label(app);
    WebviewWindowBuilder::new(app, &label, WebviewUrl::default())
        .title("TempoTerm")
        .inner_size(1200.0, 800.0)
        .min_inner_size(720.0, 480.0)
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true)
        .background_color(Color(34, 34, 34, 255))
        .build()?;
    Ok(())
}

/// First `win-{n}` label not currently in use, so freed labels get reused and
/// the set stays small.
fn next_window_label(app: &AppHandle) -> String {
    let existing = app.webview_windows();
    let mut i = 1;
    loop {
        let label = format!("win-{i}");
        if !existing.contains_key(&label) {
            return label;
        }
        i += 1;
    }
}
