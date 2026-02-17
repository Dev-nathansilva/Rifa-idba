import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqual(a, b) {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export function verifyCredentials(user, pass) {
  const envUser = process.env.ADMIN_USER || "";
  const envPass = process.env.ADMIN_PASSWORD || "";
  return user === envUser && pass === envPass;
}

export function createSessionToken() {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_TOKEN || "";
  if (!secret) throw new Error("ADMIN_SECRET (ou ADMIN_TOKEN) não configurado");

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payloadB64 = b64url(JSON.stringify({ exp }));
  const sig = sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_TOKEN || "";
  if (!secret || !token) return false;

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;

  const expected = sign(payloadB64, secret);
  if (!safeEqual(sig, expected)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    );
    const now = Math.floor(Date.now() / 1000);
    return payload?.exp && now <= payload.exp;
  } catch {
    return false;
  }
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}
