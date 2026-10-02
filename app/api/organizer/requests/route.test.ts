// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, vi } from "vitest";
import { GET, PATCH } from "./route";
import { SESSION_COOKIE, createSessionToken } from "@/app/lib/organizer-auth";
import { listRequests, updateRequestStatus } from "@/app/lib/request-store";

vi.mock("@/app/lib/request-store", () => ({
  listRequests: vi.fn(async () => [{ requestId: "a" }]),
  updateRequestStatus: vi.fn(async () => true),
}));

beforeEach(() => vi.stubEnv("ORGANIZER_PASSWORD", "moonlight"));
afterEach(() => vi.unstubAllEnvs());

const request = (method: string, body?: unknown, signedIn = true) =>
  new NextRequest("http://localhost/api/organizer/requests", {
    method,
    headers: signedIn ? { cookie: `${SESSION_COOKIE}=${createSessionToken()}` } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

describe("/api/organizer/requests", () => {
  it("rejects anonymous visitors", async () => {
    expect((await GET(request("GET", undefined, false))).status).toBe(401);
    expect(
      (await PATCH(request("PATCH", { requestId: "a", status: "fulfilled" }, false))).status,
    ).toBe(401);
    expect(listRequests).not.toHaveBeenCalled();
  });

  it("lists requests for the organizer", async () => {
    const response = await GET(request("GET"));
    expect(await response.json()).toEqual({ requests: [{ requestId: "a" }] });
  });

  it("updates status and validates input", async () => {
    expect((await PATCH(request("PATCH", { requestId: "a", status: "fulfilled" }))).status).toBe(
      200,
    );
    expect(updateRequestStatus).toHaveBeenCalledWith("a", "fulfilled");
    expect((await PATCH(request("PATCH", { requestId: "a", status: "bogus" }))).status).toBe(400);
  });
});
