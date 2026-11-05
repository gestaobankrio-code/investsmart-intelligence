import { describe, expect, it } from "vitest";
import { BASE_DEMO, UFS, demoForPeriod, normalizeAPIRow } from "@/lib/intelligence";
import { BRAZIL_STATES } from "@/data/brazil-map";

describe("intelligence rules", () => {
  it("covers all 27 UFs on the map and in demo data", () => {
    expect(UFS).toHaveLength(27);
    expect(new Set(BRAZIL_STATES.map((s) => s.uf))).toEqual(new Set(UFS));
    expect(new Set(BASE_DEMO.map((s) => s.uf)).size).toBe(27);
  });
  it("demo data is deterministic (no random numbers)", () => {
    expect(demoForPeriod(30)).toEqual(demoForPeriod(30));
    expect(BASE_DEMO.every((s) => s.source === "demo")).toBe(true);
  });
  it("rejects invalid backend rows and out-of-range metrics", () => {
    expect(normalizeAPIRow({ uf: "XX", term: "a", category: "b", periodDays: 30 })).toBeNull();
    const r = normalizeAPIRow({ uf: "sp", term: "CDB", category: "Renda Fixa", periodDays: 30, trendIndex: 150 });
    expect(r?.uf).toBe("SP");
    expect(r?.trendIndex).toBeNull();
  });
});
