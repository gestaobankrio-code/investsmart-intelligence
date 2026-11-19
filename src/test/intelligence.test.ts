import { describe, expect, it } from "vitest";
import * as intelligence from "@/lib/intelligence";
import { UFS, normalizeAPIRow } from "@/lib/intelligence";
import { BRAZIL_STATES } from "@/data/brazil-map";

describe("intelligence rules", () => {
  it("covers all 27 UFs with geographic boundaries only", () => {
    expect(UFS).toHaveLength(27);
    expect(new Set(BRAZIL_STATES.map((s) => s.uf))).toEqual(new Set(UFS));
  });
  it("exposes no demonstration datasets to application imports", () => {
    expect("BASE_DEMO" in intelligence).toBe(false);
    expect("demoForPeriod" in intelligence).toBe(false);
  });
  it("rejects invalid backend rows and out-of-range metrics", () => {
    expect(normalizeAPIRow({ uf: "XX", term: "a", category: "b", periodDays: 30 })).toBeNull();
    const r = normalizeAPIRow({
      uf: "sp",
      term: "CDB",
      category: "Renda Fixa",
      periodDays: 30,
      trendIndex: 150,
    });
    expect(r?.uf).toBe("SP");
    expect(r?.trendIndex).toBeNull();
  });
});
