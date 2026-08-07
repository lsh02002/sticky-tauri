import { useEffect } from "react";
import { noteApi } from "../../api/noteApi";
import { useLocation } from "react-router-dom";

export default function StickyHomePage() {
  const location = useLocation();

  useEffect(() => {
    const openStickyNotes = async () => {
      try {
        const fromTrash = sessionStorage.getItem("fromTrash");
        
        if (fromTrash) {
          sessionStorage.removeItem("fromTrash");
          await noteApi.openManagerWindow();
          return;
        }

        let notes = await noteApi.listOpenNotes();
        const openedNotes = notes.filter((note) => note.open);

        if (openedNotes.length === 0) {
          noteApi.openManagerWindow();
        } else {
          await Promise.all(
            openedNotes.map((note) => noteApi.openNoteWindow(note.id)),
          );
        }
      } catch (error) {
        console.error(error);
        alert("포스트잇을 열지 못했습니다.");
      }
    };

    openStickyNotes();
  }, []);

  return (
    <div className="min-vh-100 bg-dark text-white d-flex align-items-center justify-content-center">
      포스트잇을 여는 중...
    </div>
  );
}
