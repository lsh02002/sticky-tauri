use crate::{service::NoteService, AppState};
use tauri::webview::Color;
use tauri::{
    AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

#[tauri::command]
pub async fn open_manager_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("manager") {
        window.unminimize().map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "manager", WebviewUrl::App("/manager".into()))
        .title("메모 관리")
        .inner_size(1000.0, 700.0)
        .resizable(true)
        .decorations(true)
        .background_color(Color(33, 37, 41, 255))
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn open_note_window(
    app: AppHandle,
    state: State<'_, AppState>,
    note_id: i64,
) -> Result<(), String> {
    let label = format!("note-{}", note_id);

    // 같은 메모 창이 이미 열려 있다면 새로 만들지 않음
    if let Some(window) = app.get_webview_window(&label) {
        window.unminimize().map_err(|error| error.to_string())?;
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;

        return Ok(());
    }

    let note = {
        let connection = state.connection()?;

        NoteService::set_open(&connection, note_id, true).map_err(String::from)?;

        NoteService::find(&connection, note_id).map_err(String::from)?
    };

    // 쿼리스트링 없이 실제 index.html만 로드
    let url = WebviewUrl::App(format!("/note/{}", note.id).into());

    let window = WebviewWindowBuilder::new(&app, &label, url)
        .title(note.title)
        .position(note.x, note.y)
        .inner_size(note.width, note.height)
        .min_inner_size(340.0, 360.0)
        .resizable(true)
        .decorations(false)
        .visible(true)
        .skip_taskbar(true)
        .always_on_top(true)
        .build()
        .map_err(|error| error.to_string())?;

    let app_handle = app.clone();
    let event_note_id = note.id;
    let event_window = window.clone();

    window.on_window_event(move |event| match event {
        WindowEvent::CloseRequested { .. } => {
            let state = app_handle.state::<AppState>();

            match state.connection() {
                Ok(connection) => {
                    if let Ok(position) = event_window.outer_position() {
                        let x = position.x as f64;
                        let y = position.y as f64;

                        if let Err(error) = NoteService::update_note_position_size(
                            &connection,
                            event_note_id,
                            x,
                            y,
                            event_window.outer_size().unwrap().width as f64,
                            event_window.outer_size().unwrap().height as f64,
                        ) {
                            eprintln!("메모 위치 저장 실패 (note_id={}): {}", event_note_id, error);
                        }
                    }
                }

                Err(error) => {
                    eprintln!("DB 연결 실패 (note_id={}): {}", event_note_id, error);
                }
            };
        }

        WindowEvent::Destroyed => {
            let state = app_handle.state::<AppState>();

            match state.connection() {
                Ok(connection) => {
                    if let Err(error) = NoteService::set_open(&connection, event_note_id, false) {
                        eprintln!(
                            "메모 open 상태 변경 실패 (note_id={}): {}",
                            event_note_id, error
                        );
                    }
                }

                Err(error) => {
                    eprintln!("DB 연결 실패 (note_id={}): {}", event_note_id, error);
                }
            };
        }

        _ => {}
    });

    Ok(())
}
