import { firebaseAuth } from "./firebase";

export const API_BASE = import.meta.env.VITE_API_URL || "";

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

import { setSuspended } from "./suspended-state";

export async function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = await firebaseAuth.currentUser?.getIdToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers,
  });
  if (response.status === 403) {
    try {
      const data = await response.clone().json();
      if (data?.code === "ACCOUNT_SUSPENDED") {
        setSuspended(true);
      }
    } catch {
      // ignore parse error
    }
  }
  return response;
}
