import { Fragment, StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import "./index.css";
const App = lazy(() => import("./App.jsx"));

const RootWrapper = import.meta.env.DEV ? StrictMode : Fragment;

createRoot(document.getElementById("root")).render(
  <RootWrapper>
    <Provider store={store}>
      <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
        <App />
      </Suspense>
    </Provider>
  </RootWrapper>
);
