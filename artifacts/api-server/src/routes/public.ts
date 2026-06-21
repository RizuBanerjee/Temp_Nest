import { Router } from "express";
import { getDomains, createAccount, getToken, getMessages, generatePassword, generateUsername, extractOtp } from "../lib/mailtm";

const router = Router();

router.get("/temp-inbox", async (req, res) => {
  try {
    let domain = "mail.tm";
    try {
      const domains = await getDomains();
      if (domains.length > 0) domain = domains[0].domain;
    } catch (_) {}

    const username = generateUsername();
    const address = `${username}@${domain}`;
    const password = generatePassword();

    let accountId = `local_${Date.now()}`;
    let token: string | null = null;

    try {
      const account = await createAccount(address, password);
      accountId = account.id;
      token = await getToken(address, password);
    } catch (_) {}

    res.json({ id: accountId, address, token, password });
  } catch (err) {
    req.log.error({ err }, "Failed to create public temp inbox");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/temp-inbox/messages", async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) { res.status(400).json({ error: "Token required" }); return; }
    if (token.startsWith("local_")) { res.json([]); return; }

    const messages = await getMessages(token);
    res.json(messages.map(m => ({
      id: m.id,
      from: m.from.address,
      subject: m.subject || "(no subject)",
      preview: m.intro || m.text?.substring(0, 200) || "",
      hasOtp: !!extractOtp(m.text || m.intro || ""),
      otpCode: extractOtp(m.text || m.intro || "") || null,
      createdAt: m.createdAt,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get public temp inbox messages");
    res.json([]);
  }
});

export default router;
