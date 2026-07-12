import { createRoot } from "react-dom/client";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import { firebaseAuth } from "./lib/firebase";

setBaseUrl(import.meta.env.VITE_API_URL);
setAuthTokenGetter(async () => {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return user.getIdToken();
});

createRoot(document.getElementById("root")!).render(<App />);
