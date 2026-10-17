import React from "react";
import ReactDOM from "react-dom/client";
// Los estilos globales van ANTES que App para que los .css de cada feature puedan sobrescribirlos.
import "./styles/index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
