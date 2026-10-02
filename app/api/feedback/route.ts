import { NextRequest } from "next/server";
import { emailDeveloper, isDeveloperEmailConfigured } from "@/app/lib/developer-email";

export const runtime = "nodejs";

function text(value: unknown, max = 2_000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  if (!isDeveloperEmailConfigured()) {
    return Response.json(
      { error: "Feedback email is not configured yet. Please try again later." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Invalid request.");
    body = value as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Your feedback could not be read." }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "Choose a rating before sending feedback." }, { status: 400 });
  }

  const note = text(body.note);
  const useInProfile = body.useInProfile === true;
  try {
    await emailDeveloper({
      subject: `Marginalia feedback: ${rating}/5`,
      text: [
        "New reader feedback",
        "",
        `Rating: ${rating}/5`,
        `Keep in reader DNA: ${useInProfile ? "Yes" : "No"}`,
        "",
        "Note:",
        note || "(No note provided)",
      ].join("\n"),
    });
    return Response.json({ accepted: true }, { status: 202 });
  } catch (error) {
    console.error("Feedback email delivery failed", error);
    return Response.json(
      { error: "We couldn’t send your feedback. Please try again later." },
      { status: 502 },
    );
  }
}
