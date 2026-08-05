import { describe, expect, it } from "vitest";
import { groupCategoryChartData } from "@/lib/finance/category-chart";
import { calculateMemberSummary } from "@/lib/finance/member-summary";

describe("summary visual totals", () => {
  it("groups small categories without losing money", () => {
    const input = Array.from({ length: 9 }, (_, index) => ({
      name: `C${index}`,
      value: (9 - index) * 100,
    }));
    const result = groupCategoryChartData(input, 7);
    expect(result).toHaveLength(7);
    expect(result.at(-1)?.name).toBe("Resto");
    expect(result.reduce((sum, item) => sum + item.value, 0)).toBe(
      input.reduce((sum, item) => sum + item.value, 0),
    );
  });

  it("totals income and expenses for each creator", () => {
    const result = calculateMemberSummary([
      { created_by: "a", type: "expense", amount_cents: 1200 },
      { created_by: "a", type: "income", amount_cents: 3000 },
      { created_by: "b", type: "expense", amount_cents: 500 },
    ]);
    expect(result.get("a")).toEqual({ expenses: 1200, income: 3000 });
    expect(result.get("b")).toEqual({ expenses: 500, income: 0 });
  });
});
