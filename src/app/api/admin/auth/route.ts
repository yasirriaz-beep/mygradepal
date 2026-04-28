import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORDS = [
  process.env.ADMIN_PASSWORD_1 ?? "mgp2025",
  process.env.ADMIN_PASSWORD_2 ?? "",
  process.env.ADMIN_PASSWORD_3 ?? "",
].filter(Boolean);

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password: string };

  if (!password || !ADMIN_PASSWORDS.includes(password)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  // Set httpOnly cookie valid for 8 hours
  response.cookies.set("admin_session", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("admin_session");
  return response;
}
