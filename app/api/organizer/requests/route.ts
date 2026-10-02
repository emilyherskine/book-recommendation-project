import { NextRequest } from "next/server";
import { isOrganizerRequest } from "@/app/lib/organizer-auth";
import { listRequests, updateRequestStatus } from "@/app/lib/request-store";

export const runtime = "nodejs";

const unauthorized = () => Response.json({ error: "Sign in first." }, { status: 401 });

export async function GET(request: NextRequest) {
  if (!isOrganizerRequest(request)) return unauthorized();
  try {
    return Response.json(
      { requests: await listRequests() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Could not list blind-date requests", error);
    return Response.json({ error: "Could not load requests." }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isOrganizerRequest(request)) return unauthorized();
  try {
    const body = (await request.json()) as { requestId?: unknown; status?: unknown };
    if (
      typeof body.requestId !== "string" ||
      (body.status !== "new" && body.status !== "fulfilled")
    ) {
      return Response.json({ error: "Invalid update." }, { status: 400 });
    }
    const found = await updateRequestStatus(body.requestId, body.status);
    return found
      ? Response.json({ ok: true })
      : Response.json({ error: "Request not found." }, { status: 404 });
  } catch (error) {
    console.error("Could not update blind-date request", error);
    return Response.json({ error: "Could not update the request." }, { status: 502 });
  }
}
