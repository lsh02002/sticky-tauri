mod command;
mod domain;
mod error;
mod repository;
mod service;

use std::{
    fs,
    sync::{Mutex, MutexGuard},
};

use rusqlite::Connection;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WebviewUrl, WebviewWindowBuilder,
};

use crate::{error::AppError, repository::SqliteNoteRepository};

pub struct AppState {
    db: Mutex<Connection>,
}

impl AppState {
    pub fn connection(&self) -> Result<MutexGuard<'_, Connection>, String> {
        self.db.lock().map_err(|_| AppError::Lock.into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("app_data_dir 조회 실패: {e}"))?;

            fs::create_dir_all(&data_dir).map_err(|e| {
                format!("앱 데이터 디렉터리 생성 실패: {}: {e}", data_dir.display())
            })?;

            let db_path = data_dir.join("sticky-tauri.sqlite3");

            let connection = Connection::open(&db_path)
                .map_err(|e| format!("SQLite 연결 실패: {}: {e}", db_path.display()))?;

            SqliteNoteRepository::initialize(&connection)
                .map_err(|e| format!("SQLite 스키마 초기화 실패: {e}"))?;

            app.manage(AppState {
                db: Mutex::new(connection),
            });

            let manager =
                MenuItem::with_id(app, "manager", "메모 관리자 열기", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&manager, &quit])?;
            let icon = app.default_window_icon().unwrap().clone();

            TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "manager" => {
                        if let Some(win) = app.get_webview_window("manager") {
                            let _ = win.unminimize();
                            let _ = win.show();
                            let _ = win.set_focus();
                        } else {
                            let _ = WebviewWindowBuilder::new(
                                app,
                                "manager",
                                WebviewUrl::App("/manager".into()),
                            )
                            .title("메모 관리")
                            .inner_size(1000.0, 700.0)
                            .visible(true)
                            .build();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            command::create_folder,
            command::list_folders,
            command::set_folder,
            command::rename_folder,
            command::create_note,
            command::set_deleted_note,
            command::list_notes,
            command::list_open_notes,
            command::list_deleted_notes,
            command::search_notes,
            command::get_text_note,
            command::update_text_note,
            command::get_todo_note,
            command::add_todo_item,
            command::toggle_todo_item,
            command::delete_todo_item,
            command::get_expense_note,
            command::add_expense_item,
            command::delete_expense_item,
            command::update_note_color,
            command::delete_note,
            command::add_photo,
            command::list_photos,
            command::delete_photo,
            command::open_manager_window,
            command::open_note_window,
        ])
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
