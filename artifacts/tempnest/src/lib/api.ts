import { firebaseAuth } from "./firebase";

export const API_BASE = import.meta.env.VITE_API_URL || "";

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = await firebaseAuth.currentUser?.getIdToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(apiUrl(path), { ...init, credentials: "include", headers });
}
