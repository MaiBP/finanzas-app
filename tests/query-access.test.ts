import { describe, expect, it } from "vitest";
import { accessibleFinanceFilter } from "@/services/query-service";

describe("bot finance access", () => {
  it("includes shared transactions and only the requesting user's personal transactions", () => {
    expect(accessibleFinanceFilter("user-123")).toBe("scope.eq.shared,and(scope.eq.personal,created_by.eq.user-123)");
  });
});
