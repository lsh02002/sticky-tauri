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

use service::NoteService;

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
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(
            tauri_plugin_single_instance::init(|app, _args, _cwd| {
                let has_note_window = app
                    .webview_windows()
                    .keys()
                    .any(|label| label.starts_with("note-"));

                // 노트 윈도우가 하나라도 있으면 아무것도 안 함
                if has_note_window {
                    return;
                }

                // 노트 윈도우가 하나도 없을 때만 manager 표시
                if let Some(window) = app.get_webview_window("manager") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                } else {
                    match WebviewWindowBuilder::new(
                        app,
                        "manager",
                        WebviewUrl::App("/manager".into()),
                    )
                    .title("메모 관리")
                    .inner_size(1000.0, 700.0)
                    .visible(true)
                    .build()
                    {
                        Ok(window) => {
                            let _ = window.set_focus();
                        }

                        Err(error) => {
                            eprintln!("메모 관리자 창 생성 실패: {}", error);
                        }
                    }
                }
            }),
        );
    }

    builder
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

            let icon = app
                .default_window_icon()
                .expect("기본 앱 아이콘이 없습니다.")
                .clone();

            // 혹시 같은 프로세스 안에서 setup 로직이 다시 호출되더라도
            // tray 중복 생성을 방지
            if app.tray_by_id("main-tray").is_none() {
                TrayIconBuilder::with_id("main-tray")
                    .icon(icon)
                    .menu(&menu)
                    .show_menu_on_left_click(true)
                    .on_menu_event(|app, event| {
                        match event.id().as_ref() {
                            "manager" => {
                                if let Some(win) = app.get_webview_window("manager") {
                                    let _ = win.unminimize();
                                    let _ = win.show();
                                    let _ = win.set_focus();
                                } else {
                                    if let Err(error) = WebviewWindowBuilder::new(
                                        app,
                                        "manager",
                                        WebviewUrl::App("/manager".into()),
                                    )
                                    .title("메모 관리")
                                    .inner_size(1000.0, 700.0)
                                    .visible(true)
                                    .build()
                                    {
                                        eprintln!("메모 관리자 창 생성 실패: {}", error);
                                    }
                                }
                            }
                            "quit" => {
                                let state = app.state::<AppState>();

                                if let Ok(connection) = state.connection() {
                                    for (label, window) in app.webview_windows() {
                                        // manager 창은 메모 위치 저장 대상 아님
                                        if label == "manager" {
                                            continue;
                                        }

                                        let Some(note_id) = label
                                            .strip_prefix("note-")
                                            .and_then(|id| id.parse::<i64>().ok())
                                        else {
                                            continue;
                                        };

                                        let Ok(position) = window.outer_position() else {
                                            continue;
                                        };

                                        let Ok(size) = window.outer_size() else {
                                            continue;
                                        };

                                        let x = position.x as f64;
                                        let y = position.y as f64;

                                        if let Err(error) = NoteService::update_note_position_size(
                                            &connection,
                                            note_id,
                                            x,
                                            y,
                                            size.width as f64,
                                            size.height as f64,
                                        ) {
                                            eprintln!(
                                                "메모 위치 저장 실패 \
                                                 (note_id={}): {}",
                                                note_id, error
                                            );
                                        }
                                    }
                                }

                                app.exit(0);
                            }

                            _ => {}
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            command::create_folder,
            command::list_folders,
            command::set_folder,
            command::rename_folder,
            command::create_note,
            command::set_deleted_note,
            command::update_note_position_size,
            command::update_note_title,
            command::update_note_color,
            command::delete_note,
            command::list_notes,
            command::list_open_notes,
            command::list_deleted_notes,
            command::search_notes,
            command::get_text_note,
            command::update_text_note,
            command::get_rich_text_note,
            command::update_rich_text_note,
            command::get_todo_note,
            command::add_todo_item,
            command::toggle_todo_item,
            command::delete_todo_item,
            command::get_expense_note,
            command::add_expense_item,
            command::delete_expense_item,
            command::add_photo,
            command::add_rich_text_with_photos,
            command::list_photos,
            command::delete_photo,
            command::delete_rich_text_photo,
            command::open_manager_window,
            command::open_note_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
