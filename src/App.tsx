import { Routes, Route, BrowserRouter } from "react-router-dom";
import NewFolderPage from "./components/folder/NewFolderPage";
import MainManager from "./components/stickynote/MainManager";
import StickyNote from "./components/stickynote/StickyNote";
import StickyHomePage from "./components/stickynote/StickyHomePage";
import TrashManager from "./components/stickynote/TrashPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StickyHomePage />} />
        <Route path="/manager" element={<MainManager />} />
        <Route path="/note/:noteId" element={<StickyNote />} />
        <Route path="/trash" element={<TrashManager />} />
        <Route path="/folder/create" element={<NewFolderPage />} />
      </Routes>
    </BrowserRouter>
  );
}
