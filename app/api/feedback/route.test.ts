// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/app/lib/developer-email", () => ({
  emailDeveloper: vi.fn(),
  isDeveloperEmailConfigured: vi.fn(() => true),
}));

import { emailDeveloper, isDeveloperEmailConfigured } from "@/app/lib/developer-email";

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

afterEach(() => vi.clearAllMocks());

it("emails valid feedback to the developer", async () => {
  const response = await post({ rating: 4, note: "More mysteries, please.", useInProfile: true });
  expect(response.status).toBe(202);
  expect(emailDeveloper).toHaveBeenCalledWith({
    subject: "Marginalia feedback: 4/5",
    text: expect.stringContaining("More mysteries, please."),
  });
});

it("rejects missing ratings", async () => {
  expect((await post({ note: "Hello" })).status).toBe(400);
});

it("reports missing email configuration", async () => {
  vi.mocked(isDeveloperEmailConfigured).mockReturnValueOnce(false);
  expect((await post({ rating: 3 })).status).toBe(503);
});
