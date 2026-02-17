import { NextResponse } from "next/server";
import {
  createSessionToken,
  getAdminCookieName,
  verifyCredentials,
} from "@/lib/adminAuth";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { user, pass } = body || {};

    if (!verifyCredentials(user, pass)) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos" },
        { status: 401 },
      );
    }

    const token = createSessionToken();
    const res = NextResponse.json({ ok: true });

    res.cookies.set(getAdminCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return res;
  } catch (e) {
    return NextResponse.json({ error: "Erro no login" }, { status: 500 });
  }
}
