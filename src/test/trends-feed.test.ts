import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFeed, fmtPts, isStale, parseFeed, POLL_MS } from "@/lib/trends-feed";

const base = (registros: unknown[]) => ({ status: "ok", semanaInicio: "2026-10-25", semanaFim: "2026-10-31", origemExtracao: "fixture_csv", registros });
const rec = (o: object) => ({ fonte: "Em ascensao", termo: "selic", uf: "SP", semana: "2026-10-25", dataFonte: "2026-10-30", indiceAnterior: 40, indiceAtual: 55, ...o });

describe("trends feed rules", () => {
  it("variation is in index points, not percent", () => {
    const f = parseFeed(base([rec({})]), {});
    expect(f.records[0]?.deltaPts).toBe(15);
    expect(fmtPts(15)).toBe("+15 pts");
  });
  it("null previous index means 'Sem comparação'", () => {
    const f = parseFeed(base([rec({ indiceAnterior: null })]), {});
    expect(f.records[0]?.deltaPts).toBeNull();
    expect(fmtPts(f.records[0]?.deltaPts ?? null)).toBe("Sem comparação");
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
  it("bigquery_live is real even if status.json says fixture", () => {
    const feed = parseFeed({ ...base([rec({})]), origemExtracao: "bigquery_live" }, { origemExtracao: "fixture_csv" });
    expect(feed.isStaticSample).toBe(false);
    expect(feed.extraction).toBe("bigquery_live");
  });
  it("status.json cannot relabel a static trends extraction as live", () => {
    expect(parseFeed(base([rec({})]), { origemExtracao: "bigquery_live" }).isStaticSample).toBe(true);
  });
  it("preserves the reference week and original source date", () => {
    const feed = parseFeed({ ...base([rec({})]), origemExtracao: "bigquery_live" }, { ultimaVerificacao: "2026-11-05T20:20:39.600Z" });
    expect(feed.weekStart).toBe("2026-10-25");
    expect(feed.weekEnd).toBe("2026-10-31");
    expect(feed.sourceDate).toBe("2026-10-30");
  });
  it("rejects a feed whose status is not ok", () => {
    expect(() => parseFeed({ status: "error", registros: [] }, {})).toThrow();
  });
});

describe("public feed revalidation", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("revalidates every 30 minutes", () => expect(POLL_MS).toBe(1800000));
  it("uses no-store and a new shared identifier for each two-file read", async () => {
    const urls: URL[] = [];
    const options: RequestInit[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: URL, init: RequestInit) => {
      urls.push(url); options.push(init);
      return { ok: true, json: async () => url.pathname.endsWith("trends.json") ? { ...base([rec({})]), origemExtracao: "bigquery_live" } : {} };
    }));
    await fetchFeed(); await fetchFeed();
    expect(urls).toHaveLength(4);
    expect(options.every((option) => option.cache === "no-store")).toBe(true);
    const identifiers = urls.map((url) => url.searchParams.get("revalidate"));
    expect(identifiers[0]).toBeTruthy();
    expect(identifiers[0]).toBe(identifiers[1]);
    expect(identifiers[2]).toBe(identifiers[3]);
    expect(identifiers[0]).not.toBe(identifiers[2]);
  });
  it("rejects failed reads instead of returning fictional records", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })));
    await expect(fetchFeed()).rejects.toThrow("HTTP 503");
  });
});
