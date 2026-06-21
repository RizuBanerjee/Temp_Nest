// Mail.tm API integration
const MAILTM_BASE = "https://api.mail.tm";

export interface MailtmDomain {
  id: string;
  domain: string;
  isActive: boolean;
}

export interface MailtmAccount {
  id: string;
  address: string;
  token?: string;
}

export interface MailtmMessage {
  id: string;
  from: { address: string; name: string };
  to: Array<{ address: string; name: string }>;
  subject: string;
  intro: string;
  text?: string;
  html?: string[];
  isRead: boolean;
  createdAt: string;
}

export async function getDomains(): Promise<MailtmDomain[]> {
  const res = await fetch(`${MAILTM_BASE}/domains?page=1`);
  if (!res.ok) throw new Error("Failed to fetch domains");
  const data = await res.json() as { "hydra:member": MailtmDomain[] };
  return data["hydra:member"] || [];
}

export async function createAccount(address: string, password: string): Promise<MailtmAccount> {
  const res = await fetch(`${MAILTM_BASE}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create account: ${err}`);
  }
  return await res.json() as MailtmAccount;
}

export async function getToken(address: string, password: string): Promise<string> {
  const res = await fetch(`${MAILTM_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password }),
  });
  if (!res.ok) throw new Error("Failed to get token");
  const data = await res.json() as { token: string };
  return data.token;
}

export async function deleteAccount(accountId: string, token: string): Promise<void> {
  await fetch(`${MAILTM_BASE}/accounts/${accountId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMessages(token: string, page = 1): Promise<MailtmMessage[]> {
  const res = await fetch(`${MAILTM_BASE}/messages?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json() as { "hydra:member": MailtmMessage[] };
  return data["hydra:member"] || [];
}

export async function getMessage(token: string, messageId: string): Promise<MailtmMessage | null> {
  const res = await fetch(`${MAILTM_BASE}/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return await res.json() as MailtmMessage;
}

export function extractOtp(text: string): string | null {
  // Match 4-8 digit OTPs with common surrounding patterns
  const patterns = [
    /\b(\d{6})\b(?!\d)/g,  // 6-digit (most common)
    /\b(\d{4})\b(?!\d)/g,  // 4-digit
    /\b(\d{8})\b(?!\d)/g,  // 8-digit
    /\b(\d{5})\b(?!\d)/g,  // 5-digit
  ];
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    // Find first match that looks like an OTP context
    for (const match of matches) {
      const code = match[1];
      const idx = match.index ?? 0;
      const context = text.substring(Math.max(0, idx - 40), idx + code.length + 40).toLowerCase();
      if (context.match(/otp|code|verify|verif|confirm|pin|password|token|auth/)) {
        return code;
      }
    }
    // Fallback: return first match if no context found
    if (matches.length > 0) return matches[0][1];
  }
  return null;
}

export function generatePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function generateUsername(customName?: string | null): string {
  if (customName) return customName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const adj = ["swift", "silent", "secure", "temp", "ghost", "phantom", "stealth", "anon"];
  const noun = ["inbox", "mail", "box", "drop", "relay", "vault", "nest"];
  const num = Math.floor(Math.random() * 9999);
  return `${adj[Math.floor(Math.random() * adj.length)]}${noun[Math.floor(Math.random() * noun.length)]}${num}`;
}
