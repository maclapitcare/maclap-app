import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Handle SPA routing redirect from 404.html
const urlParams = new URLSearchParams(window.location.search);
const redirect = urlParams.get('redirect');
if (redirect) {
  // Remove the redirect parameter and navigate to the intended route
  const targetUrl = decodeURIComponent(redirect);
  window.history.replaceState(null, '', targetUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
