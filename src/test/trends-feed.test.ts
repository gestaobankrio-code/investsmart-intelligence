import { describe, expect, it } from "vitest";
import { fmtPts, isStale, parseFeed } from "@/lib/trends-feed";

const base = (registros: unknown[]) => ({ status: "ok", semanaInicio: "2026-10-25", semanaFim: "2026-10-31", origemExtracao: "fixture_csv", registros });
const rec = (o: object) => ({ fonte: "Em ascensao", termo: "selic", uf: "SP", semana: "2026-10-25", dataFonte: "2026-10-30", indiceAnterior: 40, indiceAtual: 55, ...o });

describe("trends feed rules", () => {
  it("variation is in index points, not percent", () => {
    const f = parseFeed(base([rec({})]), {});
    expect(f.records[0]!.deltaPts).toBe(15);
    expect(fmtPts(15)).toBe("+15 pts");
  });
  it("null previous index means 'Sem comparação'", () => {
    const f = parseFeed(base([rec({ indiceAnterior: null })]), {});
    expect(f.records[0]!.deltaPts).toBeNull();
    expect(fmtPts(f.records[0]!.deltaPts)).toBe("Sem comparação");
  });
  it("missing UF is absent (no data), never zero", () => {
    const f = parseFeed(base([rec({}), rec({ uf: "XX" })]), {});
    expect(f.records.map((r) => r.uf)).toEqual(["SP"]);
  });
  it("data older than 14 days is stale", () => {
    const f = parseFeed(base([rec({})]), {});
    expect(isStale(f, new Date("2026-11-13T00:00:00Z"))).toBe(false);
    expect(isStale(f, new Date("2026-11-14T00:00:01Z"))).toBe(true);
  });
  it("fixture extraction is flagged as static sample", () => {
    expect(parseFeed(base([rec({})]), {}).isStaticSample).toBe(true);
  });
  it("rejects a feed whose status is not ok", () => {
    expect(() => parseFeed({ status: "error", registros: [] }, {})).toThrow();
  });
});
