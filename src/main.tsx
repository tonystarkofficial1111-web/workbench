import "./core/runtime";
import "./styles";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MemLock } from "./components/MemLock";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <MemLock />
  </>,
);
