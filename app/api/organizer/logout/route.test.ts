// @vitest-environment node
import { POST } from "./route";

describe("POST /api/organizer/logout", () => {
  it("expires the session cookie", async () => {
    const response = await POST();
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
