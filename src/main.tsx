import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./styles.css";
import App from "./App";

const root = document.getElementById("root");

if (!root) throw new Error("#root 요소를 찾을 수 없습니다.");

ReactDOM.createRoot(root).render(<App />);
