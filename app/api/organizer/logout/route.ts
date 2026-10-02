export const runtime = "nodejs";

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    "gloaming_organizer=; Path=/api/organizer; Max-Age=0; HttpOnly; SameSite=Strict",
  );
  return response;
}
